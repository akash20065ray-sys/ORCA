from typing import Dict, List, Any, Optional
from backend.database.models import RiskLevel, RiskAssessment, HazardAdvisory, FreshnessStatus

class MarineRiskEngine:
    """
    Deterministic multi-parameter safety rule engine.
    Calculates safety scores and causal risk factors across wave states, wind forces,
    lightning danger, cyclone tracks, and IMBL geofencing.
    """
    @classmethod
    def evaluate_risk(
        cls,
        wave_height_m: float,
        swell_wave_m: float,
        wind_speed_kts: float,
        wind_gusts_kts: float,
        active_hazards: List[HazardAdvisory],
        is_restricted_zone: bool = False,
        geofence_alerts: Optional[List[Dict[str, Any]]] = None,
        data_freshness: FreshnessStatus = FreshnessStatus.LIVE,
        vessel_type: str = "artisanal_fishing_craft"
    ) -> RiskAssessment:
        reasons: List[str] = []
        precautions: List[str] = []
        risk_score = 0 # 0 (calm/safe) to 100 (extreme danger)

        # 1. Wave Risk Component
        wave_risk = RiskLevel.LOW
        if wave_height_m >= 3.5 or swell_wave_m >= 3.0:
            wave_risk = RiskLevel.CRITICAL
            risk_score += 45
            reasons.append(f"Significant wave height of {wave_height_m:.1f}m (Douglas Sea State 5-6: High to Very High rough seas) poses severe capsize risk.")
            precautions.append("Total prohibition on small craft departure. Commercial vessels maintain ballast stability.")
        elif wave_height_m >= 2.2 or swell_wave_m >= 2.0:
            wave_risk = RiskLevel.HIGH
            risk_score += 32
            reasons.append(f"Rough sea conditions with {wave_height_m:.1f}m wave height and {swell_wave_m:.1f}m swell.")
            precautions.append("Small crafts (< 12m) should not venture into open sea. Deep-sea trawlers exercise extreme vigilance.")
        elif wave_height_m >= 1.5:
            wave_risk = RiskLevel.MODERATE
            risk_score += 18
            reasons.append(f"Moderate sea state with {wave_height_m:.1f}m wave height. Small craft may experience choppiness.")
            precautions.append("Life jackets mandatory at all times. Check bilge pumps and VHF marine radio before departure.")
        else:
            wave_risk = RiskLevel.LOW
            risk_score += 5
            reasons.append(f"Favourable wave conditions ({wave_height_m:.1f}m wave height, smooth to slight sea).")

        # 2. Wind Risk Component
        wind_risk = RiskLevel.LOW
        if wind_speed_kts >= 34.0 or wind_gusts_kts >= 42.0:
            wind_risk = RiskLevel.CRITICAL
            risk_score += 40
            reasons.append(f"Gale-force winds of {wind_speed_kts:.1f} kts with dangerous gusts up to {wind_gusts_kts:.1f} kts (Beaufort Scale 8+).")
            precautions.append("Harbour lockdown recommended. Seek sheltered anchorage immediately.")
        elif wind_speed_kts >= 22.0 or wind_gusts_kts >= 28.0:
            wind_risk = RiskLevel.HIGH
            risk_score += 26
            reasons.append(f"Strong breeze/near-gale winds ({wind_speed_kts:.1f} kts, gusts {wind_gusts_kts:.1f} kts).")
            precautions.append("Avoid open ocean runs. Secure all deck gear.")
        elif wind_speed_kts >= 14.0 or wind_gusts_kts >= 19.0:
            wind_risk = RiskLevel.MODERATE
            risk_score += 12
            reasons.append(f"Moderate breeze ({wind_speed_kts:.1f} kts, gusts {wind_gusts_kts:.1f} kts).")
        else:
            wind_risk = RiskLevel.LOW
            risk_score += 4
            reasons.append(f"Gentle to moderate winds ({wind_speed_kts:.1f} kts).")

        # 3. Hazard Bulletins (Lightning, Cyclones, High Waves, Port Signals)
        hazard_risk = RiskLevel.LOW
        if active_hazards:
            for h in active_hazards:
                if h.advisory_type == "LIGHTNING":
                    if hazard_risk != RiskLevel.CRITICAL:
                        hazard_risk = RiskLevel.HIGH
                    risk_score += 25
                    reasons.append(f"IMD Damini Alert: Active cloud-to-sea lightning strikes detected in this sector.")
                    precautions.append("Do not touch metal fishing poles or antennas; take shelter inside vessel cabin.")
                elif h.advisory_type == "CYCLONE":
                    hazard_risk = RiskLevel.CRITICAL
                    risk_score += 45
                    reasons.append(f"IMD Cyclone Warning: {h.title} - Deep depression/cyclonic storm in effect.")
                    precautions.append("Immediate evacuation of fishing vessels to nearest designated safe harbor.")
                elif h.severity == "WARNING" or (h.port_warning_signal and h.port_warning_signal >= 3):
                    hazard_risk = RiskLevel.HIGH
                    risk_score += 25
                    reasons.append(f"Active {h.issuing_authority} Advisory: {h.title} (Port Signal {h.port_warning_signal or 'N/A'}).")
                    precautions.append(f"Comply with local port authority directives: {h.description[:120]}...")
                elif h.severity == "WATCH" or h.severity == "ADVISORY":
                    if hazard_risk not in (RiskLevel.HIGH, RiskLevel.CRITICAL):
                        hazard_risk = RiskLevel.MODERATE
                    risk_score += 12
                    reasons.append(f"Advisory: {h.title} ({h.region}).")

        # 4. Geofencing & IMBL Proximity Warnings
        if geofence_alerts:
            for g in geofence_alerts:
                risk_score += 30
                reasons.append(f"🚨 Geofence Alert: Within {g['distance_nm']} NM of {g['zone_name']}. {g['description']}")
                precautions.append(g['recommended_action'])
        elif is_restricted_zone:
            risk_score += 20
            reasons.append("Target coordinates intersect a designated Marine Protected Area (MPA) or Naval Security perimeter where navigation/fishing is restricted.")
            precautions.append("Reroute vessel to stay outside restricted boundary buffer.")

        # 5. Data Freshness Penalty
        freshness_penalty = False
        if data_freshness in (FreshnessStatus.DELAYED, FreshnessStatus.HISTORICAL):
            freshness_penalty = True
            risk_score += 8
            reasons.append("Observation data is delayed (> 12h latency). Added uncertainty margin to safety evaluation.")
            precautions.append("Verify latest VHF weather broadcast before unmooring.")

        # Normalize score
        risk_score = min(100, max(0, risk_score))

        # Determine overall level
        if risk_score >= 68 or wave_risk == RiskLevel.CRITICAL or wind_risk == RiskLevel.CRITICAL or hazard_risk == RiskLevel.CRITICAL:
            overall_risk = RiskLevel.CRITICAL
            is_safe = False
            advisory = "DO NOT VENTURE TO SEA. Dangerous conditions with gale-force winds, severe waves, lightning, or cyclone alert."
        elif risk_score >= 48 or wave_risk == RiskLevel.HIGH or wind_risk == RiskLevel.HIGH or hazard_risk == RiskLevel.HIGH:
            overall_risk = RiskLevel.HIGH
            is_safe = False
            advisory = "HIGH RISK. Unfavourable conditions for artisanal and small fishing crafts. Exercise extreme caution."
        elif risk_score >= 26 or wave_risk == RiskLevel.MODERATE or wind_risk == RiskLevel.MODERATE:
            overall_risk = RiskLevel.MODERATE
            is_safe = True
            advisory = "MODERATE RISK. Sea conditions are manageable with proper safety gear, but caution is advised for small craft."
        else:
            overall_risk = RiskLevel.LOW
            is_safe = True
            advisory = "Current data indicates relatively favorable conditions. Risk is assessed as LOW based on available data. Verify the latest marine advisory before departure."

        if not precautions:
            precautions.append("Maintain standard VHF watch on Channel 16 and wear approved life jackets.")

        safety_score = max(0, min(100, 100 - risk_score))

        return RiskAssessment(
            overall_risk=overall_risk,
            risk_score=risk_score,
            safety_score=safety_score,
            is_safe_to_sail=is_safe,
            wind_risk=wind_risk,
            wave_risk=wave_risk,
            hazard_risk=hazard_risk,
            freshness_penalty_applied=freshness_penalty,
            reasons=reasons,
            safety_advisory=advisory,
            recommended_precautions=precautions
        )

risk_engine = MarineRiskEngine()
