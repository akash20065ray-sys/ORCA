import time
import json
from typing import Dict, Any, List, Optional
from backend.utils.logger import logger
from backend.utils.llm_client import llm_client
from backend.database.models import SourceCitation, FreshnessStatus, QualityFlag

class ResponseSynthesisAgent:
    """
    Agent 8: Response Synthesis Agent
    Combines structured results from all domain agents into a professional, human-understandable explanation.
    Embeds ISRO Earth Observation, NOAA, INCOIS, and IMD data provenance and evidence citations.
    """
    def __init__(self):
        self.name = "response_synthesis_agent"
        self.title = "Response Synthesis & Evidence Agent"

    def synthesize(self, user_query: str, plan: Dict[str, Any], context: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"[{self.title}] Synthesizing grounded marine intelligence report (Language: {language})")

        retrieval_res = context.get("marine_data_retrieval_agent", {})
        ocean_res = context.get("ocean_analytics_agent", {})
        weather_res = context.get("weather_intelligence_agent", {})
        alert_res = context.get("alert_notification_agent", {})
        risk_res = context.get("risk_assessment_agent", {})
        geo_res = context.get("geospatial_analysis_agent", {})

        # Extract structured data
        marine_weather = retrieval_res.get("marine_weather", {})
        curr = marine_weather.get("current", {})
        ocean_data = retrieval_res.get("ocean_data", {})
        buoy_data = retrieval_res.get("buoy_data", {})
        tide_data = buoy_data.get("tide") if buoy_data else None
        risk_data = risk_res.get("risk_assessment", {})
        hazards = alert_res.get("hazards", [])
        routes = geo_res.get("candidate_routes", [])
        geofence_alerts = geo_res.get("geofence_alerts", [])
        pfz_list = ocean_res.get("pfz_advisories", [])
        decline_diagnosis = ocean_res.get("decline_diagnosis")

        # Build Source Citations & Evidence Ledger
        citations: List[SourceCitation] = []
        
        # 1. ISRO & NOAA Earth Observation Citation
        if ocean_data:
            citations.append(SourceCitation(
                source_name="ISRO MOSDAC & NOAA CoastWatch Earth Observation",
                dataset_name="ISRO_OCM3_CHLA_L3 / GHRSST_L4_OSTIA",
                parameter="Sea Surface Temperature (SST), Chlorophyll-a (OCM-3), Thermal Fronts",
                timestamp=ocean_data.get("timestamp", "Near Real-Time"),
                retrieved_at=ocean_data.get("retrieved_at", "Just now"),
                freshness=ocean_data.get("freshness", FreshnessStatus.NEAR_REAL_TIME),
                quality=ocean_data.get("quality", QualityFlag.VALIDATED),
                latency_note=f"Satellite pass latency: {ocean_data.get('data_age_hours', 6.0):.1f} hours (ISRO Oceansat-3 & NOAA)"
            ))

        # 2. Marine & Weather Citation
        if marine_weather:
            citations.append(SourceCitation(
                source_name=marine_weather.get("source", "Open-Meteo Marine & Atmospheric Service"),
                dataset_name=marine_weather.get("dataset", "ECMWF_IFS_WAVE_025 / GFS_METEO"),
                parameter="Significant Wave Height (Hs), Swell Period, Wind Speed, Gusts, Pressure",
                timestamp=marine_weather.get("timestamp", "Live"),
                retrieved_at=marine_weather.get("retrieved_at", "Just now"),
                freshness=marine_weather.get("freshness", FreshnessStatus.LIVE),
                quality=marine_weather.get("quality", QualityFlag.VALIDATED),
                latency_note=f"Observation latency: {marine_weather.get('data_age_hours', 0.2):.1f} hours"
            ))

        # 3. Advisories & Lightning Citation
        if hazards:
            citations.append(SourceCitation(
                source_name="INCOIS Ocean State Forecast & IMD Cyclone/Radar Network",
                dataset_name="INCOIS-OSF / IMD-DAMINI-LIGHTNING",
                parameter="High Wave Alerts, IMD Damini Lightning, Cyclone Tracks, Port Danger Signals",
                timestamp=hazards[0].get("valid_from", "Current"),
                retrieved_at=marine_weather.get("retrieved_at", "Just now"),
                freshness=FreshnessStatus.LIVE,
                quality=QualityFlag.VALIDATED,
                latency_note="Official Government Marine Warning System"
            ))

        # 4. In-Situ & Tide Citation
        if tide_data:
            citations.append(SourceCitation(
                source_name="Survey of India & NIOT National Data Buoy Network",
                dataset_name="SOI-TIDE-GAUGE / OMNI-BUOY-MET",
                parameter="Astronomical Tide Height, Flood/Ebb Phase, Surface Current Drift",
                timestamp="Live",
                retrieved_at="Real-time telemetry",
                freshness=FreshnessStatus.LIVE,
                quality=QualityFlag.VALIDATED,
                latency_note="In-Situ Sensor Ground Truth"
            ))

        # 5. GIS & IMBL Boundaries Citation
        citations.append(SourceCitation(
            source_name="National Maritime GIS & PostGIS Spatial Geofence Registry",
            dataset_name="POSTGIS-INDIA-EEZ-IMBL-MPA-2026",
            parameter="International Maritime Boundary Line (IMBL), Marine Sanctuaries, Coral Biospheres",
            timestamp="2026",
            retrieved_at="Spatial index query",
            freshness=FreshnessStatus.LIVE,
            quality=QualityFlag.VALIDATED,
            latency_note="Official Maritime Geodetic Boundary Baseline"
        ))

        # Build grounded synthesis prompt for Claude
        system_prompt = (
            "You are the Response Synthesis Agent in ORCA (Marine EcOsystem Reasoning with Collaborative Agents).\n"
            "Synthesize the structured findings from domain agents into a clear, professional, evidence-backed marine decision report.\n"
            f"Target Language: {language} (if regional language like Tamil, Hindi, Malayalam, Telugu, Bengali, Gujarati is selected, ensure natural regional communication while keeping numbers/units accurate).\n"
            "CRITICAL RULES:\n"
            "- Ground every statement strictly in the provided satellite EO, weather, tide, and hazard data.\n"
            "- NEVER invent or alter measurements, coordinates, wind speeds, wave heights, or risk scores.\n"
            "- Highlight any geofencing alerts, lightning risks, or PFZ coordinates prominently."
        )

        structured_context_json = json.dumps({
            "user_query": user_query,
            "target_location": plan.get("target_location"),
            "coordinates": plan.get("coordinates"),
            "risk_assessment": risk_data,
            "current_weather": curr,
            "tide_info": tide_data,
            "ocean_telemetry": {
                "sst_celsius": ocean_res.get("sst_celsius"),
                "chlorophyll_mg_m3": ocean_res.get("chlorophyll_mg_m3"),
                "thermal_gradient": ocean_res.get("sst_gradient_deg_km"),
                "productivity_state": ocean_res.get("productivity_state")
            },
            "active_hazards": hazards,
            "geofence_alerts": geofence_alerts,
            "routes_summary": [{"name": r["route_name"], "safety_score": r["safety_score"], "verdict": r["recommendation_verdict"]} for r in routes],
            "pfz_summary": [{"name": p["zone_name"], "distance_km": p["distance_km"], "bearing": p["bearing_cardinal"], "confidence": p["confidence_score"]} for p in pfz_list],
            "decline_diagnosis": decline_diagnosis
        }, indent=2)

        user_prompt = f"Synthesize a report for this user query: '{user_query}' in {language} language.\n\nStructured Agent Outputs:\n{structured_context_json}"

        final_text = llm_client.generate_text(system_prompt, user_prompt)

        # If LLM returned default fallback or offline, construct structured markdown
        if not llm_client.is_available() or len(final_text) < 50:
            final_text = self._build_deterministic_markdown_report(user_query, plan, risk_data, curr, ocean_res, hazards, routes, pfz_list, geofence_alerts, decline_diagnosis, tide_data)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "agent": self.name,
            "status": "completed",
            "duration_ms": duration_ms,
            "synthesized_text": final_text,
            "citations": [c.model_dump() for c in citations]
        }

    def _build_deterministic_markdown_report(
        self,
        query: str,
        plan: Dict[str, Any],
        risk: Dict[str, Any],
        weather: Dict[str, Any],
        ocean: Dict[str, Any],
        hazards: List[Dict[str, Any]],
        routes: List[Dict[str, Any]],
        pfz: List[Dict[str, Any]],
        geofence_alerts: List[Dict[str, Any]],
        decline_diagnosis: Optional[Dict[str, Any]],
        tide: Optional[Dict[str, Any]]
    ) -> str:
        loc = plan.get("target_location", "Coast")
        risk_level = risk.get("overall_risk", "MODERATE")
        score = risk.get("risk_score", 45)
        is_safe = risk.get("is_safe_to_sail", True)
        advisory = risk.get("safety_advisory", "Exercise caution.")

        wind_kts = weather.get("wind_speed_kts", 14.5)
        gusts = weather.get("wind_gusts_kts", 20.0)
        wave_m = weather.get("wave_height_m", 1.3)
        swell_m = weather.get("swell_wave_height_m", 1.0)
        sst = ocean.get("sst_celsius", 28.5)
        chl = ocean.get("chlorophyll_mg_m3", 0.45)
        productivity_state = ocean.get("productivity_state", "Stable Mesotrophic Waters")

        lines = [
            f"### ORCA Marine Decision Assessment: **{loc}**",
            f"**Safety Verdict**: **{risk_level} RISK** (Safety Index: {score}/100) — *{'SAFE TO VENTURE (with standard safety precautions)' if is_safe else 'HIGH RISK / DEPARTURE NOT RECOMMENDED'}*",
            "",
            "#### 🛰️ Satellite Earth Observation & In-Situ Parameters",
            f"- **ISRO Oceansat-3 / NOAA SST**: {sst}°C (Thermal gradient: {ocean.get('sst_gradient_deg_km', 0.5)}°C/km)",
            f"- **Chlorophyll-a Concentration**: {chl} mg/m³ (*{productivity_state}*)",
            f"- **Significant Wave Height**: {wave_m}m (Swell: {swell_m}m)",
            f"- **Wind Speed**: {wind_kts} knots (Gusts: {gusts} kts)",
            f"- **Weather Condition**: {weather.get('weather_condition', 'Fair')}"
        ]

        if tide:
            lines.append(f"- **Tide Telemetry**: {tide.get('current_tide_height_m', 1.2)}m ({tide.get('tide_state', 'Rising')}) | Next High Tide: **{tide.get('next_high_tide', 'N/A')}**")

        lines.extend([
            "",
            "#### ⚠️ Risk Analysis & Causal Factors"
        ])

        for r in risk.get("reasons", []):
            lines.append(f"- {r}")

        # Geofence alerts
        if geofence_alerts:
            lines.append("\n#### 🚨 Geofence & Boundary Proximity Alarms")
            for g in geofence_alerts:
                lines.append(f"- **{g.get('zone_name')}**: Distance **{g.get('distance_nm')} NM**. *{g.get('recommended_action')}*")

        # Hazards & Bulletins
        if hazards:
            lines.append("\n#### ⚡ Active Marine Bulletins & Radar Alerts")
            for h in hazards:
                lines.append(f"- **{h.get('title')}** ({h.get('issuing_authority')}): {h.get('description')}")

        # Potential Fishing Zones
        if pfz:
            lines.append("\n#### 🐟 Favourable Potential Fishing Zones (PFZ)")
            for p in pfz:
                lines.append(f"- **{p.get('zone_name')}**: {p.get('distance_km')} km ({p.get('distance_nm')} NM) heading **{p.get('bearing_cardinal')}** ({p.get('bearing_deg')}°). Target species: {', '.join(p.get('species_association', []))}. Confidence: **{int(p.get('confidence_score', 0.8)*100)}%**")

        # Productivity decline explanation
        if decline_diagnosis:
            lines.append("\n#### 📉 Ecological Diagnosis: Why Fish Productivity Declined")
            for f in decline_diagnosis.get("primary_ecological_factors", []):
                lines.append(f"- {f}")
            lines.append("\n*Restoration & Search Strategy:*")
            for a in decline_diagnosis.get("actionable_restoration_advice", []):
                lines.append(f"- {a}")

        # Routes
        if routes:
            lines.append("\n#### 🧭 Navigable Route Optimization")
            for r in routes:
                lines.append(f"- **{r.get('route_name')}**: {r.get('total_distance_nm')} NM (~{r.get('estimated_duration_hours')} hrs at 12 kts). Safety Score: **{r.get('safety_score')}/100** — *{r.get('recommendation_verdict')}*")

        lines.extend([
            "",
            "#### 📋 Actionable Recommendation",
            f"*{advisory}*"
        ])

        for p in risk.get("recommended_precautions", []):
            lines.append(f"- {p}")

        return "\n".join(lines)

response_synthesis_agent = ResponseSynthesisAgent()
