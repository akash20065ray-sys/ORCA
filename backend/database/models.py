from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class FreshnessStatus(str, Enum):
    LIVE = "LIVE"                       # < 3 hours
    NEAR_REAL_TIME = "NEAR_REAL_TIME"   # 3 - 12 hours
    DELAYED = "DELAYED"                 # 12 - 48 hours
    HISTORICAL = "HISTORICAL"           # > 48 hours

class QualityFlag(str, Enum):
    VALIDATED = "VALIDATED"
    SUSPECT = "SUSPECT"
    INTERPOLATED = "INTERPOLATED"
    FALLBACK = "FALLBACK"

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN / INSUFFICIENT DATA"

class MarineObservation(BaseModel):
    id: Optional[str] = None
    source: str
    dataset: str
    variable: str
    latitude: float
    longitude: float
    value: float
    unit: str
    timestamp: str
    retrieved_at: str
    data_age_hours: float
    freshness_status: FreshnessStatus
    quality_flag: QualityFlag
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MarineZone(BaseModel):
    id: str
    name: str
    zone_type: str # MPA, EEZ, RESTRICTED_NAVAL, SHIPPING_LANE, CORAL_REEF, PORT
    state_region: str
    risk_multiplier: float = 1.0
    description: str
    coordinates: List[List[float]] # GeoJSON Polygon coords [[lon, lat], ...]
    is_restricted: bool = False

class HazardAdvisory(BaseModel):
    id: str
    title: str
    advisory_type: str # HIGH_WAVE, SQUALL, CYCLONE, PORT_WARNING, ROUGH_SEA
    severity: str # WARNING, WATCH, ADVISORY
    issuing_authority: str # INCOIS, IMD, Coast Guard
    region: str
    valid_from: str
    valid_to: str
    description: str
    affected_zones: List[str] = Field(default_factory=list)
    port_warning_signal: Optional[int] = None

class PFZAdvisory(BaseModel):
    id: str
    zone_name: str
    latitude: float
    longitude: float
    sst_celsius: float
    sst_gradient_deg_km: float
    chlorophyll_mg_m3: float
    distance_km: float
    distance_nm: float
    bearing_deg: float
    bearing_cardinal: str
    reference_port: str
    depth_meters: int
    confidence_score: float # 0.0 - 1.0
    validity_hours: int = 24
    species_association: List[str] = Field(default_factory=list)

class RouteWaypoint(BaseModel):
    index: int
    name: str
    latitude: float
    longitude: float
    segment_distance_nm: float
    cumulative_distance_nm: float
    wave_height_m: float
    wind_speed_kts: float
    hazard_proximity_km: float
    is_safe: bool = True
    bearing_deg: Optional[float] = None
    bearing_cardinal: Optional[str] = None
    steer_instruction: Optional[str] = None

class CandidateRoute(BaseModel):
    route_id: str
    route_name: str
    total_distance_km: float
    total_distance_nm: float
    estimated_duration_hours: float
    safety_score: int # 0 - 100
    risk_level: RiskLevel
    waypoints: List[RouteWaypoint]
    weather_summary: str
    avoided_hazards: List[str] = Field(default_factory=list)
    recommendation_verdict: str
    fuel_estimate_liters: Optional[float] = None
    fuel_saved_liters: Optional[float] = None
    co2_saved_kg: Optional[float] = None
    fuel_cost_savings_inr: Optional[float] = None

class RiskAssessment(BaseModel):
    overall_risk: RiskLevel
    risk_score: int # 0 - 100
    is_safe_to_sail: bool
    wind_risk: RiskLevel
    wave_risk: RiskLevel
    hazard_risk: RiskLevel
    freshness_penalty_applied: bool
    reasons: List[str]
    safety_advisory: str
    recommended_precautions: List[str]

class AgentTraceStep(BaseModel):
    agent_name: str
    agent_title: str
    status: str # "started", "running", "completed", "failed"
    duration_ms: float
    summary: str
    output_preview: Optional[Dict[str, Any]] = None

class SourceCitation(BaseModel):
    source_name: str
    dataset_name: str
    parameter: str
    timestamp: str
    retrieved_at: str
    freshness: FreshnessStatus
    quality: QualityFlag
    latency_note: str

class OceanTelemetrySummary(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    sst_celsius: Optional[float] = None
    chlorophyll_mg_m3: Optional[float] = None
    wind_speed_knots: Optional[float] = None
    wind_gusts_knots: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    wave_height_meters: Optional[float] = None
    swell_wave_height_meters: Optional[float] = None
    wave_period_seconds: Optional[float] = None
    sea_surface_pressure_hpa: Optional[float] = None
    weather_condition: Optional[str] = None
    data_freshness: FreshnessStatus = FreshnessStatus.LIVE
    data_age_hours: float = 0.0

class OrchestrationResult(BaseModel):
    query_id: str
    query_text: str
    intent: str
    target_location: str
    target_coordinates: Dict[str, float]
    selected_agents: List[str]
    execution_trace: List[AgentTraceStep]
    synthesized_response: str
    risk_assessment: Optional[RiskAssessment] = None
    telemetry: Optional[OceanTelemetrySummary] = None
    forecast_timeline: Optional[List[Dict[str, Any]]] = None
    pfz_advisories: Optional[List[PFZAdvisory]] = None
    routes: Optional[List[CandidateRoute]] = None
    active_hazards: Optional[List[HazardAdvisory]] = None
    nearby_zones: Optional[List[MarineZone]] = None
    evidence_citations: List[SourceCitation] = Field(default_factory=list)
    processing_time_ms: float
