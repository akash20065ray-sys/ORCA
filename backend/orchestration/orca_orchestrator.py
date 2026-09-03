import time
import uuid
from typing import Dict, Any, List, Optional
from backend.utils.logger import logger
from backend.database.models import (
    OrchestrationResult,
    AgentTraceStep,
    OceanTelemetrySummary,
    RiskAssessment,
    PFZAdvisory,
    CandidateRoute,
    HazardAdvisory,
    MarineZone,
    SourceCitation,
    FreshnessStatus
)
from backend.database.supabase import supabase_db

# Import the 8 specialized agents
from backend.agents.planning_agent import planning_agent
from backend.agents.marine_data_retrieval_agent import marine_data_retrieval_agent
from backend.agents.ocean_analytics_agent import ocean_analytics_agent
from backend.agents.weather_intelligence_agent import weather_intelligence_agent
from backend.agents.alert_notification_agent import alert_notification_agent
from backend.agents.risk_assessment_agent import risk_assessment_agent
from backend.agents.geospatial_analysis_agent import geospatial_analysis_agent
from backend.agents.response_synthesis_agent import response_synthesis_agent

class ORCAOrchestrator:
    """
    ORCA Master Collaborative Agent Orchestrator.
    Executes the multi-agent pipeline:
    User Query -> Planning Agent -> Specialized Agents -> Data Connectors -> Normalization & Validation -> Risk & Spatial Engines -> Response Synthesis.
    """
    def __init__(self):
        self.agents_map = {
            "planning_agent": planning_agent,
            "marine_data_retrieval_agent": marine_data_retrieval_agent,
            "ocean_analytics_agent": ocean_analytics_agent,
            "weather_intelligence_agent": weather_intelligence_agent,
            "alert_notification_agent": alert_notification_agent,
            "risk_assessment_agent": risk_assessment_agent,
            "geospatial_analysis_agent": geospatial_analysis_agent,
            "response_synthesis_agent": response_synthesis_agent
        }

    def process_query(self, user_query: str, user_location: Optional[Dict[str, float]] = None, language: str = "en") -> OrchestrationResult:
        start_time = time.time()
        query_id = str(uuid.uuid4())
        logger.info(f"=== [ORCA Pipeline Start] Query ID: {query_id} | '{user_query}' | Lang: {language} ===")

        execution_trace: List[AgentTraceStep] = []
        context: Dict[str, Any] = {}

        # ----------------------------------------------------
        # Step 1: Planning Agent (LLM-powered orchestrator)
        # ----------------------------------------------------
        p_start = time.time()
        plan = planning_agent.plan(user_query, user_location)
        p_dur = round((time.time() - p_start) * 1000, 2)
        
        execution_trace.append(AgentTraceStep(
            agent_name="planning_agent",
            agent_title="1. Planning Agent",
            status="completed",
            duration_ms=p_dur,
            summary=f"Understood intent: '{plan.get('intent')}'. Target: {plan.get('target_location')}. Selected {len(plan.get('selected_agents', []))} agents.",
            output_preview={"intent": plan.get("intent"), "selected_agents": plan.get("selected_agents")}
        ))

        selected = plan.get("selected_agents", [])
        
        # ----------------------------------------------------
        # Step 2: Marine Data Retrieval Agent
        # ----------------------------------------------------
        r_start = time.time()
        retrieval_res = marine_data_retrieval_agent.execute(plan)
        r_dur = round((time.time() - r_start) * 1000, 2)
        context["marine_data_retrieval_agent"] = retrieval_res
        
        execution_trace.append(AgentTraceStep(
            agent_name="marine_data_retrieval_agent",
            agent_title="2. Marine Data Retrieval Agent",
            status="completed",
            duration_ms=r_dur,
            summary=retrieval_res["summary"],
            output_preview={"observations_retrieved": retrieval_res["observations_count"]}
        ))

        # ----------------------------------------------------
        # Step 3: Ocean Analytics Agent (Satellite EO)
        # ----------------------------------------------------
        if "ocean_analytics_agent" in selected or plan.get("requires_pfz"):
            o_start = time.time()
            ocean_res = ocean_analytics_agent.execute(plan, context)
            o_dur = round((time.time() - o_start) * 1000, 2)
            context["ocean_analytics_agent"] = ocean_res
            
            execution_trace.append(AgentTraceStep(
                agent_name="ocean_analytics_agent",
                agent_title="3. Ocean Analytics Agent",
                status="completed",
                duration_ms=o_dur,
                summary=ocean_res["summary"],
                output_preview={"sst": ocean_res["sst_celsius"], "chl": ocean_res["chlorophyll_mg_m3"]}
            ))

        # ----------------------------------------------------
        # Step 4: Weather Intelligence Agent
        # ----------------------------------------------------
        if "weather_intelligence_agent" in selected:
            w_start = time.time()
            weather_res = weather_intelligence_agent.execute(plan, context)
            w_dur = round((time.time() - w_start) * 1000, 2)
            context["weather_intelligence_agent"] = weather_res
            
            execution_trace.append(AgentTraceStep(
                agent_name="weather_intelligence_agent",
                agent_title="4. Weather Intelligence Agent",
                status="completed",
                duration_ms=w_dur,
                summary=weather_res["summary"],
                output_preview={"wind_kts": weather_res["wind_speed_knots"], "wave_m": weather_res["wave_height_meters"]}
            ))

        # ----------------------------------------------------
        # Step 5: Alert & Notification Agent (Lightning, Cyclone)
        # ----------------------------------------------------
        if "alert_notification_agent" in selected:
            a_start = time.time()
            alert_res = alert_notification_agent.execute(plan, context)
            a_dur = round((time.time() - a_start) * 1000, 2)
            context["alert_notification_agent"] = alert_res
            
            execution_trace.append(AgentTraceStep(
                agent_name="alert_notification_agent",
                agent_title="5. Alert & Notification Agent",
                status="completed",
                duration_ms=a_dur,
                summary=alert_res["summary"],
                output_preview={"active_hazards": alert_res["total_hazards"]}
            ))

        # ----------------------------------------------------
        # Step 6: Geospatial Analysis Agent (IMBL & Geofencing)
        # ----------------------------------------------------
        if "geospatial_analysis_agent" in selected or plan.get("requires_routing"):
            g_start = time.time()
            geo_res = geospatial_analysis_agent.execute(plan, context)
            g_dur = round((time.time() - g_start) * 1000, 2)
            context["geospatial_analysis_agent"] = geo_res
            
            execution_trace.append(AgentTraceStep(
                agent_name="geospatial_analysis_agent",
                agent_title="7. Geospatial Analysis Agent",
                status="completed",
                duration_ms=g_dur,
                summary=geo_res["summary"],
                output_preview={"has_routes": geo_res["has_routes"]}
            ))

        # ----------------------------------------------------
        # Step 7: Risk Assessment Agent
        # ----------------------------------------------------
        risk_obj: Optional[RiskAssessment] = None
        if "risk_assessment_agent" in selected or plan.get("requires_risk_assessment", True):
            k_start = time.time()
            risk_res = risk_assessment_agent.execute(plan, context)
            k_dur = round((time.time() - k_start) * 1000, 2)
            context["risk_assessment_agent"] = risk_res
            risk_obj = RiskAssessment(**risk_res["risk_assessment"])
            
            execution_trace.append(AgentTraceStep(
                agent_name="risk_assessment_agent",
                agent_title="6. Risk Assessment Agent",
                status="completed",
                duration_ms=k_dur,
                summary=risk_res["summary"],
                output_preview={"risk_level": risk_obj.overall_risk.value, "score": risk_obj.risk_score}
            ))

        # ----------------------------------------------------
        # Step 8: Response Synthesis Agent (ISRO & Grounded Citations)
        # ----------------------------------------------------
        s_start = time.time()
        synth_res = response_synthesis_agent.synthesize(user_query, plan, context, language=language)
        s_dur = round((time.time() - s_start) * 1000, 2)
        
        execution_trace.append(AgentTraceStep(
            agent_name="response_synthesis_agent",
            agent_title="8. Response Synthesis Agent",
            status="completed",
            duration_ms=s_dur,
            summary="Synthesized evidence-backed marine intelligence assessment.",
            output_preview={"citations_count": len(synth_res.get("citations", []))}
        ))

        # Assemble Telemetry Object
        marine_weather = retrieval_res.get("marine_weather", {})
        curr_m = marine_weather.get("current", {})
        ocean_data = retrieval_res.get("ocean_data", {})
        buoy_data = retrieval_res.get("buoy_data", {})
        coords = plan.get("coordinates", {})

        telemetry = OceanTelemetrySummary(
            location_name=plan.get("target_location", "Coast"),
            latitude=coords.get("latitude", 13.0827),
            longitude=coords.get("longitude", 80.2707),
            sst_celsius=ocean_data.get("sst_celsius"),
            chlorophyll_mg_m3=ocean_data.get("chlorophyll_mg_m3"),
            wind_speed_knots=curr_m.get("wind_speed_kts"),
            wind_gusts_knots=curr_m.get("wind_gusts_kts"),
            wind_direction_deg=curr_m.get("wind_direction_deg"),
            wave_height_meters=curr_m.get("wave_height_m"),
            swell_wave_height_meters=curr_m.get("swell_wave_height_m"),
            wave_period_seconds=curr_m.get("wave_period_s"),
            sea_surface_pressure_hpa=curr_m.get("surface_pressure_hpa"),
            weather_condition=curr_m.get("weather_condition"),
            data_freshness=marine_weather.get("freshness", FreshnessStatus.LIVE),
            data_age_hours=marine_weather.get("data_age_hours", 0.2)
        )

        # Extract PFZs, Routes, Hazards, Citations
        pfz_raw = context.get("ocean_analytics_agent", {}).get("pfz_advisories", [])
        pfz_advisories = [PFZAdvisory(**p) for p in pfz_raw] if pfz_raw else None

        routes_raw = context.get("geospatial_analysis_agent", {}).get("candidate_routes", [])
        routes = [CandidateRoute(**r) for r in routes_raw] if routes_raw else None

        hazards_raw = context.get("alert_notification_agent", {}).get("hazards", [])
        hazards = [HazardAdvisory(**h) for h in hazards_raw] if hazards_raw else None

        citations_raw = synth_res.get("citations", [])
        citations = [SourceCitation(**c) for c in citations_raw]

        total_time_ms = round((time.time() - start_time) * 1000, 2)

        result = OrchestrationResult(
            query_id=query_id,
            query_text=user_query,
            intent=plan.get("intent", "general_marine_query"),
            target_location=plan.get("target_location", "Coast"),
            target_coordinates=coords,
            selected_agents=selected,
            execution_trace=execution_trace,
            synthesized_response=synth_res.get("synthesized_text", ""),
            risk_assessment=risk_obj,
            telemetry=telemetry,
            forecast_timeline=marine_weather.get("timeline"),
            pfz_advisories=pfz_advisories,
            routes=routes,
            active_hazards=hazards,
            evidence_citations=citations,
            processing_time_ms=total_time_ms
        )

        # Log audit trail
        supabase_db.log_query_audit({
            "query_id": query_id,
            "user_query": user_query,
            "detected_intent": result.intent,
            "selected_agents": result.selected_agents,
            "target_location": result.target_location,
            "risk_level": risk_obj.overall_risk.value if risk_obj else "N/A",
            "processing_time_ms": total_time_ms
        })

        logger.info(f"=== [ORCA Pipeline Finished] Total time: {total_time_ms} ms ===")
        return result

orca_orchestrator = ORCAOrchestrator()
