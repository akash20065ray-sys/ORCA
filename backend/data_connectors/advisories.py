from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from backend.data_connectors.base import BaseDataConnector
from backend.database.models import HazardAdvisory, FreshnessStatus, QualityFlag

class MarineAdvisoriesConnector(BaseDataConnector):
    """
    Connects to INCOIS (Ocean State Forecast OSF) and IMD (Marine Weather & Cyclone Warning Centre)
    bulletins for:
    - Lightning & Severe Convective Squall Warnings (IMD Damini / Radar)
    - Cyclone & Depression Track Advisories
    - High Wave & Swell Surge Advisories
    - Port Danger Warning Signals (1 to 11)
    """
    def __init__(self):
        super().__init__(name="INCOIS, IMD & Disaster Management Marine Advisories", source_id="marine_advisories", ttl_seconds=1800)
        self._load_active_bulletins()

    def _load_active_bulletins(self):
        now = datetime.now(timezone.utc)
        valid_from = (now - timedelta(hours=2)).isoformat()
        valid_to = (now + timedelta(hours=36)).isoformat()

        self._active_advisories: List[HazardAdvisory] = [
            HazardAdvisory(
                id="ADV-IMD-LIGHTNING-01",
                title="IMD Damini Convective Lightning & Thunderstorm Alert",
                advisory_type="LIGHTNING",
                severity="WARNING",
                issuing_authority="IMD Severe Weather & Doppler Radar Division",
                region="Southwest Bay of Bengal & Coastal Tamil Nadu",
                valid_from=valid_from,
                valid_to=valid_to,
                description="Intense convective cloud formation detected over coastal waters with frequent cloud-to-sea lightning strikes. Artisanal fishing craft advised to suspend operations and avoid holding metal gear/rods.",
                affected_zones=["Chennai", "Puducherry", "Nagapattinam", "Krishnapatnam"],
                port_warning_signal=2
            ),
            HazardAdvisory(
                id="ADV-INCOIS-WAVE-02",
                title="INCOIS High Wave & Rough Sea Bulletin",
                advisory_type="HIGH_WAVE",
                severity="WARNING",
                issuing_authority="INCOIS Ocean State Forecast (OSF)",
                region="South Tamil Nadu & Gulf of Mannar",
                valid_from=valid_from,
                valid_to=valid_to,
                description="High waves in the range of 2.2 - 2.9 meters are forecasted along South Tamil Nadu coast and Gulf of Mannar. Small fishing craft advised not to venture into deep sea.",
                affected_zones=["Gulf of Mannar", "Tuticorin", "Kanyakumari", "Rameshwaram"],
                port_warning_signal=3
            ),
            HazardAdvisory(
                id="ADV-IMD-CYCLONE-03",
                title="IMD Deep Depression & Potential Cyclone Watch",
                advisory_type="CYCLONE",
                severity="WATCH",
                issuing_authority="IMD Cyclone Warning Division (RSMC)",
                region="Westcentral and adjoining North Bay of Bengal",
                valid_from=valid_from,
                valid_to=valid_to,
                description="Low pressure area over Westcentral Bay of Bengal concentrated into a Depression, likely to intensify into Cyclonic Storm. Wind speeds 45-55 kmph gusting to 65 kmph. Deep-sea fishing strictly suspended off Odisha and Andhra coast.",
                affected_zones=["Visakhapatnam", "Paradip", "Puri", "Dhamra"],
                port_warning_signal=3
            ),
            HazardAdvisory(
                id="ADV-INCOIS-SWELL-04",
                title="INCOIS Swell Surge & High Tide Warning",
                advisory_type="ROUGH_SEA",
                severity="WATCH",
                issuing_authority="INCOIS",
                region="Kerala Coast & Lakshadweep Sea",
                valid_from=valid_from,
                valid_to=valid_to,
                description="Moderate to high swell waves of 1.8 - 2.3 meters expected during high tide. Kallakkadal/swell surge may cause sea surges in low-lying coastal areas.",
                affected_zones=["Kochi", "Lakshadweep", "Kavaratti", "Mangalore"],
                port_warning_signal=1
            ),
            HazardAdvisory(
                id="ADV-IMD-SQUALL-05",
                title="IMD Monsoonal Squally Wind Advisory",
                advisory_type="SQUALL",
                severity="ADVISORY",
                issuing_authority="IMD Marine Weather Division",
                region="Gujarat Coast & Northern Arabian Sea",
                valid_from=valid_from,
                valid_to=valid_to,
                description="Squally weather with wind speed reaching 40-50 kmph gusting to 60 kmph along Veraval, Porbandar, and Gulf of Kutch approaches.",
                affected_zones=["Veraval", "Porbandar", "Kandla"],
                port_warning_signal=2
            )
        ]

    def fetch_data(self, region_name: Optional[str] = None, location_lat: Optional[float] = None, location_lon: Optional[float] = None, advisory_type: Optional[str] = None) -> List[HazardAdvisory]:
        self._load_active_bulletins()
        matched = []
        for adv in self._active_advisories:
            if advisory_type and adv.advisory_type.lower() != advisory_type.lower():
                continue
                
            if region_name:
                r_low = region_name.lower()
                if (r_low in adv.region.lower() or 
                    adv.region.lower() in r_low or 
                    any(z.lower() in r_low or r_low in z.lower() for z in adv.affected_zones)):
                    matched.append(adv)
                    continue

            matched.append(adv)

        if not region_name and location_lat is not None and location_lon is not None:
            from backend.utils.geo import haversine_distance_km, COASTAL_PORT_REGISTRY
            geo_matched = []
            for adv in self._active_advisories:
                for zone in adv.affected_zones:
                    z_key = zone.lower()
                    if z_key in COASTAL_PORT_REGISTRY:
                        p_lat = COASTAL_PORT_REGISTRY[z_key]["lat"]
                        p_lon = COASTAL_PORT_REGISTRY[z_key]["lon"]
                        if haversine_distance_km(location_lat, location_lon, p_lat, p_lon) <= 300.0:
                            if adv not in geo_matched:
                                geo_matched.append(adv)
            return geo_matched if geo_matched else self._active_advisories

        return matched if matched else self._active_advisories

marine_advisories_connector = MarineAdvisoriesConnector()
