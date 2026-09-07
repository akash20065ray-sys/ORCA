import time
from typing import Dict, Any, List, Optional
from backend.utils.logger import logger
from backend.utils.llm_client import llm_client
from backend.utils.geo import resolve_location_name, COASTAL_PORT_REGISTRY
from backend.config import settings

class PlanningAgent:
    """
    Agent 1: Planning Agent
    The Planning Agent uses an LLM to understand the user's request, decompose the task and coordinate the required specialized agents.
    The LLM never fabricates marine measurements, coordinates, or hazard values.
    """
    def __init__(self):
        self.name = "planning_agent"
        self.title = "Planning & Task Decomposition Agent"

    def plan(
        self,
        user_query: str,
        user_location: Optional[Dict[str, float]] = None,
        location_name: Optional[str] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"[{self.title}] Analyzing query: '{user_query}' | Context Location: {location_name} | History turns: {len(chat_history or [])}")

        system_prompt = (
            "You are the Planning Agent in ORCA (Ocean Intelligence Companion).\n"
            "ORCA contains exactly 8 collaborative agents:\n"
            "1. PLANNING AGENT (You - task decomposition & agent selection)\n"
            "2. MARINE DATA RETRIEVAL AGENT (SST, chlorophyll, waves, currents, tides)\n"
            "3. OCEAN ANALYTICS AGENT (Trends, patterns, candidate PFZ indicators)\n"
            "4. WEATHER INTELLIGENCE AGENT (Wind, marine weather forecasts, hazards)\n"
            "5. ALERT & NOTIFICATION AGENT (Marine advisories, weather warnings, hazard alerts)\n"
            "6. RISK ASSESSMENT AGENT (Multi-factor safety and operational risk)\n"
            "7. GEOSPATIAL ANALYSIS AGENT (Coordinates, boundaries, restricted/sensitive areas, routes)\n"
            "8. RESPONSE SYNTHESIS AGENT (Combines validated outputs into final response)\n\n"
            "CRITICAL RULES:\n"
            "- Do NOT run every agent for every question. Only invoke the agents needed for the user's request.\n"
            "- Never independently invent ocean measurements, coordinates, routes, or risk values.\n"
            "- Maintain conversational continuity across multi-turn queries. If the user refers to 'here', 'the sea', 'tomorrow', "
            "or asks a follow-up, retain the active location and context from previous conversation turns.\n"
            "Return a JSON object with: intent, target_location, coordinates {latitude, longitude}, "
            "timeframe, selected_agents, requires_routing (bool), route_endpoints (optional), "
            "requires_pfz (bool), requires_risk_assessment (bool), reasoning_summary."
        )

        history_summary = ""
        if chat_history:
            history_summary = "\n".join([f"- {m.get('role', 'user')}: {m.get('content', '')}" for m in chat_history[-4:]])

        user_prompt = f"Previous Conversation Context:\n{history_summary or 'None'}\n\nCurrent Query: {user_query}\nActive Location Name: {location_name or 'None'}\nUser Coordinates Override: {user_location or 'None'}"
        
        # 1. Fast-path deterministic task decomposition (<0.5ms, zero-latency)
        from backend.services.language_service import language_service
        q_low = user_query.lower()

        # Fast-path for port display / locate commands (e.g. "Mujhe Kochi port dikhao", "Show me Mumbai port", "मला कोची बंदर दाखवा")
        display_verbs = [
            "dikhao", "dikhaye", "dakhva", "show me", "show", "locate", "kahan hai", "kaisa hai", "kase aahe",
            "दाखवा", "दिखाओ", "दिखाइए", "कहाँ है", "कसा आहे", "कशी आहे", "कसे आहे", "कैसा है", "कैसी है", "कैसा रहेगा", "काटू",
            "காட்டு", "காட்டுங்கள்", "எங்கே", "எப்படி", "எப்படி உள்ளது", "எப்படி இருக்கிறது", "எப்படி இருக்கு", "நிலை", "நிலவரம்",
            "ఎక్కడ", "చూపించు", "చూపించండి", "ఎలా ఉంది", "ఎలాగ ఉంది",
            "দেখাও", "দেখান", "কোথায়", "কেমন আছে", "কেমন",
            "બતાવો", "દર્શાવો", "ક્યાં છે", "કેવું છે",
            "തോന്നിക്ക്", "കാണിക്കൂ", "കാണിക്കുക", "എവിടെ", "എങ്ങനെയുണ്ട്", "എങ്ങനെ ഉണ്ട്",
            "ತೋರಿಸಿ", "ತೋರಿಸು", "ಎಲ್ಲಿದೆ", "ಹೇಗಿದೆ", "ದೇಖಾନ୍ତୁ", "ଦେଖାଅ", "କେଉଁଠି", "କିପରି ଅଛି"
        ]
        port_tokens = [
            "port", "bandar", "harbor", "kochi", "cochin", "mumbai", "chennai", "goa", "vizag", "visakhapatnam",
            "mangalore", "tuticorin", "veraval", "paradip", "kandla", "mundra",
            "बंदर", "बंदरगाह", "पोर्ट", "कोची", "कोच्चि", "मुंबई", "चेन्नई", "गोवा", "विशाखापट्टनम",
            "துறைமுகம்", "கொச்சி", "மும்பை", "சென்னை", "தூத்துக்குடி",
            "തുറമുഖം", "പോർട്ട്", "കൊച്ചി", "മുംബൈ", "ചെന്നൈ", "വിഴിഞ്ഞം",
            "ఓడరేవు", "రేవు", "పోర్ట్", "విశాఖపట్నం", "ముంబై", "కొచ్చి",
            "বন্দর", "পোর্ট", "কোচি", "মুম্বই", "কলকাতা", "দীঘা", "পারাদ্বীপ",
            "બંદર", "પોર્ટ", "મુંબઈ", "વેરાવળ", "કંડલા", "કોચી",
            "ಬಂದರು", "ಪೋರ್ಟ್", "ಮಂಗಳೂರು", "ಮುಂಬೈ", "ಕೊಚ್ಚಿ",
            "ବନ୍ଦର", "ପୋର୍ଟ", "ପାରାଦୀପ", "ପାରାଦ୍ୱୀପ", "ମୁମ୍ବାଇ", "କୋଚି"
        ]
        if any(v in q_low for v in display_verbs) and any(p in q_low for p in port_tokens):
            loc = resolve_location_name(user_query)
            target_port_name = loc["name"] if loc else "Cochin Port (Kochi)"
            lat = loc["lat"] if loc else 9.9656
            lon = loc["lon"] if loc else 76.2425
            return {
                "intent": "port_inquiry",
                "selected_agents": ["planning_agent", "response_synthesis_agent"],
                "target_location": target_port_name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "timeframe": "current",
                "requires_routing": False,
                "route_endpoints": None,
                "requires_pfz": False,
                "requires_risk_assessment": False,
                "reasoning_summary": f"Direct port inquiry and display requested for {target_port_name}.",
                "planning_duration_ms": round((time.time() - start_time) * 1000, 2)
            }

        # Check native heuristic first on original query
        local_plan = llm_client._local_heuristic_json(system_prompt, user_query)
        if local_plan.get("intent") == "general_marine_query":
            # Try normalizing inbound query to English for fallback decomposition
            norm_q, _ = language_service.translate_inbound_query(user_query)
            if norm_q != user_query:
                norm_plan = llm_client._local_heuristic_json(system_prompt, norm_q)
                if norm_plan.get("intent") != "general_marine_query":
                    local_plan = norm_plan

        if local_plan.get("intent") != "general_marine_query" or not llm_client.is_available():
            parsed_plan = local_plan
        else:
            # Optional cloud LLM consultation only when query intent is ambiguous
            parsed_plan = llm_client.generate_json(system_prompt, user_prompt)

        # 2. Multi-turn Intent & Parameter Reconciliation
        # If user asks a short follow-up (e.g. "What about tomorrow?", "और कल?", "Why?"), inherit context
        if chat_history and len(user_query.strip().split()) <= 7:
            prev_user_msgs = [m.get("content", "") for m in chat_history if m.get("role") == "user"]
            if prev_user_msgs:
                prev_text = prev_user_msgs[-1].lower()
                curr_text = user_query.lower()
                
                # Check for temporal follow-up: "and tomorrow?", "और कल?", "उद्या?", "what about tomorrow?"
                is_followup_time = any(w in curr_text for w in ["tomorrow", "कल", "उद्या", "நாளை", "రేపు", "કાલે", "আগামীকাল", "next", "what about", "how about", "aur kal", "aur ", "and "])
                
                if is_followup_time:
                    parsed_plan["timeframe"] = "tomorrow morning"
                    # If previous was fishing or safety, retain safety assessment for tomorrow
                    if any(w in prev_text for w in ["safe", "safety", "सुरक्षित", "धोका", "பாதுகாப்பு", "സുരക്ഷ", "risk", "sail", "fish", "fishing", "मछली", "मासे", "மீன்பிடி"]):
                        parsed_plan["intent"] = "sea_safety_assessment"
                        parsed_plan["requires_risk_assessment"] = True
                        if any(w in prev_text for w in ["fish", "fishing", "मछली", "मासे", "மீன்பிடி"]):
                            parsed_plan["requires_pfz"] = True
                    # If previous was wave or telemetry, set to marine forecast
                    elif any(w in prev_text for w in ["wave", "waves", "लहर", "लाटा", "அலை", "wind", "weather", "हवा", "वारा", "का"]):
                        parsed_plan["intent"] = "marine_forecast"
                        parsed_plan["requires_risk_assessment"] = True
                        
                # Check for causal "why" follow-up: "why?", "why are waves high?", "का वाढल्या?", "क्यों?"
                elif any(w in curr_text for w in ["why", "क्यों", "का", "ஏன்", "ఎందుకు", "কেন", "કેમ"]):
                    if any(w in prev_text or w in curr_text for w in ["wave", "waves", "लहर", "लाटा", "அலை", "rough", "अशांत", "sea", "समुद्र"]):
                        parsed_plan["intent"] = "wave_explanation"
                        parsed_plan["requires_risk_assessment"] = False
                        if "ocean_analytics_agent" not in parsed_plan.get("selected_agents", []):
                            parsed_plan.setdefault("selected_agents", []).append("ocean_analytics_agent")

        # 3. Multi-turn Coordinate Reconciliation (Active conversation context takes precedence when query lacks explicit port)
        intent = parsed_plan.get("intent", "general_marine_query")
        target_name = parsed_plan.get("target_location")
        
        # Check current query first
        resolved = resolve_location_name(user_query)

        # If not resolved in current query, check explicit location_name from session
        if not resolved and location_name:
            resolved = resolve_location_name(location_name)

        # If still not resolved, scan previous turns in chat_history (newest first)
        if not resolved and chat_history:
            for msg in reversed(chat_history):
                txt = msg.get("content", "")
                if txt:
                    past_resolved = resolve_location_name(txt)
                    if past_resolved:
                        resolved = past_resolved
                        break

        lat = settings.DEFAULT_LAT
        lon = settings.DEFAULT_LON
        
        if resolved:
            lat = resolved["lat"]
            lon = resolved["lon"]
            target_name = resolved["name"]
        elif user_location and "lat" in user_location and "lon" in user_location:
            lat = user_location["lat"]
            lon = user_location["lon"]
            target_name = location_name or "Active Nautical Position"
        elif intent in ["greeting", "out_of_domain"]:
            target_name = target_name or "Indian Coastal Waters"
        elif intent in ["marine_knowledge", "project_knowledge"]:
            target_name = target_name or "ORCA Marine Domain"
        elif intent == "port_inquiry":
            target_name = target_name or "Indian Coastal Ports Network"
        elif not target_name or target_name == "None":
            target_name = location_name or "Cochin Port (Kochi)"

        parsed_plan["coordinates"] = {"latitude": lat, "longitude": lon}
        parsed_plan["target_location"] = target_name

        # Ensure response synthesis agent is always included at the end
        if "response_synthesis_agent" not in parsed_plan.get("selected_agents", []):
            parsed_plan["selected_agents"].append("response_synthesis_agent")

        duration_ms = round((time.time() - start_time) * 1000, 2)
        parsed_plan["planning_duration_ms"] = duration_ms

        return parsed_plan

planning_agent = PlanningAgent()
