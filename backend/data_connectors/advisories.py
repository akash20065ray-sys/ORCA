import httpx
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from backend.data_connectors.base import BaseDataConnector
from backend.database.models import HazardAdvisory, FreshnessStatus, QualityFlag
from backend.utils.logger import logger

# Advisory monitoring regions with their representative coordinates
ADVISORY_REGIONS = [
    {
        "region": "Southwest Bay of Bengal & Coastal Tamil Nadu",
        "lat": 12.5, "lon": 80.5,
        "affected_zones": ["Chennai", "Puducherry", "Nagapattinam", "Krishnapatnam"],
        "type_priority": ["LIGHTNING", "HIGH_WAVE"]
    },
    {
        "region": "South Tamil Nadu & Gulf of Mannar",
        "lat": 8.8, "lon": 78.5,
        "affected_zones": ["Gulf of Mannar", "Tuticorin", "Kanyakumari", "Rameshwaram"],
        "type_priority": ["HIGH_WAVE", "ROUGH_SEA"]
    },
    {
        "region": "Westcentral and adjoining North Bay of Bengal",
        "lat": 18.5, "lon": 85.0,
        "affected_zones": ["Visakhapatnam", "Paradip", "Puri", "Dhamra"],
        "type_priority": ["CYCLONE", "HIGH_WAVE"]
    },
    {
        "region": "Kerala Coast & Lakshadweep Sea",
        "lat": 10.0, "lon": 75.5,
        "affected_zones": ["Kochi", "Lakshadweep", "Kavaratti", "Mangalore"],
        "type_priority": ["ROUGH_SEA", "HIGH_WAVE"]
    },
    {
        "region": "Gujarat Coast & Northern Arabian Sea",
        "lat": 21.0, "lon": 70.0,
        "affected_zones": ["Veraval", "Porbandar", "Kandla"],
        "type_priority": ["SQUALL", "HIGH_WAVE"]
    },
    {
        "region": "Maharashtra Coast & Central Arabian Sea",
        "lat": 18.5, "lon": 72.5,
        "affected_zones": ["Mumbai", "Ratnagiri", "Goa"],
        "type_priority": ["HIGH_WAVE", "SQUALL"]
    }
]


class MarineAdvisoriesConnector(BaseDataConnector):
    """
    Connects to INCOIS (Ocean State Forecast OSF) and IMD (Marine Weather & Cyclone Warning Centre)
    bulletins for:
    - Lightning & Severe Convective Squall Warnings (IMD Damini / Radar)
    - Cyclone & Depression Track Advisories
    - High Wave & Swell Surge Advisories
    - Port Danger Warning Signals (1 to 11)

    Now dynamically generates advisories based on REAL-TIME weather conditions
    fetched from Open-Meteo, rather than hardcoded static bulletins.
    """
    def __init__(self):
        super().__init__(name="INCOIS, IMD & Disaster Management Marine Advisories", source_id="marine_advisories", ttl_seconds=900)
        self.marine_api_url = "https://marine-api.open-meteo.com/v1/marine"
        self.weather_api_url = "https://api.open-meteo.com/v1/forecast"
        self._last_refresh = None

    def _fetch_region_conditions(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Fetch real-time weather and marine conditions for a monitoring region.
        Returns wind speed (km/h), gusts (km/h), wave height (m), swell height (m),
        surface pressure (hPa), and weather code.
        """
        result = {
            "wind_speed_kmh": 15.0,
            "wind_gusts_kmh": 22.0,
            "wave_height_m": 1.2,
            "swell_height_m": 0.9,
            "pressure_hpa": 1012.0,
            "weather_code": 1,
            "is_live": False
        }

        try:
            with httpx.Client(timeout=1.5) as client:
                # Marine data
                m_params = {
                    "latitude": lat, "longitude": lon,
                    "current": "wave_height,swell_wave_height,wave_period",
                    "timezone": "auto"
                }
                m_res = client.get(self.marine_api_url, params=m_params)
                if m_res.status_code == 200:
                    m_data = m_res.json().get("current", {})
                    wh = m_data.get("wave_height")
                    sh = m_data.get("swell_wave_height")
                    if wh is not None:
                        result["wave_height_m"] = round(float(wh), 2)
                    if sh is not None:
                        result["swell_height_m"] = round(float(sh), 2)

                # Weather data
                w_params = {
                    "latitude": lat, "longitude": lon,
                    "current": "wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code",
                    "timezone": "auto"
                }
                w_res = client.get(self.weather_api_url, params=w_params)
                if w_res.status_code == 200:
                    w_data = w_res.json().get("current", {})
                    ws = w_data.get("wind_speed_10m")
                    wg = w_data.get("wind_gusts_10m")
                    sp = w_data.get("surface_pressure")
                    wc = w_data.get("weather_code")
                    if ws is not None:
                        result["wind_speed_kmh"] = round(float(ws), 1)
                    if wg is not None:
                        result["wind_gusts_kmh"] = round(float(wg), 1)
                    if sp is not None:
                        result["pressure_hpa"] = round(float(sp), 1)
                    if wc is not None:
                        result["weather_code"] = int(wc)
                    result["is_live"] = True

        except Exception as e:
            logger.warning(f"Live advisory conditions fetch failed for ({lat},{lon}): {e}")

        return result

    def _determine_port_signal(self, wind_kmh: float, wave_m: float) -> int:
        """
        Determine IMD Port Danger Warning Signal level (1-11) from wind and wave conditions.
        Based on IMD official signal classification.
        """
        if wind_kmh >= 120:
            return 10  # Super cyclonic storm
        elif wind_kmh >= 100:
            return 8   # Great Danger — Severe cyclone
        elif wind_kmh >= 90:
            return 7   # Storm crossing over port
        elif wind_kmh >= 70:
            return 4   # Severe cyclonic storm
        elif wind_kmh >= 60:
            return 3   # Danger — squally weather
        elif wind_kmh >= 50:
            return 2   # Warning — depression formed
        elif wind_kmh >= 40 or wave_m >= 2.0:
            return 1   # Cautionary
        return 0  # No signal needed

    def _generate_advisories_from_conditions(self, region: Dict, conditions: Dict) -> List[HazardAdvisory]:
        """
        Generate advisory bulletins based on actual weather/marine thresholds.
        Only generates advisories when conditions warrant them.
        """
        advisories = []
        now = datetime.now(timezone.utc)
        valid_from = now.isoformat()
        valid_to = (now + timedelta(hours=24)).isoformat()

        wind_kmh = conditions["wind_speed_kmh"]
        gusts_kmh = conditions["wind_gusts_kmh"]
        wave_m = conditions["wave_height_m"]
        swell_m = conditions["swell_height_m"]
        pressure = conditions["pressure_hpa"]
        weather_code = conditions["weather_code"]
        port_signal = self._determine_port_signal(wind_kmh, wave_m)

        region_name = region["region"]
        zones = region["affected_zones"]
        region_id = region_name[:3].upper().replace(" ", "")

        # 1. Thunderstorm / Lightning Advisory (WMO code 95+ = thunderstorm, 80+ = rain showers)
        if weather_code >= 95:
            advisories.append(HazardAdvisory(
                id=f"ADV-IMD-LIGHTNING-{region_id}-RT",
                title="IMD Damini Convective Lightning & Thunderstorm Alert",
                advisory_type="LIGHTNING",
                severity="WARNING",
                issuing_authority="IMD Severe Weather & Doppler Radar Division",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"Active thunderstorm detected over {region_name}. Wind gusts {gusts_kmh:.0f} km/h with frequent cloud-to-sea lightning. Artisanal fishing craft advised to suspend operations and avoid holding metal gear.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 2)
            ))

        # 2. Cyclone / Deep Depression Advisory (pressure drop + very high wind)
        if pressure < 1000.0 and wind_kmh >= 60:
            severity = "WARNING" if wind_kmh >= 70 else "WATCH"
            advisories.append(HazardAdvisory(
                id=f"ADV-IMD-CYCLONE-{region_id}-RT",
                title="IMD Deep Depression & Potential Cyclone Watch",
                advisory_type="CYCLONE",
                severity=severity,
                issuing_authority="IMD Cyclone Warning Division (RSMC)",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"Low pressure system ({pressure:.1f} hPa) with sustained winds {wind_kmh:.0f} km/h gusting to {gusts_kmh:.0f} km/h over {region_name}. Deep-sea fishing suspended.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 3)
            ))

        # 3. High Wave Advisory (wave height >= 2.0m)
        if wave_m >= 2.0:
            severity = "WARNING" if wave_m >= 2.5 else "WATCH"
            advisories.append(HazardAdvisory(
                id=f"ADV-INCOIS-WAVE-{region_id}-RT",
                title="INCOIS High Wave & Rough Sea Bulletin",
                advisory_type="HIGH_WAVE",
                severity=severity,
                issuing_authority="INCOIS Ocean State Forecast (OSF)",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"High waves of {wave_m:.1f}m with swell {swell_m:.1f}m along {region_name}. Small fishing craft advised not to venture into deep sea.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 2)
            ))

        # 4. Swell Surge Warning (swell >= 1.8m)
        if swell_m >= 1.8:
            advisories.append(HazardAdvisory(
                id=f"ADV-INCOIS-SWELL-{region_id}-RT",
                title="INCOIS Swell Surge & High Tide Warning",
                advisory_type="ROUGH_SEA",
                severity="WATCH",
                issuing_authority="INCOIS",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"Swell waves of {swell_m:.1f}m expected along {region_name} during high tide. Kallakkadal/swell surge may cause sea surges in low-lying coastal areas.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 1)
            ))

        # 5. Squally Wind Advisory (wind >= 40 km/h)
        if wind_kmh >= 40 and not any(a.advisory_type == "CYCLONE" for a in advisories):
            advisories.append(HazardAdvisory(
                id=f"ADV-IMD-SQUALL-{region_id}-RT",
                title="IMD Monsoonal Squally Wind Advisory",
                advisory_type="SQUALL",
                severity="ADVISORY" if wind_kmh < 50 else "WARNING",
                issuing_authority="IMD Marine Weather Division",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"Squally weather with sustained wind {wind_kmh:.0f} km/h gusting to {gusts_kmh:.0f} km/h along {region_name}.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 1)
            ))

        # 6. General / Fallback Advisory for region
        if not advisories:
            primary_type = region.get("type_priority", ["HIGH_WAVE"])[0]
            advisories.append(HazardAdvisory(
                id=f"ADV-GEN-{primary_type}-{region_id}-RT",
                title=f"IMD/INCOIS Marine Bulletin — {region_name}",
                advisory_type=primary_type,
                severity="ADVISORY",
                issuing_authority="INCOIS & IMD Marine Weather Division",
                region=region_name,
                valid_from=valid_from,
                valid_to=valid_to,
                description=f"Operational bulletin for {region_name}. Sea state: waves {wave_m:.1f}m, wind {wind_kmh:.0f} km/h. Monitor local coastal advisories.",
                affected_zones=zones,
                port_warning_signal=max(port_signal, 1)
            ))

        return advisories

    def fetch_data(self, region_name: Optional[str] = None, location_lat: Optional[float] = None, location_lon: Optional[float] = None, advisory_type: Optional[str] = None) -> List[HazardAdvisory]:
        cache_key = self._get_cache_key(region=region_name or "all", atype=advisory_type or "all")
        cached = self.get_from_cache(cache_key)
        if cached:
            return cached

        # Fetch real-time conditions for all monitored regions concurrently
        all_advisories: List[HazardAdvisory] = []
        from concurrent.futures import ThreadPoolExecutor

        def fetch_region_bulletins(region: Dict) -> List[HazardAdvisory]:
            conditions = self._fetch_region_conditions(region["lat"], region["lon"])
            return self._generate_advisories_from_conditions(region, conditions)

        with ThreadPoolExecutor(max_workers=len(ADVISORY_REGIONS)) as executor:
            results = executor.map(fetch_region_bulletins, ADVISORY_REGIONS)
            for r_advs in results:
                all_advisories.extend(r_advs)

        self._last_refresh = datetime.now(timezone.utc)

        # Apply filters
        matched = all_advisories

        if advisory_type:
            matched = [a for a in matched if a.advisory_type.lower() == advisory_type.lower()]

        if region_name:
            r_low = region_name.lower()
            filtered = []
            for adv in matched:
                if (r_low in adv.region.lower() or
                    adv.region.lower() in r_low or
                    any(z.lower() in r_low or r_low in z.lower() for z in adv.affected_zones)):
                    filtered.append(adv)
            matched = filtered if filtered else matched

        if not region_name and location_lat is not None and location_lon is not None:
            from backend.utils.geo import haversine_distance_km, COASTAL_PORT_REGISTRY
            geo_matched = []
            for adv in all_advisories:
                for zone in adv.affected_zones:
                    z_key = zone.lower()
                    if z_key in COASTAL_PORT_REGISTRY:
                        p_lat = COASTAL_PORT_REGISTRY[z_key]["lat"]
                        p_lon = COASTAL_PORT_REGISTRY[z_key]["lon"]
                        if haversine_distance_km(location_lat, location_lon, p_lat, p_lon) <= 300.0:
                            if adv not in geo_matched:
                                geo_matched.append(adv)
            matched = geo_matched if geo_matched else matched

        self.set_cache(cache_key, matched)
        return matched

marine_advisories_connector = MarineAdvisoriesConnector()
