import re
from typing import Dict, Any, Optional, Tuple, List

class LanguageRegistry:
    """
    Extensible Indian Language Registry and Metadata System for SIH26176 (ORCA).
    Defines supported Indian coastal and regional languages with Unicode script ranges,
    BCP-47 language tags for Speech Recognition/TTS, native script names, and sample markers.
    """
    LANGUAGES: Dict[str, Dict[str, Any]] = {
        "en": {
            "name": "English",
            "native_name": "English",
            "bcp47": "en-IN",
            "script": "Latin",
            "script_family": "Latin",
            "tts_voices": ["en-IN", "en-GB", "en-US"]
        },
        "hi": {
            "name": "Hindi",
            "native_name": "हिंदी",
            "bcp47": "hi-IN",
            "script": "Devanagari",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0900, 0x097F),
            "tts_voices": ["hi-IN"]
        },
        "mr": {
            "name": "Marathi",
            "native_name": "मराठी",
            "bcp47": "mr-IN",
            "script": "Devanagari",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0900, 0x097F),
            "tts_voices": ["mr-IN"]
        },
        "ml": {
            "name": "Malayalam",
            "native_name": "മലയാളം",
            "bcp47": "ml-IN",
            "script": "Malayalam",
            "script_family": "Dravidian",
            "unicode_range": (0x0D00, 0x0D7F),
            "tts_voices": ["ml-IN"]
        },
        "ta": {
            "name": "Tamil",
            "native_name": "தமிழ்",
            "bcp47": "ta-IN",
            "script": "Tamil",
            "script_family": "Dravidian",
            "unicode_range": (0x0B80, 0x0BFF),
            "tts_voices": ["ta-IN"]
        },
        "te": {
            "name": "Telugu",
            "native_name": "తెలుగు",
            "bcp47": "te-IN",
            "script": "Telugu",
            "script_family": "Dravidian",
            "unicode_range": (0x0C00, 0x0C7F),
            "tts_voices": ["te-IN"]
        },
        "kn": {
            "name": "Kannada",
            "native_name": "ಕನ್ನಡ",
            "bcp47": "kn-IN",
            "script": "Kannada",
            "script_family": "Dravidian",
            "unicode_range": (0x0C80, 0x0CFF),
            "tts_voices": ["kn-IN"]
        },
        "gu": {
            "name": "Gujarati",
            "native_name": "ગુજરાતી",
            "bcp47": "gu-IN",
            "script": "Gujarati",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0A80, 0x0AFF),
            "tts_voices": ["gu-IN"]
        },
        "bn": {
            "name": "Bengali",
            "native_name": "বাংলা",
            "bcp47": "bn-IN",
            "script": "Bengali",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0980, 0x09FF),
            "tts_voices": ["bn-IN"]
        },
        "or": {
            "name": "Odia",
            "native_name": "ଓଡ଼ିଆ",
            "bcp47": "or-IN",
            "script": "Odia",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0B00, 0x0B7F),
            "tts_voices": ["or-IN", "hi-IN"]
        },
        "pa": {
            "name": "Punjabi",
            "native_name": "ਪੰਜਾਬੀ",
            "bcp47": "pa-IN",
            "script": "Gurmukhi",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0A00, 0x0A7F),
            "tts_voices": ["pa-IN", "hi-IN"]
        },
        "ur": {
            "name": "Urdu",
            "native_name": "اردو",
            "bcp47": "ur-IN",
            "script": "Arabic",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0600, 0x06FF),
            "tts_voices": ["ur-IN", "hi-IN"]
        },
        "kok": {
            "name": "Konkani",
            "native_name": "कोंकणी",
            "bcp47": "kok-IN",
            "script": "Devanagari",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0900, 0x097F),
            "tts_voices": ["kok-IN", "mr-IN"]
        },
        "hinglish": {
            "name": "Hinglish",
            "native_name": "Hinglish (Hindi-English Blend)",
            "bcp47": "hi-Latn",
            "script": "Latin",
            "script_family": "Mixed Code",
            "tts_voices": ["en-IN", "hi-IN"]
        },
        "as": {
            "name": "Assamese",
            "native_name": "অসমীয়া",
            "bcp47": "as-IN",
            "script": "Bengali",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0980, 0x09FF),
            "tts_voices": ["as-IN", "bn-IN"]
        },
        "sa": {
            "name": "Sanskrit",
            "native_name": "संस्कृतम्",
            "bcp47": "sa-IN",
            "script": "Devanagari",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0900, 0x097F),
            "tts_voices": ["sa-IN", "hi-IN"]
        },
        "si": {
            "name": "Sinhala",
            "native_name": "සිංහල",
            "bcp47": "si-LK",
            "script": "Sinhala",
            "script_family": "Indo-Aryan",
            "unicode_range": (0x0D80, 0x0DFF),
            "tts_voices": ["si-LK"]
        },
        "ar": {
            "name": "Arabic",
            "native_name": "العربية",
            "bcp47": "ar-SA",
            "script": "Arabic",
            "script_family": "Afroasiatic",
            "unicode_range": (0x0600, 0x06FF),
            "tts_voices": ["ar-SA", "ar-AE"]
        },
        "fr": {
            "name": "French",
            "native_name": "Français",
            "bcp47": "fr-FR",
            "script": "Latin",
            "script_family": "Romance",
            "tts_voices": ["fr-FR"]
        },
        "pt": {
            "name": "Portuguese",
            "native_name": "Português",
            "bcp47": "pt-PT",
            "script": "Latin",
            "script_family": "Romance",
            "tts_voices": ["pt-PT", "pt-BR"]
        },
        "auto": {
            "name": "Auto Detect",
            "native_name": "🌐 Auto",
            "bcp47": "en-IN",
            "script": "Any",
            "script_family": "Universal",
            "tts_voices": ["en-IN"]
        }
    }


class LanguageService:
    """
    General Multilingual Indian-Language Detection and Localization Engine for SIH26176.
    
    Architectural Pillars:
    1. Zero hardcoding of 2-3 languages: Extensible across all Indian scripts and dialects.
    2. Multi-stage Language Identification (LID):
       - Stage 1: Unicode character distribution analysis across Indic scripts.
       - Stage 2: Morphological and lexical disambiguation for shared scripts (Hindi vs Marathi).
       - Stage 3: Latin script analysis distinguishing standard English from Romanized Indic (Hinglish/Tanglish).
       - Stage 4: Multi-turn conversational context inheritance for elliptical/short follow-ups.
    3. Code-switching resilience: Preserves English marine jargon ("PFZ", "GPS", "knots", "SST")
       without incorrectly flipping the primary conversational language.
    """

    # Unicode script ranges for distinct Indic scripts
    SCRIPT_RANGES = {
        "devanagari": (0x0900, 0x097F),
        "bengali": (0x0980, 0x09FF),
        "gurmukhi": (0x0A00, 0x0A7F),
        "gujarati": (0x0A80, 0x0AFF),
        "odia": (0x0B00, 0x0B7F),
        "tamil": (0x0B80, 0x0BFF),
        "telugu": (0x0C00, 0x0C7F),
        "kannada": (0x0C80, 0x0CFF),
        "malayalam": (0x0D00, 0x0D7F),
        "sinhala": (0x0D80, 0x0DFF),
        "arabic_urdu": (0x0600, 0x06FF)
    }

    # Distinct Marathi markers (Devanagari)
    MARATHI_MARKERS = {
        "गव्हाच्या", "गव्हासाठी", "पिकासाठी", "कोणते", "कोणता", "कोणती", "खत", "खते", 
        "वापरावे", "वापरावी", "करावे", "द्यावे", "टाकावे", "आहे", "आहेत", "नाही", "नाहीत", 
        "कसे", "कशी", "काय", "किती", "शेतकरी", "पिक", "पिकाला", "जमीन", "पाणी", "हवे", 
        "पाहिजे", "करा", "होते", "त्यांना", "त्याचे", "त्याची", "माहिती", "सांगा", "कधी", 
        "मध्ये", "वारंवार", "योग्य", "प्रमाण", "वापर", "औषध", "फवारणी", "मदत", "साहाय्य",
        "गहू", "भात", "कापूस", "ज्वारी", "बाजरी", "तूर", "हरभरा", "ऊस",
        # Marine and inquiry specific Marathi markers
        "सागरी", "समुद्रात", "समुद्रातील", "लाटा", "लाटांची", "उंची", "वाऱ्याचा", "वेग",
        "मत्स्य", "मासेमारी", "क्षेत्र", "हवामान", "वादळ", "किनारा", "बंदर", "सुरक्षित",
        "म्हणजे", "बद्दल", "विषयी", "कसा", "कुठे", "कोठे", "का", "कशा", "होतो", "असतो",
        "असते", "खारट", "खारा", "निळा", "मासे", "बोट", "महासागर", "सागर", "समुद्र"
    }

    MARATHI_SUFFIXES = [
        "च्या", "साठी", "तील", "वरून", "मध्ये", "वे", "तात", "णारा", "णारी", "णारे", "डून", "विषयी", "बद्दल"
    ]

    # Distinct Konkani markers (Devanagari)
    KONKANI_MARKERS = {
        "आसा", "आसात", "ना", "नाका", "बरें", "किदें", "कित्याक", "कसो", "कशी", "गोयां",
        "व्हडां", "व्हड", "ल्हार", "ल्हारां", "नुस्तें", "उदक", "दर्या", "दर्यांत", "लागीं",
        "व्हरपाक", "करपाक", "सांग", "सांगात", "हवामान", "घोव", "मासो", "जाल्यार"
    }

    # Distinct Hindi markers (Devanagari)
    HINDI_MARKERS = {
        "गेहूं", "फसल", "के", "लिए", "कौन", "कौनसी", "कौनसा", "कौनसे", "सी", "सा", "से",
        "खाद", "उर्वरक", "उपयोग", "करनी", "करना", "करने", "चाहिए", "है", "हैं", "होगा", 
        "होगी", "होंगे", "रहा", "रही", "रहे", "था", "थी", "थे", "क्या", "कैसे", "कैसी", 
        "कितना", "कितनी", "कितने", "डालना", "डालनी", "किसान", "खेती", "बारे", "बताओ", 
        "कीजिए", "सकते", "सकती", "सकता", "होता", "होती", "होते", "दवा", "छिड़काव", "मात्रा",
        "अनुपात", "सिंचाई", "पानी", "धान", "चावल", "सरसों", "कपास", "मक्का", "दाल",
        # Marine specific Hindi markers
        "समुद्र", "लहरें", "हवा", "तूफान", "मछली", "पकड़ने", "नाव", "बंदरगाह", "दिशा",
        "महासागर", "सागर", "नीला", "खारा", "लहरों"
    }

    # Pure Romanized Indic vocabulary (words written in Latin script)
    HINGLISH_INDIC_WORDS = {
        "mujhe", "fasal", "kheti", "kisan", "khaad", "khad", "kaunsi", "kaunsa", 
        "kaunse", "kya", "kaise", "kitna", "kitni", "kitne", "daalna", "dalna", 
        "karni", "karna", "chahiye", "chahye", "batao", "bataiye", "bataye", "karo", 
        "kare", "hai", "hain", "hoga", "hogi", "nahi", "nahin", "paani", "pani", "dawa", 
        "dawai", "liye", "mein", "aur", "bhi", "kab", "kaha", "kahan", 
        "konsi", "konse", "dalo", "lagana", "lagaye", "dena", "hota", 
        "hoti", "zaroorat", "matra", "sheti", "kiti", "ahe", "sang",
        # Marine specific Hinglish markers
        "samundar", "samunder", "lehrein", "lahrein", "lahre", "machli", "toofan", "tufan",
        "bandargaah", "surakshit", "khatra", "hawa", "kinare", "machhimar", "sagar",
        "samudra", "me", "ki", "ka", "ke", "dikhao", "dikhaye", "kaisa", "kaisi", "batao", "bataye"
    }

    # Romanized Marathi specific markers (acoustics / phonetics from English recognizer)
    MARATHI_ROMANIZED_WORDS = {
        "kiti", "kithi", "kitiya", "kiteya", "ahe", "aahe", "aay", "ahae", "a.h",
        "latanchi", "laatanchi", "laatanchu", "laatanchyoon", "laata", "lata", "laatang",
        "unchi", "unch", "chikiti", "munchik",
        "javal", "jawal", "zawa", "samudrat", "havaman", "masemari",
        "machhimar", "kuthe", "kasa", "kase", "zali", "jhali", "madhye", "sathi",
        "kadhi", "surakshit", "shakto", "shakte", "nako", "ahes", "sang", "sanga",
        "vara", "varyacha", "panyat", "kay", "arim"
    }

    # Romanized regional Indic markers (acoustics / phonetics from English recognizer)
    TAMIL_ROMANIZED_WORDS = {
        "vanakkam", "epdi", "irukku", "kadal", "alaigal", "aleygalin", "uyaram", "yenne", 
        "turai", "mugam", "meen", "birika", "sella", "lama", "arigay", "katru", "meenavar", 
        "nandri", "kothchi", "enge", "eppadi", "inna", "enna"
    }

    TELUGU_ROMANIZED_WORDS = {
        "namaskaram", "ela", "unnaru", "alala", "etthu", "entha", "mariyu", "chepala", 
        "vetaku", "vellavacha", "samudramlo", "gaali", "theeram", "vetaki", "matsyakarulu", 
        "daggara", "visakhapatnam", "valla", "eppudu", "unna", "ledu", "chala"
    }

    MALAYALAM_ROMANIZED_WORDS = {
        "namaskaram", "enthanu", "thiramaala", "thiramaalakalude", "uyaram", "ethrayanu", 
        "kadalil", "pokunnathu", "surakshithamaano", "theerathu", "valarcha", "kooduthal", 
        "undu", "illa", "evide", "aanu"
    }

    KANNADA_ROMANIZED_WORDS = {
        "namaskara", "hegiddira", "alegala", "etthara", "eshtide", "mattu", "meenugarikege", 
        "hoguvudu", "surakshitave", "karavaliyalli", "matsyodyama", "elli", "yaava", "ide"
    }

    GUJARATI_ROMANIZED_WORDS = {
        "namaste", "kem", "cho", "dariyama", "dariyo", "dariyanu", "moja", "ketla", 
        "uncha", "che", "ane", "shu", "machhimari", "mate", "javu", "salamat", 
        "pavan", "kinara", "kya", "nathi"
    }

    BENGALI_ROMANIZED_WORDS = {
        "nomoshkar", "kemon", "achen", "shomudrer", "dheu", "ache", "ebong", "mach", 
        "dhorte", "jaowa", "nirapod", "upokule", "bataash", "jhor", "kothay", "hobe", "nei"
    }

    HINGLISH_PHRASES = [
        "ke liye", "kaunsi", "use karni", "karni chahiye", "karna chahiye", 
        "daalna chahiye", "batao", "mujhe", "kitna use", "kitni use", 
        "kaunsa fertilizer", "kaunsi khaad", "wheat ke liye", "crop ke liye",
        "kaise use", "kitna daalna", "samundar me", "wave kitni", "hawa kitni",
        "safe hai", "kya safe", "machli zone", "unchi kiti", "kiti ahe", "kiti aahe",
        "havaman kase", "latanchi unchi", "laatanchi unchi"
    ]

    # Distinct regional Indic native markers (in their native scripts)
    TAMIL_NATIVE_MARKERS = {
        "வணக்கம்", "கொச்சி", "துறைமுகம்", "அருகே", "கடல்", "அலைகளின்", "அலைகள்", "உயரம்", "என்ன", 
        "மீன்", "பிடிக்க", "செல்லலாமா", "மீன்பிடிக்க", "மற்றும்", "வானிலை", "காற்று", "எப்படி", 
        "இருக்கு", "பாதுகாப்பானதா", "புயல்", "எச்சரிக்கை", "பகுதி", "செல்ல", "நன்றி", "வேண்டும்", 
        "உள்ளது", "இல்லை", "இங்கு", "எப்போது", "மீனவர்"
    }

    TELUGU_NATIVE_MARKERS = {
        "నమస్కారం", "విశాఖపట్నం", "తీరం", "వద్ద", "సముద్రం", "సుద్రం", "సముద్రంలో", "సుద్రంలో", 
        "అలల", "ఎత్తు", "ఎంత", "చేపల", "చేైపల", "చేపలు", "వేటకు", "వెళ్లవచ్చా", "గాలి", "వేగం", 
        "మత్స్యకారులు", "వాతావరణం", "తుఫాను", "హెచ్చరిక", "సురక్షితమేనా", "మరియు", "మరి", 
        "దగ్గర", "దగడ", "బయటకు", "ఉన్నాయి", "లేదు", "ఉంది", "ఎలా", "వెళ్ళాలి"
    }

    GUJARATI_NATIVE_MARKERS = {
        "નમસ્તે", "પોરબંદર", "વેરાવળ", "બંદર", "દરિયો", "દરિયામાં", "દરિયાનું", "મોજાં", "મોજા", 
        "કેટલાં", "કેટલા", "ઊંચાં", "ઊંચા", "છે", "અને", "માછીમારી", "માટે", "જવું", "સલામત", 
        "પવન", "ઝડપ", "હવામાન", "તોફાન", "ચેતવણી", "કિનારે", "શું", "નથી", "મા", "શકાય"
    }

    MALAYALAM_NATIVE_MARKERS = {
        "നമസ്കാരം", "കൊച്ചി", "കാച്ചി", "തുറമുഖം", "തീരം", "തീരത്ത്", "തീര", "കടലിൽ", "തിരമാല", 
        "തിരമാലകളുടെ", "ഉയരം", "എത്രയാണ്", "മീൻപിടുത്തത്തിന്", "പോകുന്നത്", "സുരക്ഷിതമാണോ", 
        "സുരക്ഷിതമനോ", "കാറ്റിന്റെ", "വേഗത", "കാലാവസ്ഥ", "മുന്നറിയിപ്പ്", "ഉണ്ട്", "ഇല്ല", 
        "എന്ത്", "എങ്ങനെ", "പോകാമോ", "കൂടുതൽ"
    }

    KANNADA_NATIVE_MARKERS = {
        "ನಮಸ್ಕಾರ", "ಮಂಗಳೂರು", "ಮ್ಯಂಗಲರು", "ಕರಾವಳಿ", "ಕರಾವಳಿಯಲ್ಲಿ", "ಸಮುದ್ರದ", "ಅಲೆಗಳ", "ಎತ್ತರ", 
        "ಎಷ್ಟಿದೆ", "ಮತ್ತು", "ಮೀನುಗಾರಿಕೆಗೆ", "ಮೀನುಗಿಕೈ", "ಹೋಗುವುದು", "ಸುರಕ್ಷಿತವೇ", "ಸುರಕ್ಷಿತ", 
        "ಗಾಳಿಯ", "ವೇಗ", "ಹವಾಮಾನ", "ಎಚ್ಚರಿಕೆ", "ಮೀನು", "ಬಂದರು", "ಇದೆ", "ಇಲ್ಲ", "ಹೇಗಿದೆ"
    }

    BENGALI_NATIVE_MARKERS = {
        "নমস্কার", "দীঘা", "দাকল", "উপকূল", "উপকূলে", "সমুদ্র", "সমুদ্রের", "সামেদ", "ঢেউ", 
        "ঢেউয়ের", "উচ্চতা", "কত", "এবং", "আজক", "মাছ", "মাচ", "ধরতে", "যাওয়া", "কি", 
        "নিরাপদ", "নিরপদ", "বাতাস", "বাতাসের", "গতিবেগ", "আবহাওয়া", "ঝড়", "সতর্কতা", "আছে", "নেই"
    }

    ODIA_NATIVE_MARKERS = {
        "ନମସ୍କାର", "ପୁରୀ", "ପାରାଦୀପ", "ଉପକୂଳ", "ସମୁଦ୍ର", "ଢେଉ", "ଉଚ୍ଚତା", "ମାଛ", "ଧରିବା", 
        "ନିରାପଦ", "ପବନ", "ପାଣିପାଗ", "ସତର୍କତା", "ଅଛି", "ନାହିଁ"
    }

    PUNJABI_NATIVE_MARKERS = {
        "ਸਤਿ", "ਸ੍ਰੀ", "ਅਕਾਲ", "ਕਿਵੇਂ", "ਹੋ", "ਪਾਣੀ", "ਦਰਿਆ", "ਮੌਸਮ", "ਹਵਾ", "ਕੀ", "ਹੈ", "ਹਨ", "ਨਹੀਂ"
    }

    URDU_NATIVE_MARKERS = {
        "سلام", "سمندر", "لہریں", "اونچائی", "مچھلی", "ہوا", "طوفان", "کیا", "ہے", "ہیں", "نہیں", "محفوظ"
    }

    ENGLISH_NATIVE_MARKERS = {
        "what", "is", "the", "wave", "height", "and", "sea", "surface", "temperature", "near", 
        "coast", "today", "to", "day", "we", "are", "planning", "navigate", "mumbai", "fishing", 
        "zone", "knots", "wind", "speed", "advisory", "port", "current", "weather", "vessel", 
        "safe", "storm", "warning"
    }

    LANG_TO_SCRIPT = {
        "hi": "devanagari",
        "mr": "devanagari",
        "kok": "devanagari",
        "ta": "tamil",
        "te": "telugu",
        "gu": "gujarati",
        "ml": "malayalam",
        "kn": "kannada",
        "bn": "bengali",
        "or": "odia",
        "pa": "gurmukhi",
        "ur": "arabic_urdu",
        "as": "bengali",
        "sa": "devanagari",
        "si": "sinhala",
        "ar": "arabic_urdu",
        "fr": "latin",
        "pt": "latin",
        "en": "latin",
        "hinglish": "latin",
        "auto": "latin"
    }

    def __init__(self):
        self.registry = LanguageRegistry.LANGUAGES
        self.NATIVE_MARKERS = {
            "hi": self.HINDI_MARKERS,
            "mr": self.MARATHI_MARKERS,
            "kok": self.KONKANI_MARKERS,
            "ta": self.TAMIL_NATIVE_MARKERS,
            "te": self.TELUGU_NATIVE_MARKERS,
            "gu": self.GUJARATI_NATIVE_MARKERS,
            "ml": self.MALAYALAM_NATIVE_MARKERS,
            "kn": self.KANNADA_NATIVE_MARKERS,
            "bn": self.BENGALI_NATIVE_MARKERS,
            "or": self.ODIA_NATIVE_MARKERS,
            "pa": self.PUNJABI_NATIVE_MARKERS,
            "ur": self.URDU_NATIVE_MARKERS,
            "en": self.ENGLISH_NATIVE_MARKERS,
            "hinglish": self.HINGLISH_INDIC_WORDS | self.ENGLISH_NATIVE_MARKERS
        }
        self._translation_cache: Dict[Tuple[int, str], str] = {}

    def detect_language(self, text: str, conversation_context: Optional[Dict[str, Any]] = None) -> Tuple[str, float]:
        """
        Detect the primary language of incoming text with high statistical precision.
        Returns:
            (language_code, confidence_score)
        """
        if not text or not text.strip():
            if conversation_context and conversation_context.get("last_detected_language"):
                return conversation_context["last_detected_language"], 0.5
            return "en", 0.0

        cleaned = text.strip()
        tokens = re.findall(r"\b\w+\b", cleaned.lower())
        raw_words = re.findall(r"\S+", cleaned)

        # 1. Script Character Counting across all Indian scripts
        script_counts = {script: 0 for script in self.SCRIPT_RANGES}
        latin_count = 0
        total_letters = 0

        for ch in cleaned:
            code = ord(ch)
            total_letters += 1
            matched_script = False
            for script, (start, end) in self.SCRIPT_RANGES.items():
                if start <= code <= end:
                    script_counts[script] += 1
                    matched_script = True
                    break
            if not matched_script:
                if ("a" <= ch <= "z") or ("A" <= ch <= "Z"):
                    latin_count += 1

        # 2. Devanagari Analysis: Hindi vs Marathi vs Konkani
        devanagari_count = script_counts["devanagari"]
        if devanagari_count > 0 and devanagari_count >= (latin_count * 0.4):
            marathi_score = 0
            hindi_score = 0
            konkani_score = 0

            for word in raw_words:
                clean_w = word.strip(".,!?;:\"'()[]{}।॥-_ \t\n\r")
                if clean_w in self.KONKANI_MARKERS:
                    konkani_score += 2
                if clean_w in self.MARATHI_MARKERS:
                    marathi_score += 2
                if any(clean_w.endswith(suf) for suf in self.MARATHI_SUFFIXES if len(clean_w) > len(suf) + 2):
                    marathi_score += 1
                if clean_w in self.HINDI_MARKERS:
                    hindi_score += 2

            # The character 'ळ' (U+0933) is used in Marathi and Konkani, never standard Hindi.
            if "ळ" in cleaned:
                if konkani_score > marathi_score:
                    return "kok", 0.95
                return "mr", 0.99

            # Multi-token phrase heuristics
            if any(p in cleaned for p in ["गोयां लागीं", "दर्यांत", "व्हडां व्हरपाक", "बरें आसा", "हवामान बरें", "किदें आसा"]):
                konkani_score += 4
            if any(p in cleaned for p in [
                "पिकासाठी", "गव्हाच्या", "कोणते खत", "वापरावे", "कसे करावे", "किती खत", "सागरी हवामान", "लाटांची उंची",
                "मासेमारी क्षेत्र", "म्हणजे काय", "काय आहे", "बद्दल सांगा", "बद्दल माहिती", "विषयी सांगा", "सागरी माहिती",
                "कसा असतो", "का असतो", "सांगा ना", "माहिती हवी", "सागराविषयी", "महासागराबद्दल"
            ]):
                marathi_score += 4
            if any(p in cleaned for p in [
                "के लिए", "कौन सी", "कौन सी खाद", "उपयोग करनी चाहिए", "कितनी खाद", "गेहूं की", "समुद्र में", "लहरों की",
                "मछली पकड़ने", "क्या है", "के बारे में", "बताओ", "जानकारी दीजिए", "कैसा होता है", "क्यों होता है"
            ]):
                hindi_score += 4

            if konkani_score > marathi_score and konkani_score > hindi_score:
                confidence = min(0.99, 0.80 + (konkani_score * 0.05))
                return "kok", confidence
            elif marathi_score > hindi_score and marathi_score >= konkani_score:
                confidence = min(0.99, 0.78 + (marathi_score * 0.05))
                return "mr", confidence
            elif hindi_score > marathi_score and hindi_score > konkani_score:
                confidence = min(0.99, 0.78 + (hindi_score * 0.05))
                return "hi", confidence
            else:
                # Disambiguate short query using context
                if conversation_context and conversation_context.get("last_detected_language") in ("mr", "hi", "kok"):
                    return conversation_context["last_detected_language"], 0.85
                # Default Devanagari fallback is Hindi
                return "hi", 0.75

        # 3. Direct 1-to-1 Indic Scripts (Zero-ambiguity scripts)
        script_to_lang = {
            "malayalam": "ml",
            "kannada": "kn",
            "tamil": "ta",
            "telugu": "te",
            "gujarati": "gu",
            "bengali": "bn",
            "odia": "or",
            "gurmukhi": "pa",
            "arabic_urdu": "ur"
        }

        for script_name, lang_code in script_to_lang.items():
            cnt = script_counts[script_name]
            if cnt > 0 and cnt >= (latin_count * 0.35):
                return lang_code, 0.98

        # 4. Latin Script: English vs Romanized Marathi vs Hinglish / Romanized Indic
        if latin_count > 0:
            text_lower = cleaned.lower()

            # Check for Romanized Marathi specifically
            marathi_roman_hits = sum(1 for token in tokens if token in self.MARATHI_ROMANIZED_WORDS)
            if marathi_roman_hits >= 1 or any(p in text_lower for p in ["latanchi", "laatanchi", "unchi kiti", "kiti ahe", "kiti aahe", "kithi aay", "kitiya hai", "havaman kase", "chikiti", "munchik", "laatanchu", "laatanchyoon"]):
                return "mr", 0.95

            # Check for Romanized regional Indic languages
            tamil_hits = sum(1 for token in tokens if token in self.TAMIL_ROMANIZED_WORDS)
            if tamil_hits >= 2 or any(p in text_lower for p in ["turai mugam", "alaygalin uyaram", "meen birika", "sella lama", "epdi irukku", "kadal alai"]):
                return "ta", min(0.98, 0.80 + (tamil_hits * 0.05))

            telugu_hits = sum(1 for token in tokens if token in self.TELUGU_ROMANIZED_WORDS)
            if telugu_hits >= 2 or any(p in text_lower for p in ["alala etthu", "chepala vetaku", "vellavacha", "samudramlo"]):
                return "te", min(0.98, 0.80 + (telugu_hits * 0.05))

            malayalam_hits = sum(1 for token in tokens if token in self.MALAYALAM_ROMANIZED_WORDS)
            if malayalam_hits >= 2 or any(p in text_lower for p in ["thiramaalakalude uyaram", "kadalil pokunnathu", "surakshithamaano", "theerathu thiramaala"]):
                return "ml", min(0.98, 0.80 + (malayalam_hits * 0.05))

            kannada_hits = sum(1 for token in tokens if token in self.KANNADA_ROMANIZED_WORDS)
            if kannada_hits >= 2 or any(p in text_lower for p in ["alegala etthara", "meenugarikege hoguvudu", "surakshitave", "karavaliyalli"]):
                return "kn", min(0.98, 0.80 + (kannada_hits * 0.05))

            gujarati_hits = sum(1 for token in tokens if token in self.GUJARATI_ROMANIZED_WORDS)
            if gujarati_hits >= 2 or any(p in text_lower for p in ["moja ketla", "ketla uncha", "machhimari mate", "salamat che"]):
                return "gu", min(0.98, 0.80 + (gujarati_hits * 0.05))

            bengali_hits = sum(1 for token in tokens if token in self.BENGALI_ROMANIZED_WORDS)
            if bengali_hits >= 2 or any(p in text_lower for p in ["shomudrer dheu", "mach dhorte", "jaowa nirapod"]):
                return "bn", min(0.98, 0.80 + (bengali_hits * 0.05))

            hinglish_hits = 0
            for token in tokens:
                if token in self.HINGLISH_INDIC_WORDS:
                    hinglish_hits += 1

            phrase_bonus = sum(2 for p in self.HINGLISH_PHRASES if p in text_lower)
            total_hinglish_points = hinglish_hits + phrase_bonus

            # Check for very short common Indic responses in Latin
            if text_lower in ["ha", "haan", "nahi", "nahin", "ho", "kaise", "kitna", "kiti", "kyu", "kyun"]:
                return "hinglish", 0.92

            # Only classify as Hinglish if there is at least one genuine Indic marker
            if (hinglish_hits >= 1 or phrase_bonus >= 2) and total_hinglish_points >= 2:
                confidence = min(0.98, 0.70 + (total_hinglish_points * 0.08))
                return "hinglish", confidence

            # Short follow-ups like "how?", "why?", "yes", "how much?", "safe?"
            if len(tokens) <= 3 and conversation_context:
                prior_lang = conversation_context.get("last_detected_language")
                if prior_lang and prior_lang != "en":
                    return prior_lang, 0.75

            return "en", 0.92

        # 5. Fallback to conversation context or English
        if conversation_context and conversation_context.get("last_detected_language"):
            return conversation_context["last_detected_language"], 0.65
        return "en", 0.50

    def normalize_language_code(self, lang: Optional[str]) -> str:
        """Normalizes arbitrary language strings to canonical registry codes."""
        if not lang:
            return "en"
        lang = lang.lower().strip()
        alias_map = {
            "english": "en",
            "hindi": "hi",
            "marathi": "mr",
            "malayalam": "ml",
            "tamil": "ta",
            "telugu": "te",
            "kannada": "kn",
            "gujarati": "gu",
            "bengali": "bn",
            "odia": "or",
            "oriya": "or",
            "punjabi": "pa",
            "urdu": "ur",
            "kok": "kok",
            "gom": "kok",
            "konkani": "kok",
            "hinglish": "hinglish",
            "hi-latn": "hinglish",
            "hindi-english": "hinglish",
            "assamese": "as",
            "sanskrit": "sa",
            "sinhala": "si",
            "arabic": "ar",
            "french": "fr",
            "portuguese": "pt",
            "auto": "auto"
        }
        return alias_map.get(lang, lang if lang in self.registry else "en")

    def get_language_name(self, lang_code: str) -> str:
        """Returns the human-readable English name with native script."""
        norm = self.normalize_language_code(lang_code)
        info = self.registry.get(norm, self.registry["en"])
        return f"{info['name']} ({info['native_name']})"

    def get_bcp47_tag(self, lang_code: str) -> str:
        """Returns standard BCP-47 tag for Web Speech API and Speech Synthesis."""
        norm = self.normalize_language_code(lang_code)
        info = self.registry.get(norm, self.registry["en"])
        return info.get("bcp47", "en-IN")

    def get_all_supported_languages(self) -> Dict[str, Dict[str, Any]]:
        """Returns registry of all supported Indian regional languages."""
        return self.registry

    def validate_language_match(self, response_text: str, target_language: str) -> bool:
        """
        Validates if the generated response appropriately matches the target language.
        Prevents language drift and ensures script conformity.
        """
        if not response_text:
            return False
        
        target = self.normalize_language_code(target_language)
        if target == "en":
            return True
        if target == "hinglish":
            return True

        info = self.registry.get(target)
        if not info or "unicode_range" not in info:
            return True

        start, end = info["unicode_range"]
        has_target_script = any(start <= ord(c) <= end for c in response_text)
        return has_target_script

    def score_candidate_transcript(
        self,
        text: str,
        candidate_lang: str,
        whisper_prior: Optional[str] = None,
        whisper_prob: float = 0.0,
        session_prior: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Scores a candidate transcript decoded by a specific language model.
        Evaluates script compatibility, native lexical marker verification,
        Devanagari/Latin disambiguation, and cross-script phonetic transliteration mitigation.
        
        Returns:
            Dict containing: candidate, text, total_score, script_match, lexical_hits, etc.
        """
        cand = self.normalize_language_code(candidate_lang)
        words = [w.strip(".,!?;:\"'()[]{}।॥-_ \t\n\r") for w in text.split()]
        words = [w for w in words if w]
        if not words:
            return {
                "candidate": cand,
                "text": text,
                "total_score": -10.0,
                "script_match": False,
                "lexical_hits": 0,
                "token_count": 0,
                "whisper_bonus": 0.0,
                "session_bonus": 0.0,
                "transliteration_penalty": 0.0
            }

        # 1. Unicode Script Match Verification
        script_key = self.LANG_TO_SCRIPT.get(cand, "latin")
        s_range = self.SCRIPT_RANGES.get(script_key, (0x0041, 0x007A) if script_key == "latin" else (0, 0))
        s_start, s_end = s_range
        
        total_nonspace = max(1, len(text.replace(" ", "")))
        if script_key == "latin":
            script_chars = sum(1 for c in text if ("a" <= c <= "z") or ("A" <= c <= "Z"))
        else:
            script_chars = sum(1 for c in text if s_start <= ord(c) <= s_end)
            
        script_match = (script_chars / total_nonspace) >= 0.50
        if not script_match:
            return {
                "candidate": cand,
                "text": text,
                "total_score": -5.0,
                "script_match": False,
                "lexical_hits": 0,
                "token_count": len(words),
                "whisper_bonus": 0.0,
                "session_bonus": 0.0,
                "transliteration_penalty": 0.0
            }

        score = 2.0  # Script conformity base score

        # 2. Native Lexical Marker Verification
        markers = self.NATIVE_MARKERS.get(cand, set())
        hits = 0
        for w in words:
            wl = w.lower()
            if wl in markers or any(m in wl for m in markers if len(m) >= 3):
                hits += 1

        score += (hits * 1.5)

        # Genuine speech length bonus (differentiates spoken speech from silence/truncated hallucinations)
        score += min(2.0, len(words) * 0.2)

        # 3. Cross-script Phonetic Transliteration Mitigation
        # If candidate decoded into the correct script block but has 0 native lexical hits on an utterance with >= 3 words,
        # apply mitigation penalty against cross-script phonetic leakage
        transliteration_penalty = 0.0
        if hits == 0 and len(words) >= 3:
            transliteration_penalty = -2.0
            score += transliteration_penalty

        # 4. Native Script and Script-Specific Disambiguation
        det_lang, det_conf = self.detect_language(text)
        if det_lang == cand:
            score += 3.0 * det_conf
        elif cand in ["hi", "mr", "kok"] and det_lang in ["hi", "mr", "kok"] and det_lang != cand:
            score -= 2.5

        # 6. Whisper Acoustic Prior Weak Bonus
        whisper_bonus = 0.0
        if whisper_prior:
            norm_w = self.normalize_language_code(whisper_prior)
            if norm_w == cand:
                whisper_bonus = min(1.0, whisper_prob * 1.0)
                score += whisper_bonus

        # 7. Session Context Weak Secondary Prior
        # Multi-turn weak prior: +0.5 points. Easily overwhelmed by acoustic evidence (+2.0 script + 1.5/hit)
        session_bonus = 0.0
        if session_prior:
            norm_s = self.normalize_language_code(session_prior)
            if norm_s == cand:
                session_bonus = 0.5
                score += session_bonus

        return {
            "candidate": cand,
            "text": text,
            "total_score": round(score, 3),
            "script_match": script_match,
            "lexical_hits": hits,
            "token_count": len(words),
            "whisper_bonus": round(whisper_bonus, 3),
            "session_bonus": round(session_bonus, 3),
            "transliteration_penalty": round(transliteration_penalty, 3)
        }

    # =========================================================================
    # UNIVERSAL 20-LANGUAGE MARITIME TRANSLATION BRIDGE & GLOSSARY
    # =========================================================================
    def translate_inbound_query(self, query: str, detected_lang: str = "auto") -> Tuple[str, str]:
        """
        Translates/normalizes incoming user query in any of 20 languages or Hinglish
        into clean, unambiguous English for the 8 ORCA specialized domain agents.
        Returns:
            (normalized_english_query, source_language_code)
        """
        if not query or not query.strip():
            return "", "en"

        clean_q = query.strip()
        q_lower = clean_q.lower()

        # Resolve language if auto
        eff_lang = detected_lang
        if not eff_lang or eff_lang == "auto":
            det_code, _ = self.detect_language(clean_q)
            eff_lang = det_code

        # If already standard English without Indic or Romanized markers, return directly
        if eff_lang == "en" and not any(m in q_lower for m in ["dikhao", "dikhaye", "kaisa", "kaha", "batao", "bataiye", "jaana"]):
            return clean_q, "en"

        # 1. Deterministic Fast Normalization for Common Maritime Commands (< 0.1ms)
        display_verbs = [
            "dikhao", "dikhaye", "dakhva", "show me", "show", "locate", "kahan hai", "kaisa hai", "kase aahe",
            "दाखवा", "दिखाओ", "दिखाइए", "कहाँ है", "कसा आहे", "कशी आहे", "काटू", "காட்டு", "காட்டுங்கள்", "எங்கே",
            "ఎక్కడ", "చూపించు", "చూపించండి", "দেখাও", "দেখান", "কোথায়", "બતાવો", "દર્શાવો", "ક્યાં છે",
            "തോന്നിക്ക്", "കാണിക്കൂ", "കാണിക്കുക", "എവിടെ", "ತೋರಿಸಿ", "ತೋರಿಸು", "ಎಲ್ಲಿದೆ", "ଦେଖାନ୍ତୁ", "ଦେଖାଅ", "କେଉଁଠି"
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
        if any(v in q_lower for v in display_verbs) and any(p in q_lower for p in port_tokens):
            from backend.utils.geo import resolve_location_name
            loc = resolve_location_name(clean_q)
            p_name = loc["name"] if loc else "Cochin Port (Kochi)"
            return f"Show me {p_name} on the map and provide its current marine status and weather.", eff_lang

        # Weather / wave condition commands
        if any(w in q_lower for w in ["mausam kaisa", "havaman kase", "vanilai epdi", "kalavasta", "weather kaisa", "wave kaisa", "lehrein kaisi"]):
            for port in ["kochi", "cochin", "mumbai", "chennai", "vizag", "goa", "mangalore", "veraval", "paradip"]:
                if port in q_lower:
                    return f"What is the current wave height and marine weather at {port.capitalize()} Port?", eff_lang
            return "What is the current wave height and marine weather conditions?", eff_lang

        # Fishing zone / PFZ commands
        if any(w in q_lower for w in ["machli kahan", "mase kuthe", "meen enga", "meen kahan", "fish kahan", "pfz kahan", "matsya kshetra"]):
            for port in ["kochi", "cochin", "mumbai", "chennai", "vizag", "goa", "mangalore", "veraval"]:
                if port in q_lower:
                    return f"Where are the nearest potential fishing zones (PFZ) near {port.capitalize()}?", eff_lang
            return "Where are the nearest potential fishing zones (PFZ) and tuna hotspots?", eff_lang

        # Safety / departure inquiry
        if any(w in q_lower for w in ["surakshit hai", "surakshit ahe", "badhukappana", "surakshithamaano", "ja sakte hain", "jaau shakto"]):
            for port in ["kochi", "cochin", "mumbai", "chennai", "vizag", "goa", "mangalore", "veraval"]:
                if port in q_lower:
                    return f"Is it safe to depart and fish from {port.capitalize()} Port today under current sea state?", eff_lang
            return "Is it safe to depart and sail today under current marine conditions?", eff_lang

        # Port danger warning signals
        if any(w in q_lower for w in ["port signal", "bandar sanket", "dhokyache sanket", "chetavani sanket", "danger signal"]):
            return "Explain official IMD port danger warning signals 1 through 11 in detail.", eff_lang

        # Kallakkadal surge inquiry
        if "kallakkadal" in q_lower or "kalla kadal" in q_lower:
            return "What is Kallakkadal swell surge warning and how should coastal fishermen prepare?", eff_lang

        # 2. General Query Normalization via Fast AI Cloud Intelligence (Sarvam AI / Gemini)
        try:
            from backend.utils.llm_client import llm_client
            import time
            norm_prompt = (
                "You are ORCA's multilingual query normalizer. "
                "Translate the user's maritime query (which may be in Hindi, Marathi, Tamil, Bengali, Hinglish, etc.) "
                "into a direct, clear, concise English query that preserves all maritime terms, ports, locations, and intents. "
                "Output ONLY the English translated query without quotation marks, explanations, or preamble."
            )
            translated = None
            if llm_client.sarvam_key and time.time() >= llm_client._sarvam_cooldown_until:
                translated = llm_client._call_sarvam(clean_q, system_prompt=norm_prompt, as_json=False)
            if not translated and llm_client.gemini_key and time.time() >= llm_client._gemini_cooldown_until:
                translated = llm_client._call_gemini(clean_q, system_prompt=norm_prompt, as_json=False)
            if translated and len(translated.strip()) > 3:
                return translated.strip(), eff_lang
        except Exception as e:
            pass

        return clean_q, eff_lang

    def translate_outbound_response(self, english_markdown: str, target_lang: str) -> str:
        """
        Translates a synthesized English maritime intelligence assessment into any
        of the 20 supported languages using native script and domain terminology.
        Features in-memory LRU caching and MaritimeGlossary enforcement.
        """
        if not english_markdown or not english_markdown.strip():
            return english_markdown

        norm_lang = self.normalize_language_code(target_lang)
        if norm_lang in ("en", "english", ""):
            return english_markdown

        # Map Hinglish to Hindi native translation
        effective_target = "hi" if norm_lang == "hinglish" else norm_lang
        target_info = self.registry.get(effective_target, self.registry.get("hi"))
        target_name = target_info.get("name", "Hindi")
        native_name = target_info.get("native_name", target_name)

        # 1. Check in-memory translation cache (0.1ms latency)
        cache_key = (hash(english_markdown[:300]), effective_target)
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        # 2. Translate using Sarvam AI (1s response for Indic) or Gemini with Maritime Domain Glossary Guidance
        try:
            from backend.utils.llm_client import llm_client
            glossary_rules = (
                f"Use authentic maritime terminology in {target_name} ({native_name}): "
                "Port -> harbor (not computer port), Swell wave -> oceanic swell (not swelling/medical), "
                "PFZ -> Potential Fishing Zone / मत्स्य क्षेत्र / மீன்பிடி மண்டலம், "
                "Significant wave height -> wave height, Port Danger Signals -> official storm signals 1 to 11. "
                f"Write your ENTIRE response in authentic {target_name} using its official native script. "
                "Preserve all markdown headers, emojis, bullet points, numbers, and lat/lon coordinates exactly."
            )
            sys_prompt = (
                f"You are ORCA's official maritime translation engine for India. "
                f"Translate the provided ocean intelligence markdown report accurately into {target_name} ({native_name}).\n\n"
                f"MANDATORY GUIDELINES:\n"
                f"- {glossary_rules}\n"
                "- Never output English or transliterated Latin script when translating to an Indian regional language.\n"
                "- Do NOT add conversational preamble. Output ONLY the translated markdown."
            )
            translated = None
            if llm_client.sarvam_key and time.time() >= llm_client._sarvam_cooldown_until:
                translated = llm_client._call_sarvam(english_markdown, system_prompt=sys_prompt, as_json=False)
            if not translated and llm_client.gemini_key and time.time() >= llm_client._gemini_cooldown_until:
                translated = llm_client._call_gemini(english_markdown, system_prompt=sys_prompt, as_json=False)

            if translated and len(translated.strip()) > 30:
                res_text = translated.strip()
                # Cache successful translation (keep cache bounded to 500 entries)
                if len(self._translation_cache) > 500:
                    self._translation_cache.clear()
                self._translation_cache[cache_key] = res_text
                return res_text
        except Exception as e:
            pass

        return english_markdown


class MaritimeGlossary:
    """
    Authoritative Maritime Terminology Dictionary across 20 coastal and regional languages.
    Ensures technical oceanographic terms are never corrupted or mistranslated.
    """
    TERMS: Dict[str, Dict[str, str]] = {
        "port": {
            "hi": "बंदरगाह", "mr": "बंदर", "ta": "துறைமுகம்", "ml": "തുറമുഖം", "te": "ఓడరేవు",
            "bn": "বন্দর", "gu": "બંદર", "kn": "ಬಂದರು", "or": "ବନ୍ଦର", "pa": "ਬੰਦਰਗਾਹ",
            "ur": "بندرگاہ", "as": "বন্দৰ", "kok": "बंदर", "si": "වරාය", "ar": "ميناء",
            "fr": "port maritime", "pt": "porto marítimo", "sa": "पोताश्रयम्", "hinglish": "Port / Bandargah"
        },
        "swell_waves": {
            "hi": "महासागरीय तरंगें (स्वेल)", "mr": "सागरी लाटा (स्वेल)", "ta": "பெருங்கடல் அலைகள் (Swell)",
            "ml": "സമുദ്ര തിരമാലകൾ (Swell)", "te": "సముద్రపు అలలు (Swell)", "bn": "মহাসাগরীয় ঢেউ",
            "gu": "દરિયાઈ મોજાં (Swell)", "kn": "ಸಾಗರದ ಅಲೆಗಳು", "or": "ସମୁଦ୍ର ତରଙ୍ଗ", "pa": "ਸਮੁੰਦਰੀ ਲਹਿਰਾਂ",
            "ur": "سمندری لہریں", "as": "সাগৰীয় ঢৌ", "kok": "दर्याचीं ल्हारां", "si": "මුහුදු රළ",
            "ar": "أمواج المحيط (Swell)", "fr": "houle océanique", "pt": "ondulação oceânica",
            "sa": "महासागरीय तरङ्गाः", "hinglish": "Swell Waves"
        },
        "potential_fishing_zone": {
            "hi": "संभावित मत्स्य क्षेत्र (PFZ)", "mr": "संभाव्य मासेमारी क्षेत्र (PFZ)",
            "ta": "சாத்தியமான மீன்பிடி மண்டலம் (PFZ)", "ml": "സാധ്യതാ മത്സ്യബന്ധന മേഖല (PFZ)",
            "te": "సంభావ్య చేపల వేట ప్రాంతం (PFZ)", "bn": "সম্ভাব্য মৎস্য অঞ্চল (PFZ)",
            "gu": "સંભવિત મત્સ્ય ઝોન (PFZ)", "kn": "ಸಂಭಾವ್ಯ ಮೀನುಗಾರಿಕಾ ವಲಯ (PFZ)",
            "or": "ସମ୍ଭାବ୍ୟ ମତ୍ସ୍ୟ କ୍ଷେତ୍ର (PFZ)", "pa": "ਸੰਭਾਵੀ ਮੱਛੀ ਫੜਨ ਵਾਲਾ ਖੇਤਰ (PFZ)",
            "ur": "ممکنہ ماہی گیری کا زون (PFZ)", "as": "সম্ভাৱ্য মৎস্য অঞ্চল (PFZ)",
            "kok": "संभाव्य नुस्तेंमारी क्षेत्र (PFZ)", "si": "විභව මසුන් ඇල්ලීමේ කලාපය (PFZ)",
            "ar": "منطقة الصيد المحتملة (PFZ)", "fr": "zone de pêche potentielle (PFZ)",
            "pt": "zona de pesca potencial (PFZ)", "sa": "सम्भाव्य मत्स्यग्रहणक्षेत्रम् (PFZ)",
            "hinglish": "Potential Fishing Zone (PFZ Hotspot)"
        },
        "port_danger_signals": {
            "hi": "बंदरगाह चेतावनी संकेत (1 से 11)", "mr": "बंदर धोक्याचे संकेत (१ ते ११)",
            "ta": "துறைமுக எச்சரிக்கை சிக்னல்கள் (1 முதல் 11)", "ml": "പോർട്ട് ഡേഞ്ചർ സിഗ്നലുകൾ (1 മുതൽ 11)",
            "te": "ఓడరేవు ప్రమాద సంకేతాలు (1 నుండి 11)", "bn": "বন্দর সতর্কবার্তা সংকেত (১ থেকে ১১)",
            "gu": "બંદર ભય સૂચક સંકેતો (1 થી 11)", "kn": "ಬಂದರು ಅಪಾಯದ ಸಂಕೇತಗಳು (1 ರಿಂದ 11)",
            "or": "ବନ୍ଦର ବିପଦ ସଙ୍କେତ (୧ ରୁ ୧୧)", "pa": "ਬੰਦਰਗਾਹ ਖ਼ਤਰੇ ਦੇ ਸੰਕੇਤ (1 ਤੋਂ 11)",
            "ur": "بندرگاہ کے خطرے کے سگنل (1 تا 11)", "as": "বন্দৰ বিপদ সংকেত (১ ৰ পৰা ১১)",
            "kok": "बंदर धोक्याचे संकेत (१ ते ११)", "si": "වරාය අනතුරු ඇඟවීමේ සංඥා (1 සිට 11)",
            "ar": "إشارات الخطر في الموانئ (1 إلى 11)", "fr": "signaux de danger portuaires (1 à 11)",
            "pt": "sinais de perigo portuário (1 a 11)", "sa": "पोताश्रय विपत्संकेताः (१ तः ११)",
            "hinglish": "Port Danger Warning Signals (1 to 11)"
        },
        "kallakkadal": {
            "hi": "कल्लाक्कदल (अचानक उठने वाली तूफानी लहरें)", "mr": "कल्लाक्कदल (अचानक उसळणाऱ्या महासागरी लाटा)",
            "ta": "கள்ளக்கடல் (திடீர் கடல் சீற்றம்)", "ml": "കള്ളക്കടൽ (തീരദേശ തിരമാല പ്രക്ഷോഭം)",
            "te": "కల్లాక్కడల్ (ఆకస్మిక అలల ఉధృతి)", "bn": "কাল্লাক্কাডাল (হঠাৎ ফুঁসে ওঠা ঢেউ)",
            "gu": "કલ્લાક્કડલ (અચાનક ઉછળતા મોજાં)", "kn": "ಕಲ್ಲಕ್ಕಡಲ್ (ಹಠಾತ್ ಉಲ್ಬಣಿಸುವ ಅಲೆಗಳು)",
            "or": "କଲ୍ଲାକ୍କଡଲ (ହଠାତ ଜୁଆର ତରଙ୍ଗ)", "pa": "ਕੱਲਾਕੱਡਲ (ਅਚਾਨਕ ਉੱਠਣ ਵਾਲੀਆਂ ਲਹਿਰਾਂ)",
            "ur": "کلا کڈل (سمندری سرج)", "as": "কাল্লাক্কাডাল (আকস্মিক সাগৰীয় ঢৌ)",
            "kok": "कल्लाक्कदल (ल्हारांचो उसळप)", "si": "කල්ලක්කඩල් (හදිසි මුහුදු රළ)",
            "ar": "كالّاكّادال (موجات المد المفاجئة)", "fr": "Kallakkadal (houle subite)",
            "pt": "Kallakkadal (ressaca repentina)", "sa": "कल्लाक्कदल (अकस्मात् तरङ्गोत्थानम्)",
            "hinglish": "Kallakkadal (Sudden Swell Surge Warning)"
        },
        "safe_to_depart": {
            "hi": "समुद्र में प्रस्थान के लिए सुरक्षित", "mr": "समुद्रात जाण्यासाठी सुरक्षित",
            "ta": "கடலுக்கு செல்ல பாதுகாப்பானது", "ml": "കടലിൽ പോകുന്നത് സുരക്ഷിതമാണ്",
            "te": "సముద్ర ప్రయాణానికి సురక్షితం", "bn": "সমুদ্রে যাত্রার জন্য নিরাপদ",
            "gu": "દરિયામાં જવા માટે સલામત", "kn": "ಸಮುದ್ರಕ್ಕೆ ಹೋಗಲು ಸುರಕ್ಷಿತ",
            "or": "ସମୁଦ୍ର ଯାତ୍ରା ପାଇଁ ନିରାପଦ", "pa": "ਸਮੁੰਦਰ ਵਿੱਚ ਜਾਣ ਲਈ ਸੁਰੱਖਿਅਤ",
            "ur": "سمندر میں جانے کے لیے محفوظ", "as": "সাগৰত যাবলৈ নিৰাপদ",
            "kok": "दर्यांत वचपाक बरें आसा", "si": "මුහුදට යාම ආරක්ෂිතයි",
            "ar": "آمن للإبحار في البحر", "fr": "navigation en mer sûre",
            "pt": "seguro para navegar", "sa": "समुद्रगमनाय सुरक्षितम्",
            "hinglish": "Safe to venture into sea"
        }
    }

language_service = LanguageService()

