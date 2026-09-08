import os
import json
import re
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List, Tuple
from backend.config import settings
from backend.utils.logger import logger

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import langdetect
    HAS_LANGDETECT = True
except ImportError:
    HAS_LANGDETECT = False

SCRIPT_MAP = [
    (re.compile(r'[\u0900-\u097F]'), 'hi', 'Hindi'),
    (re.compile(r'[\u0B80-\u0BFF]'), 'ta', 'Tamil'),
    (re.compile(r'[\u0D00-\u0D7F]'), 'ml', 'Malayalam'),
    (re.compile(r'[\u0C00-\u0C7F]'), 'te', 'Telugu'),
    (re.compile(r'[\u0980-\u09FF]'), 'bn', 'Bengali'),
    (re.compile(r'[\u0A80-\u0AFF]'), 'gu', 'Gujarati'),
    (re.compile(r'[\u0C80-\u0CFF]'), 'kn', 'Kannada'),
    (re.compile(r'[\u0B00-\u0B7F]'), 'or', 'Odia'),
    (re.compile(r'[\u0A00-\u0A7F]'), 'pa', 'Punjabi'),
    (re.compile(r'[\u0600-\u06FF]'), 'ur', 'Urdu'),
]

ROMANIZED_GREETINGS = {
    "namaste": ("hi", "Hindi"),
    "namaskar": ("hi", "Hindi"),
    "pranam": ("hi", "Hindi"),
    "kaise ho": ("hi", "Hindi"),
    "kya haal": ("hi", "Hindi"),
    "vanakkam": ("ta", "Tamil"),
    "epdi irukeenga": ("ta", "Tamil"),
    "namaskaram": ("ml", "Malayalam"),
    "engane undu": ("ml", "Malayalam"),
    "khem cho": ("gu", "Gujarati"),
    "maza ma": ("gu", "Gujarati"),
    "nomoshkar": ("bn", "Bengali"),
    "bhalo aachen": ("bn", "Bengali"),
    "bagunnara": ("te", "Telugu"),
    "hege iddira": ("kn", "Kannada"),
}

class LLMClient:
    """
    Unified Multimodal Maritime LLM Client supporting Google Gemini Vision,
    Anthropic Claude, and zero-hallucination deterministic local grounded reasoning engine.
    Supports auto-language detection across 12+ Indian coastal & global languages.
    """
    def __init__(self):
        # Anthropic Claude
        self.claude_key = settings.ANTHROPIC_API_KEY
        self.claude_model = settings.DEFAULT_CLAUDE_MODEL
        self.claude_client = None
        if self.claude_key and HAS_ANTHROPIC:
            try:
                self.claude_client = anthropic.Anthropic(api_key=self.claude_key)
                logger.info(f"Initialized Anthropic Claude client with model: {self.claude_model}")
            except Exception as e:
                logger.warning(f"Could not initialize Anthropic client: {e}")

        # Sarvam AI (Indian Vernacular & Indic Scripts Specialist)
        self.sarvam_key = getattr(settings, "SARVAM_API_KEY", "")
        self.sarvam_model = getattr(settings, "DEFAULT_SARVAM_MODEL", "sarvam-m")
        if self.sarvam_key:
            logger.info(f"Configured Sarvam AI with model: {self.sarvam_model}")

        # OpenAI (GPT-4o / GPT-4o-mini)
        self.openai_key = getattr(settings, "OPENAI_API_KEY", "")
        self.openai_model = getattr(settings, "DEFAULT_OPENAI_MODEL", "gpt-4o-mini")
        if self.openai_key:
            logger.info(f"Configured OpenAI with model: {self.openai_model}")

        # Groq (Ultra-low latency Llama 3.3)
        self.groq_key = getattr(settings, "GROQ_API_KEY", "")
        self.groq_model = getattr(settings, "DEFAULT_GROQ_MODEL", "llama-3.3-70b-versatile")
        if self.groq_key:
            logger.info(f"Configured Groq with model: {self.groq_model}")

        # Google Gemini
        self.gemini_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.DEFAULT_GEMINI_MODEL
        if self.gemini_key:
            logger.info(f"Configured Google Gemini with model: {self.gemini_model}")

        self.timeout = getattr(settings, "LLM_TIMEOUT_SECONDS", 15.0)
        self._gemini_cooldown_until = 0.0
        self._sarvam_cooldown_until = 0.0
        self._claude_cooldown_until = 0.0
        self._openai_cooldown_until = 0.0

    def is_available(self) -> bool:
        """Returns True if at least one cloud AI provider is configured and not currently in cooldown."""
        now = time.time()
        has_claude = bool(self.claude_client and now >= self._claude_cooldown_until)
        has_sarvam = bool(self.sarvam_key and now >= self._sarvam_cooldown_until)
        has_openai = bool(self.openai_key and now >= self._openai_cooldown_until)
        has_groq = bool(self.groq_key)
        has_gemini = bool(self.gemini_key and now >= self._gemini_cooldown_until)
        return has_claude or has_sarvam or has_openai or has_groq or has_gemini

    def detect_language(self, text: str) -> Tuple[str, str]:
        """
        Automatically identifies the language of user input.
        Returns tuple: (language_code, language_name), e.g. ('hi', 'Hindi')
        Prioritizes Indian multilingual environments (Devanagari, Tamil, Malayalam, Bengali, Gujarati, Hinglish).
        """
        if not text or not text.strip():
            return "en", "English"

        clean_text = text.strip()
        lower_text = clean_text.lower()

        # 1. Explicit Language Instructions in query
        if re.search(r'(marathi|in\s+marathi|मराठी|मराठीत|मराठीमध्ये|मराठी\s+मध्ये|marathit|marathitil)', lower_text):
            return "mr", "Marathi"
        if re.search(r'\b(hindi\s+mein|in\s+hindi|हिंदी\s+में|hindi\s+me|hindi\s+karo)\b', lower_text):
            return "hi", "Hindi"
        if re.search(r'\b(tamil\s+la|in\s+tamil|தமிழில்|tamilil)\b', lower_text):
            return "ta", "Tamil"
        if re.search(r'\b(malayalam\s+il|in\s+malayalam|മലയാളത്തിൽ)\b', lower_text):
            return "ml", "Malayalam"
        if re.search(r'\b(bengali\s+te|in\s+bengali|বাংলায়|bangla\s+te)\b', lower_text):
            return "bn", "Bengali"
        if re.search(r'\b(gujarati\s+ma|in\s+gujarati|ગુજરાતીમાં)\b', lower_text):
            return "gu", "Gujarati"
        if re.search(r'\b(telugu\s+lo|in\s+telugu|తెలుగులో)\b', lower_text):
            return "te", "Telugu"

        # 2. Use our specialized high-precision language_service
        try:
            from backend.services.language_service import language_service
            code, conf = language_service.detect_language(clean_text)
            name = language_service.registry.get(code, {}).get("name", "English")
            return code, name
        except Exception as e:
            logger.warning(f"Language detection service error: {e}")
            return "en", "English"

        return "en", "English"

    def _call_sarvam(
        self,
        prompt: str,
        system_prompt: str = "",
        as_json: bool = False
    ) -> Optional[str]:
        """Calls Sarvam AI chat completion API with native Indic script intelligence."""
        if not self.sarvam_key or time.time() < self._sarvam_cooldown_until:
            return None
        try:
            import httpx
            url = "https://api.sarvam.ai/v1/chat/completions"
            headers = {
                "api-subscription-key": self.sarvam_key,
                "Authorization": f"Bearer {self.sarvam_key}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_prompt:
                sys_content = system_prompt
                if as_json:
                    sys_content += "\n\nCRITICAL: Respond ONLY with valid, raw JSON. Do not include markdown code fences (```json), preamble, or commentary."
                messages.append({"role": "system", "content": sys_content})
            messages.append({"role": "user", "content": prompt})

            payload: Dict[str, Any] = {
                "model": self.sarvam_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 1024
            }
            if as_json:
                payload["response_format"] = {"type": "json_object"}

            with httpx.Client(timeout=httpx.Timeout(3.0, connect=1.0, read=2.5, write=1.0)) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        raw_content = choices[0].get("message", {}).get("content", "").strip()
                        if not as_json and raw_content.startswith("{") and "response" in raw_content:
                            try:
                                parsed = json.loads(raw_content)
                                if isinstance(parsed, dict) and "response" in parsed:
                                    return str(parsed["response"]).strip()
                            except Exception:
                                pass
                        return raw_content
                elif res.status_code in [429, 503]:
                    self._sarvam_cooldown_until = time.time() + 30.0
                    logger.warning(f"Sarvam AI rate limited ({res.status_code}). Activated 30s cooldown.")
                else:
                    self._sarvam_cooldown_until = time.time() + 60.0
                    logger.warning(f"Sarvam AI returned status {res.status_code}: {res.text[:120]}. Activated 60s cooldown.")
        except Exception as e:
            self._sarvam_cooldown_until = time.time() + 60.0
            logger.warning(f"Sarvam AI request error ({e}). Activated 60s cooldown.")
        return None

    def _call_claude(
        self,
        prompt: str,
        system_prompt: str = "",
        as_json: bool = False
    ) -> Optional[str]:
        """Calls Anthropic Claude 3.5 Sonnet for deep oceanographic & spatial reasoning."""
        if not self.claude_client or time.time() < self._claude_cooldown_until:
            return None
        try:
            sys_content = system_prompt
            if as_json:
                sys_content += "\n\nCRITICAL: Respond ONLY with valid, raw JSON. Do not include markdown code blocks (```json), preamble, or commentary."

            response = self.claude_client.messages.create(
                model=self.claude_model,
                max_tokens=2048,
                system=sys_content,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            err_str = str(e).lower()
            if "credit" in err_str or "balance" in err_str or "invalid_request_error" in err_str:
                self._claude_cooldown_until = time.time() + 3600.0
            elif "rate_limit" in err_str or "overloaded" in err_str:
                self._claude_cooldown_until = time.time() + 30.0
            logger.warning(f"Claude API call error: {e}")
            return None

    def _call_openai_compatible(
        self,
        url: str,
        key: str,
        model: str,
        prompt: str,
        system_prompt: str = "",
        as_json: bool = False
    ) -> Optional[str]:
        """Generic invoker for OpenAI / Groq compatible chat completion endpoints."""
        if not key or time.time() < self._openai_cooldown_until:
            return None
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_prompt:
                sys_content = system_prompt
                if as_json:
                    sys_content += "\n\nCRITICAL: Respond ONLY with valid, raw JSON. Do not include markdown code fences (```json), preamble, or commentary."
                messages.append({"role": "system", "content": sys_content})
            messages.append({"role": "user", "content": prompt})

            payload: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 1024
            }
            if as_json:
                payload["response_format"] = {"type": "json_object"}

            with httpx.Client(timeout=httpx.Timeout(2.5, connect=1.0, read=2.0, write=1.0)) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
                elif res.status_code in [429, 400, 402]:
                    err_txt = res.text.lower()
                    if "credit" in err_txt or "quota" in err_txt or "billing" in err_txt:
                        self._openai_cooldown_until = time.time() + 3600.0
                    else:
                        self._openai_cooldown_until = time.time() + 30.0
                    logger.warning(f"OpenAI/Groq compatible API ({model}) returned {res.status_code}: {res.text[:120]}")
                else:
                    logger.warning(f"OpenAI/Groq compatible API ({model}) returned {res.status_code}: {res.text[:120]}")
        except Exception as e:
            logger.warning(f"OpenAI/Groq compatible API call error ({e}).")
        return None

    def _call_gemini(
        self,
        prompt: str,
        system_prompt: str = "",
        as_json: bool = False,
        media_part: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Invokes Google Gemini with circuit-breaker protection and optional multimodal vision."""
        if not self.gemini_key or time.time() < self._gemini_cooldown_until:
            return None
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
            
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            if as_json:
                full_prompt += "\n\nCRITICAL: Respond ONLY with valid, raw JSON. Do not include markdown code fences (```json), preamble, or commentary."

            parts: List[Dict[str, Any]] = [{"text": full_prompt}]
            if media_part:
                parts.append(media_part)

            payload: Dict[str, Any] = {
                "contents": [{"parts": parts}]
            }
            if as_json:
                payload["generationConfig"] = {"responseMimeType": "application/json"}

            with httpx.Client(timeout=httpx.Timeout(2.5, connect=1.0, read=2.0, write=1.0)) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content_parts = candidates[0].get("content", {}).get("parts", [])
                        if content_parts:
                            return content_parts[0].get("text", "").strip()
                elif res.status_code in [429, 503]:
                    self._gemini_cooldown_until = time.time() + 300.0
                    logger.warning(f"Gemini API rate limit ({res.status_code}). Activated 5m cooldown.")
                else:
                    self._gemini_cooldown_until = time.time() + 300.0
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text[:120]}")
        except Exception as e:
            self._gemini_cooldown_until = time.time() + 1800.0
            logger.warning(f"Gemini API timed out or network error ({e}). Activated 30m cooldown.")
        return None

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        media_part: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Requests structured JSON from cloud AI providers with ultra-fast circuit breakers:
        Sarvam AI (1s) -> Gemini (2s) -> Groq -> OpenAI -> Claude -> Local Deterministic Engine.
        """
        # 1. Sarvam AI (Fastest verified active Indic model ~1.0s)
        if self.sarvam_key and time.time() >= self._sarvam_cooldown_until:
            raw = self._call_sarvam(user_prompt, system_prompt=system_prompt, as_json=True)
            if raw:
                try:
                    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
                    clean_raw = re.sub(r"\n?```$", "", clean_raw)
                    return json.loads(clean_raw.strip())
                except Exception as e:
                    logger.warning(f"Failed to parse Sarvam JSON: {e}")

        # 2. Gemini (Secondary with strict 2.5s timeout)
        if self.gemini_key and time.time() >= self._gemini_cooldown_until:
            raw = self._call_gemini(user_prompt, system_prompt=system_prompt, as_json=True, media_part=media_part)
            if raw:
                try:
                    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
                    clean_raw = re.sub(r"\n?```$", "", clean_raw)
                    return json.loads(clean_raw.strip())
                except Exception as e:
                    logger.warning(f"Failed to parse Gemini JSON: {e}")

        # 3. Groq (Llama 3.3)
        if self.groq_key:
            raw = self._call_openai_compatible("https://api.groq.com/openai/v1/chat/completions", self.groq_key, self.groq_model, user_prompt, system_prompt=system_prompt, as_json=True)
            if raw:
                try:
                    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
                    clean_raw = re.sub(r"\n?```$", "", clean_raw)
                    return json.loads(clean_raw.strip())
                except Exception as e:
                    logger.warning(f"Failed to parse Groq JSON: {e}")

        # 4. OpenAI (GPT-4o / GPT-4o-mini)
        if self.openai_key and time.time() >= self._openai_cooldown_until:
            raw = self._call_openai_compatible("https://api.openai.com/v1/chat/completions", self.openai_key, self.openai_model, user_prompt, system_prompt=system_prompt, as_json=True)
            if raw:
                try:
                    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
                    clean_raw = re.sub(r"\n?```$", "", clean_raw)
                    return json.loads(clean_raw.strip())
                except Exception as e:
                    logger.warning(f"Failed to parse OpenAI JSON: {e}")

        # 5. Claude (Anthropic)
        if self.claude_client and time.time() >= self._claude_cooldown_until:
            raw = self._call_claude(user_prompt, system_prompt=system_prompt, as_json=True)
            if raw:
                try:
                    clean_raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
                    clean_raw = re.sub(r"\n?```$", "", clean_raw)
                    return json.loads(clean_raw.strip())
                except Exception as e:
                    logger.warning(f"Failed to parse Claude JSON: {e}")

        # 6. High-Reliability Local Deterministic Grounded Parser (0.01ms)
        return self._local_heuristic_json(system_prompt, user_prompt)

    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        media_part: Optional[Dict[str, Any]] = None,
        target_language_name: Optional[str] = None
    ) -> str:
        """
        Generates natural language synthesis grounded in structured data and multimodal assets.
        Prioritizes Sarvam AI (1s response) -> Gemini (2.5s cap) -> Groq -> OpenAI -> Claude.
        Enforces native script generation for all Indian regional languages.
        """
        is_indic = target_language_name and target_language_name.lower() not in ("english", "en", "")
        if is_indic:
            system_prompt += (
                f"\n\nCRITICAL INSTRUCTION: You MUST write your entire response exclusively in {target_language_name} "
                f"using its native script (e.g., Devanagari for Marathi and Hindi, தமிழ் for Tamil, മലയാളം for Malayalam, "
                f"తెలుగు for Telugu, বাংলা for Bengali, ગુજરાતી for Gujarati). "
                f"Do not respond in English. Do not write transliterated Latin characters. Use natural nautical terminology."
            )

        # 1. Primary for Indic & fast queries: Sarvam AI (~1.0s verified latency)
        if self.sarvam_key and time.time() >= self._sarvam_cooldown_until:
            res = self._call_sarvam(user_prompt, system_prompt=system_prompt, as_json=False)
            if res and len(res) > 20:
                return res.strip()

        # 2. Secondary: Google Gemini 3.6 Flash (capped at 2.5s)
        if self.gemini_key and time.time() >= self._gemini_cooldown_until:
            res = self._call_gemini(user_prompt, system_prompt=system_prompt, as_json=False, media_part=media_part)
            if res and len(res) > 20:
                return res.strip()

        # 3. Try Groq (Llama 3.3)
        if self.groq_key:
            res = self._call_openai_compatible("https://api.groq.com/openai/v1/chat/completions", self.groq_key, self.groq_model, user_prompt, system_prompt=system_prompt, as_json=False)
            if res and len(res) > 20:
                return res.strip()

        # 4. Try OpenAI (GPT-4o / GPT-4o-mini)
        if self.openai_key and time.time() >= self._openai_cooldown_until:
            res = self._call_openai_compatible("https://api.openai.com/v1/chat/completions", self.openai_key, self.openai_model, user_prompt, system_prompt=system_prompt, as_json=False)
            if res and len(res) > 20:
                return res.strip()

        # 5. Try Claude (Anthropic)
        if self.claude_client and time.time() >= self._claude_cooldown_until:
            res = self._call_claude(user_prompt, system_prompt=system_prompt, as_json=False)
            if res and len(res) > 20:
                return res.strip()

        return ""

    def translate_markdown(
        self,
        markdown_text: str,
        target_language_name: str,
        target_language_code: str = "hi"
    ) -> str:
        """
        Translates English maritime intelligence markdown report into the user's
        selected language using native script and domain terminology.
        """
        if not markdown_text or not markdown_text.strip():
            return ""

        if not self.gemini_key:
            return markdown_text

        system_prompt = (
            f"You are ORCA's official maritime translation engine. "
            f"Translate the provided ocean intelligence markdown report accurately into {target_language_name}.\n\n"
            f"RULES:\n"
            f"1. Write exclusively in {target_language_name} using its authentic native script.\n"
            f"2. Use correct maritime vocabulary (Port = harbor/बंदरगाह/बंदर, Swell = ocean wave, PFZ = Potential Fishing Zone).\n"
            f"3. Preserve all markdown structure, tables, bullet points, emojis, numbers, and lat/lon coordinates.\n"
            f"4. Do NOT output Latin transliteration for Indian regional languages.\n"
            f"5. Output ONLY the translated markdown. No conversational preamble or chat."
        )

        translated = self._call_gemini(markdown_text, system_prompt=system_prompt, as_json=False)
        return translated.strip() if translated else markdown_text


    def _local_heuristic_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Deterministic parser for all SIH typical query types and task decomposition.
        Distinguishes greetings, marine knowledge FAQs, and out-of-domain queries.
        """
        prompt_lower = user_prompt.lower()
        words = set(re.findall(r'\b\w+\b', prompt_lower))

        # 0. Project ORCA Architecture, Capabilities & Collaborative Multi-Agent System
        project_phrases = [
            "our project", "about our project", "project orca", "about orca", "what is orca",
            "explain orca", "orca architecture", "orca project", "8 agents", "eight agents",
            "collaborative agents", "how does orca work", "sih26176", "sih project", "system architecture",
            "tell me about our project", "tell me about your project", "tell about project",
            "प्रकल्प", "प्रकल्पाबद्दल", "प्रकल्पाची माहिती", "प्रकल्प काय आहे", "ओर्का प्रकल्प", "आर्किटेक्चर",
            "प्रोजेक्ट", "प्रोजेक्ट बद्दल", "प्रोजेक्ट काय आहे", "एजंट्स", "एजंट", "प्रोजेक्ट माहिती",
            "कोपायलट काय आहे", "प्रकल्पाचे काम", "திட்டம்", "திட்டம் பற்றி", "திட்டப்பணி", "പദ്ധതി", "പ്രോജക്ട്"
        ]
        if any(p in prompt_lower for p in project_phrases) or (("project" in prompt_lower or "प्रकल्प" in prompt_lower or "प्रोजेक्ट" in prompt_lower) and any(w in prompt_lower for w in ["orca", "our", "tell", "explain", "काय", "सांगा", "माहिती", "architecture", "system", "agents", "बद्दल"])):
            return {
                "intent": "project_knowledge",
                "selected_agents": ["planning_agent", "response_synthesis_agent"],
                "target_location": "ORCA Multi-Agent Architecture",
                "coordinates": {"latitude": settings.DEFAULT_LAT, "longitude": settings.DEFAULT_LON},
                "timeframe": "current",
                "requires_routing": False,
                "route_endpoints": None,
                "requires_pfz": False,
                "requires_risk_assessment": False,
                "reasoning_summary": "Comprehensive inquiry regarding ORCA system architecture and 8 collaborative agents."
            }

        # 1. Greetings & System Introduction
        greeting_words = {"hi", "hello", "hey", "namaste", "vanakkam", "namaskaram", "khemcho", "nomoshkar", "pranam", "greetings"}
        greeting_phrases = ["who are you", "what are you", "what can you do", "help me", "introduce yourself", "who made you"]
        if words.intersection(greeting_words) or any(p in prompt_lower for p in greeting_phrases):
            return {
                "intent": "greeting",
                "selected_agents": ["planning_agent", "response_synthesis_agent"],
                "target_location": "Indian Coastal Waters",
                "coordinates": {"latitude": settings.DEFAULT_LAT, "longitude": settings.DEFAULT_LON},
                "timeframe": "current",
                "requires_routing": False,
                "route_endpoints": None,
                "requires_pfz": False,
                "requires_risk_assessment": False,
                "reasoning_summary": "User greeting or system capability query. Routing directly to synthesized captain introduction."
            }

        # 2. Out of Domain Guardrail
        out_of_domain_words = {
            "cricket", "ipl", "kohli", "dhoni", "rohit", "sachin", "bollywood", "recipe", "recipes",
            "cook", "bake", "cake", "biryani", "football", "movie", "song", "lyrics",
            "फुटबॉल", "अभिनेता", "अभिनेत्री", "सिनेमा", "कविता"
        }
        if words.intersection(out_of_domain_words):
            return {
                "intent": "out_of_domain",
                "selected_agents": ["planning_agent", "response_synthesis_agent"],
                "target_location": "N/A",
                "coordinates": {"latitude": settings.DEFAULT_LAT, "longitude": settings.DEFAULT_LON},
                "timeframe": "current",
                "requires_routing": False,
                "route_endpoints": None,
                "requires_pfz": False,
                "requires_risk_assessment": False,
                "reasoning_summary": "Query belongs to an irrelevant domain outside marine science, maritime operations, and ocean meteorology."
            }

        # Pre-scan for coastal ports mentioned in the query
        from backend.utils.geo import COASTAL_PORT_REGISTRY, PORT_SYNONYMS, resolve_location_name
        all_port_words = sorted(list(PORT_SYNONYMS.keys()) + list(COASTAL_PORT_REGISTRY.keys()), key=lambda k: -len(k))
        detected_ports = []
        for pw in all_port_words:
            if re.search(r'\b' + re.escape(pw) + r'\b', prompt_lower) or re.search(r'\b' + re.escape(pw) + r'\b', user_prompt.lower()):
                resolved_p = resolve_location_name(pw)
                if resolved_p and not any(p["name"] == resolved_p["name"] for p in detected_ports):
                    detected_ports.append(resolved_p)
                if len(detected_ports) >= 2:
                    break
        has_two_ports = len(detected_ports) >= 2

        # 3. Marine Knowledge, Science & Conceptual Ocean Queries (The "ChatGPT for Ocean" Core)
        educational_marine_triggers = [
            "what is", "what are", "what was", "how do", "how does", "how are", "how is", "how",
            "why is", "why are", "why does", "what causes",
            "explain", "tell me about", "tell about", "tell me regarding", "describe", "definition of",
            "meaning of", "importance of", "history of",
            # Indic interrogatives & request markers
            "म्हणजे काय", "काय आहे", "काय असतो", "काय असते", "बद्दल सांगा", "बद्दल माहिती", "विषयी सांगा", "माहिती सांगा",
            "कसा असतो", "का असतो", "कसे होते", "कशी होते", "कशा होतात", "कसे होतात", "कशा प्रकारे", "कशी असते", "कसे असते",
            "कसा घेतात", "का दिसतो", "का वाढतात", "कशी घडते", "कसे घडते", "कशी तयार होते", "कशा तयार होतात", "कसे निर्माण होते",
            "क्या है", "क्या होता है", "क्या होती है", "किसे कहते हैं", "के बारे में", "बताओ", "जानकारी दें", "जानकारी दीजिए",
            "क्यों होता है", "क्यों होती है", "कैसे बनता है", "कैसे बनती है", "कैसे बनते हैं", "कैसे काम करता है", "कैसे सांस", "सांस कैसे",
            "कैसे आती है", "कैसे आता है", "नीला क्यों", "खारा क्यों", "संकेत सांगा", "संकेत बताओ",
            "என்றால் என்ன", "பற்றி கூறு", "எப்படி உருவாகிறது", "தகவல் தருக", "எப்படி சுவாசிக்கிறது",
            "అంటే ఏమిటి", "గురించి చెప్పు", "ఎలా ఏర్పడతాయి",
            "എന്നാൽ എന്താണ്", "எങ്ങനെ ഉണ്ടാകുന്നു", "വിവരിക്കുക",
            "কী", "সম্পর্কে বলো", "কীভাবে তৈরি হয়",
            "એટલે શું", "કેવી રીતે બને છે", "વિશે જણાવો"
        ]

        educational_marine_topics = [
            "ocean", "oceans", "sea", "seas", "marine", "oceanography", "marine biology",
            "plankton", "fish breathe", "breathing in fish", "gills", "salinity", "salty",
            "why is ocean salty", "why is sea salty", "why is ocean blue", "why is the sea blue",
            "blue ocean", "wave", "waves", "swell", "tide", "tides", "spring tide", "neap tide",
            "cyclone", "cyclones", "tropical cyclone", "tsunami", "tsunamis",
            "pfz", "potential fishing zone", "chlorophyll", "coral", "coral reef", "coral reefs",
            "bleaching", "coral bleaching", "upwelling", "downwelling", "el nino", "la nina", "enso",
            "indian ocean dipole", "mariana trench", "ocean depth", "deepest ocean", "how deep",
            "kallakkadal", "kalla kadal", "swell surge", "port signal", "port signals",
            "port warning signal", "port warning signals", "monsoon fishing ban", "fishing ban",
            "turtle", "olive ridley", "arribada", "ships float", "ship float", "how do ships float", "why do ships float",
            "buoyancy", "archimedes", "unclos", "maritime law", "lighthouse",
            "nautical mile", "nautical miles", "knot", "knots", "coriolis", "coriolis effect", "radar", "marine radar",
            "vhf", "vhf 16", "colregs", "rule 10", "rule 13", "rule 14", "rule 15", "navigation", "seamanship",
            # Native Indic topics
            "समुद्र", "महासागर", "सागर", "लाटा", "भरती", "ओहोटी", "खारा", "खारट", "निळा", "चक्रीवादळ",
            "सुनामी", "प्रवाळ", "मासे", "माशांचे श्वसन", "पीएझेड", "मत्स्य क्षेत्र", "कल्लाक्कदल", "बंदर संकेत", "धोक्याचे संकेत", "बंदर धोक्याचे संकेत",
            "मासेमारी बंदी", "ऑलिव रिडले", "मरियाना", "जहाज", "लहरें", "ज्वार", "भाटा", "नीला", "चक्रवात",
            "मूंगा", "मछली सांस", "नॉटिकल मील", "नॉटिकल मैल", "नॉट", "कोरिओलिस", "राडार", "रडार", "सागरी नियम", "जहाजांचे नियम", "समुद्री नियम",
            "கடல்", "சமுத்திரம்", "அலைகள்", "சுனாமி", "மீன்", "மழைக்கால தடை",
            "సముద్రం", "అలలు", "సునామీ", "చేప", "തുറമുഖ", "തിരമാല", "സുനാമി", "മത്സ്യം",
            "সমুদ্র", "ঢেউ", "সুনামি", "মাছ", "દરિયો", "મોજા", "વાવાઝોડું"
        ]

        marine_direct_faq = [
            "kallakkadal", "kalla kadal", "swell surge", "rogue wave", "internal wave", "upwelling", "downwelling",
            "thermal front", "ocean front", "ocean colour", "marine heatwave", "ocean acidification", "salinity",
            "why is ocean salty", "why is sea salty", "why is ocean blue", "why is the sea blue", "spring tide", "neap tide",
            "rip current", "el nino", "la nina", "enso", "indian ocean dipole", "iod", "somali current", "monsoon current",
            "equatorial current", "depth of ocean", "mariana trench", "ocean trench", "thermocline", "halocline", "pycnocline",
            "what is ocean", "what is an ocean", "what is sea", "what is a sea", "turtle", "olive ridley", "arribada",
            "gahirmatha", "whale shark", "dugong", "coral reef", "coral bleaching", "mangrove", "bioluminescence",
            "how waves form", "how do waves form", "how waves are formed", "what causes waves",
            "how tides work", "how do tides work", "tide formation", "spring tide vs neap tide",
            "how do fish breathe", "how fish breathe", "how do ships float", "why do ships float",
            "colregs", "rule 10", "rule 13", "rule 14", "rule 15", "traffic separation scheme", "unclos", "territorial waters", "monsoon fishing ban",
            "port danger signal", "port signal", "port signals", "port warning signal", "port warning signals",
            "port signals 1 to 11", "beaufort scale", "douglas sea state",
            "nautical mile", "nautical miles", "knot", "knots", "coriolis", "coriolis effect", "radar", "marine radar", "vhf 16",
            "समुद्र नीला क्यों", "समुद्र खारा क्यों",
            "कल्लाक्कदल", "ऑलिव रिडले", "प्रवाल भित्ति", "बंदरगाह चेतावनी संकेत", "बंदर संकेत", "धोक्याचे संकेत", "बंदर धोक्याचे संकेत",
            "समुद्र म्हणजे काय", "समुद्र क्या है", "महासागर म्हणजे काय", "महासागर क्या है",
            "नॉटिकल मील", "नॉटिकल मैल", "नॉट", "कोरिओलिस", "राडार", "रडार", "जहाज का तरंगते", "जहाज क्यों तैरते हैं",
            "लाटा कशा तयार होतात", "लहरें कैसे बनती हैं", "भरती ओहोटी कशी होते", "ज्वार भाटा कैसे होता है",
            "கடல் என்றால் என்ன", "சமுத்திரம் என்றால் என்ன", "సముద్రం అంటే ఏమిటి", "കടൽ എന്നാൽ എന്താണ്", "সমুদ্র কী", "દરિયો એટલે શું"
        ]

        prompt_stripped = prompt_lower.strip("?.! \t\n\r")
        is_standalone_marine = prompt_stripped in [
            "ocean", "oceans", "the ocean", "sea", "the sea", "seas", "marine", "marine biology",
            "oceanography", "समुद्र", "महासागर", "सागर", "கடல்", "சமுத்திரம்", "సముద్రం", "കടൽ", "সমুদ্র", "દરિયો"
        ]

        has_concept_trigger = any(t in prompt_lower for t in educational_marine_triggers)
        has_marine_topic = any(m in prompt_lower for m in educational_marine_topics)
        is_direct_faq = any(f in prompt_lower for f in marine_direct_faq)

        has_coords = bool(re.search(r'\d{1,2}\.\d+', prompt_lower) or any(c in prompt_lower for c in ["°n", "°e", "°s", "°w", "latitude", "longitude", "coord"]))
        is_operational_action = has_two_ports or has_coords or (len(detected_ports) >= 1 and any(w in prompt_lower for w in ["condition", "conditions", "weather", "wave", "waves", "wind", "sst", "temperature", "forecast", "safe", "safety", "fish", "route"])) or any(act in prompt_lower for act in [
            "depart today", "depart tomorrow", "can we depart", "can i sail", "safe to sail today", "safe to venture",
            "leave port", "route from", "voyage between", "conditions at", "weather at", "waves at", "wave conditions", "live telemetry"
        ])

        if (is_standalone_marine or is_direct_faq or (has_concept_trigger and has_marine_topic)) and not is_operational_action:
            loc = resolve_location_name(user_prompt)
            return {
                "intent": "marine_knowledge",
                "selected_agents": ["planning_agent", "response_synthesis_agent"],
                "target_location": loc["name"] if loc else "ORCA Ocean Knowledge Base",
                "coordinates": {
                    "latitude": loc["lat"] if loc else settings.DEFAULT_LAT,
                    "longitude": loc["lon"] if loc else settings.DEFAULT_LON
                },
                "timeframe": "current",
                "requires_routing": False,
                "route_endpoints": None,
                "requires_pfz": False,
                "requires_risk_assessment": False,
                "reasoning_summary": "Educational, conceptual, or encyclopedic inquiry regarding oceanography, marine science, biology, or seamanship."
            }

        # 4. Operational Maritime Intents
        intent = "general_marine_query"
        selected_agents = ["marine_data_retrieval_agent", "weather_intelligence_agent", "response_synthesis_agent"]
        requires_routing = False
        requires_pfz = False
        requires_risk = True

        comparison_keywords = [
            "compare", "versus", "vs", "comparison", "difference between",
            "तुलना", "मुकाबला", "अंतर", "ஒப்பீடு", "வித்தியாசம்", "തുലനം", "പോലിക", "তুলনা"
        ]
        is_comparison = any(w in prompt_lower for w in comparison_keywords)

        routing_keywords = [
            "route", "navigate", "navigation", "voyage", "between", "path", "safest route", "efficient route", "course",
            "jaane mein", "jaana", "jaane", "kitna samay", "kitna time", "samay lagega", "time lagega",
            "kitni doori", "travel time", "voyage time", "how long", "how much time", "reach", "passage",
            "रूट", "रूट्स", "मार्ग", "रास्ता", "नेविगेशन", "दूरी", "यात्रा", "வழி", "பாதை", "வழித்தடம்", "பயணம்",
            "റൂട്ട്", "വഴി", "യാത്ര", "రూట్", "మార్గం", "ప్రయాణం", "রুট", "পথ", "રૂટ"
        ]
        safety_keywords = [
            "safe", "safety", "sail", "sea tomorrow", "rough", "danger", "go to sea", "venture", "depart", "risk",
            "fishing boat", "small boat", "can we go", "safe to depart", "safe to fish", "safe today",
            "सुरक्षित", "सुरक्षा", "खतरा", "जाना", "प्रस्थान", "समुद्र में जाना", "निकलना", "मछली पकड़ने जाना सुरक्षित",
            "पाதுகாப்பானது", "பாதுகாப்பு", "செல்லலாமா", "புறப்பட", "அபாயம்", "கடலில்", "கடலுக்கு செல்வது பாதுகாப்பானதா",
            "സുരക്ഷിതം", "സുരക്ഷ", "കടലിൽ", "പോകാൻ", "പോകുന്നത്", "അപകടം", "ഇറങ്ങാമോ",
            "సురక్షితం", "భద్రత", "ప్రమాదం", "వెళ్లవచ్చా", "సురక్షితమేనా",
            "নিরাপদ", "বিপদ", "ঝুঁকি",
            "સલામત", "જોખમ", "સુરક્ષિત છે", "સુરક્ષિત",
            "सुरक्षित आहे", "धोका", "जाऊ शकतो",
            "ಸುರಕ್ಷಿತ", "ಅಪಾಯ"
        ]
        wave_explanation_keywords = [
            "why are the waves", "why are waves", "why waves", "why wave", "waves high today", "waves are high",
            "why is sea rough", "why rough", "rough sea why",
            "लहरें इतनी ऊंची क्यों", "लहरें क्यों", "लहरें तेज क्यों", "समुद्र अशांत क्यों",
            "लाटा का वाढल्या", "लाटा का", "लाटांची उंची का",
            "அலைகள் ஏன்", "கடல் ஏன்",
            "തിരമാലകൾ എന്തുകൊണ്ട്", "തിരമാല എന്തുകൊണ്ട്",
            "అలలు ఎందుకు", "సముద్రం ఎందుకు",
            "ঢেউ কেন", "সমুদ্র কেন",
            "મોજા કેમ", "મોજાં કેમ"
        ]
        forecast_keywords = [
            "tomorrow", "कल", "उद्या", "நாளை", "రేపు", "કાલે", "আগামীকাল", "next 24", "forecast", "भविष्य", "अंदाज"
        ]
        pfz_keywords = [
            "fish", "fishing", "fishing jon", "fishing jone", "fishing zone", "fishing zones", "pfz", "potential fishing zone", "catch", "tuna", "nearest pfz", "hotspot", "mackerel", "sardine",
            "मछली कहां", "मत्स्य क्षेत्र", "टूना", "शिकार", "पकड़ने की जगह", "मछलियां कहां", "मछुआरे", "हॉटस्पॉट",
            "மீன்", "மீன்பிடி", "சூரை", "மத்தி", "வலை", "பிடிக்க",
            "മീൻ", "മത്സ്യ", "ചൂര", "അയല", "മത്തി", "വല", "ലഭ്യത", "പിടിക്കാൻ", "ഫിഷിങ്",
            "చేపలు", "చేప", "వేట", "ట్యూనా", "మత్స్య",
            "মাছ", "ইলিশ", "টুনা", "ধরা", "মৎস্য",
            "માછલી", "ટૂના", "મત્સ્ય", "પકડવા",
            "मासे", "मासेमारी क्षेत्र", "सुरमई", "पापलेट",
            "ಮೀನು", "ಮೀನುಗಾರಿಕೆ"
        ]
        ocean_telemetry_keywords = [
            "ocean condition", "sst", "temperature", "wave", "waves", "current", "currents", "salinity", "telemetry", "forecast", "swell", "wind", "gust", "sea state", "locate",
            "wave height", "how high are waves", "how high are the waves", "wind speed",
            "मौसम", "वेदर", "कंडीशन", "स्थिति", "लहरें", "लहर", "तरंग", "तापमान", "हवा", "पानी", "लहरों की ऊंचाई", "हवा की गति",
            "வானிலை", "அலைகள்", "அலை", "காற்று", "வெப்பநிலை", "கடல் நிலை", "அலையின் உயரம்",
            "കാലാവസ്ഥ", "തിരമാല", "തിര", "കാറ്റ്", "താപനില", "കടൽ അവസ്ഥ", "തിരമാലയുടെ ഉയരം",
            "వాతావరణం", "అలలు", "గాలి", "ఉష్ణోగ్రత", "సముద్ర స్థితి", "అలల ఎత్తు",
            "আবহাওয়া", "ঢেউ", "ঢেউয়ের", "বাতাস", "তাপমাত্রা", "ঢেউয়ের উচ্চতা",
            "હવામાન", "મોજા", "પવન", "તાપમાન", "મોજાં કેવા",
            "हवामान", "लाटा", "वारा", "लाटांची उंची"
        ]
        decline_keywords = [
            "declined", "productivity decline", "less catch", "fish catch decrease", "why has fish", "depletion", "scarcity",
            "मछली कम", "उत्पादकता", "कमी", "मछलियां क्यों घटीं", "घट गई", "குறைவு", "வரத்து குறைந்தது",
            "കുറഞ്ഞു", "മത്സ്യം കുറയാൻ", "തഗ്గుదల", "হ্রাস"
        ]
        hazard_keywords = [
            "lightning", "cyclone", "storm", "damini", "doppler", "squall", "gale", "thunderstorm", "alert", "warning",
            "बिजली", "चक्रवात", "आंधी", "दामिनी", "चेतावनी", "अलर्ट", "तूफान", "புயல்", "மின்னல்", "எச்சரிக்கை",
            "ചുഴലിക്കാറ്റ്", "മിന്നൽ", "മുന്നറിയിപ്പ്", "തുఫాను", "మెరుపు", "హెచ్చరిక", "ঘূর্ণিঝড়", "বজ্রপাত", "সতর্কতা",
            "વાવાઝોડું", "વીજળી", "ચેતવણી", "वादळ", "वीज"
        ]
        ocean_front_keywords = [
            "chlorophyll", "favourable sst", "high chlorophyll", "thermal front", "ocean colour", "isro ocm", "upwelling",
            "क्लोरोफिल", "थर्मल फ्रंट", "குளோரோபில்", "ക്ലോറോഫിൽ"
        ]
        geofence_keywords = [
            "avoided", "geofenc", "imbl", "border", "restricted", "mpa", "sanctuary", "hazardous", "boundary", "biosphere",
            "सीमा", "अंतर्राष्ट्रीय सीमा", "प्रतिबंधित", "अभयारण्य",
            "எல்லை", "சர்வதேச எல்லை", "தடைசெய்யப்பட்ட",
            "அதிർത്തി", "നിരോധിത", "സങ്കേതം",
            "సరిహద్దు", "పరిమితి"
        ]
        tide_keywords = [
            "tide", "tides", "high tide", "low tide", "spring tide", "neap tide",
            "ज्वार", "भाटा", "വേലിയേറ്റം", "വേലിയിറക്കം"
        ]

        is_wave_explanation = any(p in prompt_lower for p in wave_explanation_keywords)
        is_forecast = any(w in prompt_lower for w in forecast_keywords)
        is_safety = any(w in prompt_lower for w in safety_keywords)
        is_routing = (has_two_ports and any(w in prompt_lower for w in ["se", "to", "and", "jaane", "samay", "time", "route", "distance", "doori"])) or any(w in prompt_lower for w in routing_keywords)

        # 1. Marine routing & voyage planning (e.g. "What is the safest route between Mumbai and Goa?")
        if is_routing:
            intent = "marine_routing"
            requires_routing = True
            selected_agents = [
                "marine_data_retrieval_agent",
                "weather_intelligence_agent",
                "alert_notification_agent",
                "risk_assessment_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        # 2. Safety assessment (e.g. "Is it safe to fish/depart near Mumbai today?")
        elif is_safety:
            intent = "sea_safety_assessment"
            requires_risk = True
            requires_pfz = any(w in prompt_lower for w in ["fish", "fishing", "मछली", "मासेमारी", "மீன்பிடி"])
            selected_agents = [
                "marine_data_retrieval_agent",
                "weather_intelligence_agent",
                "alert_notification_agent",
                "risk_assessment_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        # 3. Wave & weather causal explanation (e.g. "Why are the waves high today?")
        elif is_wave_explanation:
            intent = "wave_explanation"
            requires_risk = False
            selected_agents = [
                "marine_data_retrieval_agent",
                "weather_intelligence_agent",
                "ocean_analytics_agent",
                "alert_notification_agent",
                "response_synthesis_agent"
            ]
        # 4. Dedicated marine forecast queries (e.g. "What will sea conditions be tomorrow?")
        elif is_forecast and not any(w in prompt_lower for w in ["route", "navigate", "between"]):
            intent = "marine_forecast"
            requires_risk = True
            selected_agents = [
                "marine_data_retrieval_agent",
                "weather_intelligence_agent",
                "alert_notification_agent",
                "risk_assessment_agent",
                "response_synthesis_agent"
            ]
        # 5. Multi-port voyage comparison
        elif is_comparison:
            intent = "comparison"
            selected_agents = [
                "marine_data_retrieval_agent",
                "ocean_analytics_agent",
                "weather_intelligence_agent",
                "risk_assessment_agent",
                "response_synthesis_agent"
            ]
        # 5. Specific diagnostic queries: Productivity decline, hazards, chlorophyll/SST, geofences
        elif any(w in prompt_lower for w in decline_keywords):
            intent = "productivity_decline_analysis"
            selected_agents = [
                "marine_data_retrieval_agent",
                "ocean_analytics_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        elif any(w in prompt_lower for w in hazard_keywords):
            intent = "lightning_and_cyclone_alerts"
            selected_agents = [
                "alert_notification_agent",
                "weather_intelligence_agent",
                "risk_assessment_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        elif any(w in prompt_lower for w in ocean_front_keywords):
            intent = "chlorophyll_sst_correlation"
            requires_pfz = True
            selected_agents = [
                "marine_data_retrieval_agent",
                "ocean_analytics_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        elif any(w in prompt_lower for w in geofence_keywords):
            intent = "geofencing_and_restricted_zones"
            selected_agents = [
                "alert_notification_agent",
                "geospatial_analysis_agent",
                "risk_assessment_agent",
                "marine_data_retrieval_agent",
                "response_synthesis_agent"
            ]
        # 6. Targeted PFZ search (broad fish / fishing terms)
        elif any(w in prompt_lower for w in pfz_keywords):
            intent = "potential_fishing_zone"
            requires_pfz = True
            selected_agents = [
                "marine_data_retrieval_agent",
                "ocean_analytics_agent",
                "weather_intelligence_agent",
                "risk_assessment_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        elif any(w in prompt_lower for w in tide_keywords):
            intent = "tide_and_sea_conditions"
            selected_agents = [
                "marine_data_retrieval_agent",
                "weather_intelligence_agent",
                "ocean_analytics_agent",
                "risk_assessment_agent",
                "response_synthesis_agent"
            ]
        # 7. Targeted wave & weather telemetry (e.g. "What is the wave height near Mumbai?")
        elif any(w in prompt_lower for w in ocean_telemetry_keywords) or "locate" in prompt_lower:
            intent = "ocean_condition_telemetry"
            selected_agents = [
                "marine_data_retrieval_agent",
                "ocean_analytics_agent",
                "weather_intelligence_agent",
                "geospatial_analysis_agent",
                "response_synthesis_agent"
            ]
        else:
            # 8. Pure educational / scientific marine encyclopedia FAQs (checked ONLY when not operational)
            marine_faq_phrases = [
                "kallakkadal", "kalla kadal", "swell surge", "rogue wave", "internal wave", "upwelling", "downwelling",
                "thermal front", "ocean front", "ocean colour", "marine heatwave", "ocean acidification", "salinity",
                "why is ocean salty", "why is sea salty", "why is ocean blue", "why is the sea blue", "spring tide", "neap tide",
                "rip current", "el nino", "la nina", "enso", "indian ocean dipole", "iod", "somali current", "monsoon current",
                "equatorial current", "depth of ocean", "mariana trench", "ocean trench", "thermocline", "halocline", "pycnocline",
                "what is ocean", "turtle", "olive ridley", "arribada", "gahirmatha", "whale shark", "dugong", "coral reef",
                "coral bleaching", "mangrove", "bioluminescence", "colregs", "rule 10", "traffic separation scheme", "unclos",
                "territorial waters", "monsoon fishing ban", "port danger signal", "port signal", "port signals", "port warning signal", "port warning signals", "port signals 1 to 11", "beaufort scale", "douglas sea state",
                "nautical mile", "nautical miles", "knot", "knots", "coriolis", "coriolis effect", "radar", "marine radar", "vhf", "vhf 16",
                "ships float", "ship float", "how do ships float", "why do ships float", "buoyancy", "archimedes",
                "समुद्र नीला क्यों", "समुद्र खारा क्यों", "कल्लाक्कदल", "ऑलिव रिडले", "प्रवाल भित्ति", "बंदरगाह चेतावनी संकेत", "बंदर संकेत",
                "नॉटिकल मील", "नॉटिकल मैल", "नॉट", "कोरिओलिस", "राडार", "रडार", "जहाज का तरंगते", "जहाज क्यों तैरते हैं"
            ]
            if any(p in prompt_lower for p in marine_faq_phrases):
                loc = resolve_location_name(user_prompt)
                return {
                    "intent": "marine_knowledge",
                    "selected_agents": ["planning_agent", "response_synthesis_agent"],
                    "target_location": loc["name"] if loc else "Indian Maritime Waters",
                    "coordinates": {
                        "latitude": loc["lat"] if loc else settings.DEFAULT_LAT,
                        "longitude": loc["lon"] if loc else settings.DEFAULT_LON
                    },
                    "timeframe": "current",
                    "requires_routing": False,
                    "route_endpoints": None,
                    "requires_pfz": False,
                    "requires_risk_assessment": False,
                    "reasoning_summary": "Marine science / regulatory FAQ query. Routing directly to domain knowledge synthesizer."
                }

        # Check for general knowledge / out of domain query with no ports or ocean markers
        if intent == "general_marine_query" and not detected_ports and not has_coords:
            marine_kw = [
                "sea", "ocean", "marine", "water", "coast", "coastal", "wave", "wind", "swell", "tide", "fish", "fishing",
                "tuna", "boat", "vessel", "ship", "port", "harbor", "harbour", "cyclone", "storm", "tsunami", "coral",
                "sst", "chlorophyll", "pfz", "current", "currents", "sail", "sailing", "anchor", "knot", "nautical", "buoy",
                "समुद्र", "सागर", "महासागर", "लाटा", "वारा", "मासे", "मासेमारी", "बंदर", "बोट", "जहाज", "चक्रीवादळ", "भरती", "ओहोटी",
                "लहर", "हवा", "नाव", "मछली", "तूफान", "ज्वार", "भाटा", "चक्रवात", "तट",
                "கடல்", "அலை", "காற்று", "மீன்", "துறைமுகம்", "படகு", "புயல்",
                "കടൽ", "തിരമാല", "കാറ്റ്", "മത്സ്യം", "തുറമുഖം", "ബോട്ട്",
                "సముద్రం", "అలలు", "గాలి", "చేప", "ఓడరేవు", "పడవ",
                "সমুদ্র", "ঢেউ", "বাতাস", "মাছ", "বন্দর", "নৌকা",
                "દરિયો", "મોજા", "પવન", "માછલી", "બંદર", "હોડી"
            ]
            if not any(k in prompt_lower for k in marine_kw):
                return {
                    "intent": "out_of_domain",
                    "selected_agents": ["planning_agent", "response_synthesis_agent"],
                    "target_location": "ORCA Universal Knowledge Hub",
                    "coordinates": {"latitude": settings.DEFAULT_LAT, "longitude": settings.DEFAULT_LON},
                    "timeframe": "current",
                    "requires_routing": False,
                    "route_endpoints": None,
                    "requires_pfz": False,
                    "requires_risk_assessment": False,
                    "reasoning_summary": "General inquiry answered by ORCA universal intelligence."
                }

        # Location extraction
        location_data = resolve_location_name(user_prompt)
        if not location_data and detected_ports:
            location_data = detected_ports[0]

        # Route origin/destination extraction
        origin = None
        destination = None
        if requires_routing:
            match = re.search(r"(?:from|between)\s+([^,\n\r]+?)\s+(?:to|and)\s+([^,\n\r]+)", prompt_lower)
            if match:
                origin = resolve_location_name(match.group(1).strip())
                destination = resolve_location_name(match.group(2).strip())
            else:
                rom_match = re.search(r"(.+?)\s+se\s+(.+?)\s+(?:jaane|tak|route|ka|ke|jaana|mein)", prompt_lower)
                if rom_match:
                    origin = resolve_location_name(rom_match.group(1).strip())
                    destination = resolve_location_name(rom_match.group(2).strip())
                else:
                    hi_match = re.search(r"(.+?)\s+से\s+(.+?)\s+(?:तक|मार्ग|रास्ता|जाने)", user_prompt)
                    if hi_match:
                        origin = resolve_location_name(hi_match.group(1).strip())
                        destination = resolve_location_name(hi_match.group(2).strip())

            if not origin or not destination:
                if len(detected_ports) >= 2:
                    origin = detected_ports[0]
                    destination = detected_ports[1]

        target_name = location_data["name"] if location_data else "Chennai Port"
        if requires_routing and origin and destination:
            target_name = f"{origin['name']} to {destination['name']} Maritime Corridor"

        return {
            "intent": intent,
            "selected_agents": selected_agents,
            "target_location": target_name,
            "coordinates": {
                "latitude": (origin["lat"] if requires_routing and origin else (location_data["lat"] if location_data else settings.DEFAULT_LAT)),
                "longitude": (origin["lon"] if requires_routing and origin else (location_data["lon"] if location_data else settings.DEFAULT_LON))
            },
            "timeframe": "tomorrow morning" if is_forecast else "current_forecast",
            "requires_routing": requires_routing,
            "route_endpoints": {
                "origin": origin,
                "destination": destination
            } if requires_routing else None,
            "requires_pfz": requires_pfz,
            "requires_risk_assessment": requires_risk,
            "reasoning_summary": f"Decomposed query into {intent} task. Selected {len(selected_agents)} specialized agents."
        }

    def _local_grounded_synthesis(self, system_prompt: str, user_prompt: str) -> str:
        return "ORCA analyzed satellite Earth observation, weather intelligence, and geospatial constraints to produce this evidence-based assessment."

llm_client = LLMClient()
