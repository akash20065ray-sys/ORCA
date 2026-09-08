import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Compass,
  RotateCcw,
  Bot,
  User,
  Plus,
  MessageSquare,
  Trash2,
  BarChart3,
  Waves,
  Wind,
  Thermometer,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Paperclip,
  FileText,
  MapPin,
  X,
} from 'lucide-react';
import { exportChatBriefingPDF } from '../utils/pdfExport';
import { useLanguage } from '../context/LanguageContext';

const VERNACULAR_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', native: '🌐 Auto', speechLang: 'hi-IN' },
  { code: 'en', label: 'English', native: 'English', speechLang: 'en-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', speechLang: 'hi-IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', speechLang: 'mr-IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', speechLang: 'ta-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', speechLang: 'ml-IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', speechLang: 'te-IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', speechLang: 'bn-IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', speechLang: 'gu-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', speechLang: 'kn-IN' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', speechLang: 'or-IN' },
  { code: 'kok', label: 'Konkani', native: 'कोंकणी', speechLang: 'kok-IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', speechLang: 'pa-IN' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', speechLang: 'as-IN' },
  { code: 'ur', label: 'Urdu', native: 'اردو', speechLang: 'ur-IN' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृतम्', speechLang: 'sa-IN' },
  { code: 'si', label: 'Sinhala', native: 'සිංහල', speechLang: 'si-LK' },
  { code: 'ar', label: 'Arabic', native: 'العربية', speechLang: 'ar-SA' },
  { code: 'fr', label: 'French', native: 'Français', speechLang: 'fr-FR' },
  { code: 'pt', label: 'Portuguese', native: 'Português', speechLang: 'pt-PT' },
];

const REGIONAL_SUGGESTIONS = {
  en: [
    'Is it safe to depart Cochin Port under current sea state?',
    'Find nearest Yellowfin Tuna PFZ hotspots near Munambam',
    'What is Kallakkadal and how should skippers prepare?',
    'Explain official IMD Port Warning Signals 1 through 11',
    'Analyze safest route from Mumbai to Goa avoiding rough swells',
  ],
  hi: [
    'क्या कल सुबह कोच्चि से प्रस्थान करना सुरक्षित है?',
    'मुनंबम के पास टूना मछली के हॉटस्पॉट कहाँ हैं?',
    'कल्लाक्कदल क्या है और मछुआरों को क्या सावधानी बरतनी चाहिए?',
    'आईएमडी पोर्ट डेंजर सिग्नल 1 से 11 के क्या अर्थ हैं?',
    'मुंबई से गोवा के लिए सबसे सुरक्षित समुद्री मार्ग बताएं',
  ],
  ta: [
    'நாளை காலை கொச்சி துறைமுகத்திலிருந்து புறப்படுவது பாதுகாப்பானதா?',
    'முனம்பம் அருகே சூரை மீன் (Tuna) அதிகம் உள்ள இடங்கள் எங்கே?',
    'கள்ளக்கடல் என்றால் என்ன, படகுகளை எவ்வாறு பாதுகாக்க வேண்டும்?',
    'துறைமுக எச்சரிக்கை சிக்னல்கள் 1 முதல் 11 வரை விளக்கம் தருக',
    'மும்பையிலிருந்து கோவா செல்ல பாதுகாப்பான கடல் வழித்தடம்',
  ],
  ml: [
    'നാളെ രാവിലെ കൊച്ചിയിൽ നിന്ന് കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?',
    'മുനമ്പത്തിന് സമീപമുള്ള ചൂര (Tuna) മീൻ ലഭ്യത അറിയുക',
    'കള്ളക്കടൽ എന്നാൽ എന്താണ്? വള്ളങ്ങൾ എങ്ങനെ സംരക്ഷിക്കണം?',
    'പോർട്ട് ഡേഞ്ചർ സിഗ്നലുകൾ 1 മുതൽ 11 വരെയുള്ള വിവരങ്ങൾ',
    'കൊച്ചിയിൽ നിന്ന് ലക്ഷദ്വീപിലേക്ക് ശാന്തമായ യാത്രാ റൂട്ട്',
  ],
  bn: [
    'আগামীকাল সকালে সমুদ্রে যাত্রা করা কি নিরাপদ?',
    'নিকটবর্তী টুনা মাছ ধরার সম্ভাব্য হটস্পট কোথায়?',
    'ঝড় ও ঢেউ এড়িয়ে সবচেয়ে নিরাপদ নেভিগেশন রুট',
    'বন্দর সতর্কবার্তা সিগন্যাল ১ থেকে ১১ এর অর্থ কী?',
  ],
  gu: [
    'શું વેરાવળથી આવતીકાલે સવારે દરિયામાં જવું સુરક્ષિત છે?',
    'નજીકના ટૂના ફિશિંગ હોટસ્પોટ ક્યાં આવેલા છે?',
    'તોફાની મોજાં ટાળીને સલામત દરિયાઈ માર્ગ બતાવો',
    'પોર્ટ ચેતવણી સિગ્નલ 1 થી 11 ની સમજૂતી આપો',
  ],
  mr: [
    'उद्या सकाळी मुंबई बंदरातून समुद्रात जाणे सुरक्षित आहे का?',
    'रत्नागिरी आणि मालवण जवळ टूना मासेमारीची ठिकाणे कुठे आहेत?',
    'कल्लाक्कदल (Kallakkadal) म्हणजे काय आणि नौकांचे रक्षण कसे करावे?',
    'आयएमडी बंदर धोक्याचे संकेत १ ते ११ चा अर्थ स्पष्ट करा',
    'मुंबई ते गोवा प्रवासासाठी सर्वात सुरक्षित सागरी मार्ग कोणता?',
  ],
};

const MARITIME_PORTS = [
  { name: 'Kochi', aliases: ['kochi', 'cochin', 'munambam', 'vypeen', 'kerala', 'beypore', 'calicut', 'kozhikode', 'vizhinjam', 'കൊച്ചി', 'മുനമ്പം', 'കോഴിക്കോട്', 'വിഴിഞ്ഞം', 'कोच्चि', 'कोचीन', 'கொச்சி', 'కొచ్చి', 'কোচি', 'કોચી'], lat: 9.9656, lon: 76.2425, zoom: 9 },
  { name: 'Mumbai', aliases: ['mumbai', 'bombay', 'sassoon', 'maharashtra', 'ratnagiri', 'alibaug', 'मुंबई', 'बम्बई', 'மும்பை', 'മുംബൈ', 'ముంబై', 'মুম্বাই', 'મુંબઈ'], lat: 18.9220, lon: 72.8347, zoom: 9 },
  { name: 'Chennai', aliases: ['chennai', 'madras', 'pulicat', 'tamil nadu', 'kasimedu', 'ennore', 'चेन्नई', 'சென்னை', 'ചെന്നൈ', 'చెన్నై', 'চেন্নাই', 'ચેન્નાઈ'], lat: 13.0827, lon: 80.2707, zoom: 9 },
  { name: 'Visakhapatnam', aliases: ['visakhapatnam', 'vizag', 'andhra', 'kakinada', 'machilipatnam', 'విశాఖపట్నం', 'వైజాగ్', 'కాకినాడ', 'विशाखापट्टनम', 'விசாகப்பட்டினம்'], lat: 17.6868, lon: 83.2185, zoom: 9 },
  { name: 'Goa', aliases: ['goa', 'mormugao', 'panaji', 'panjim', 'vasco', 'गोवा', 'पणजी', 'கோவா', 'ഗോവ', 'గోవా', 'গোয়া'], lat: 15.4989, lon: 73.8278, zoom: 9 },
  { name: 'Mangalore', aliases: ['mangalore', 'mangaluru', 'karnataka', 'karwar', 'malpe', 'udupi', 'ಮಂಗಳೂರು', 'ಕಾರವಾರ', 'मंगलौर', 'மங்களூர்', 'മംഗലാപുരം'], lat: 12.9141, lon: 74.8560, zoom: 9 },
  { name: 'Tuticorin', aliases: ['tuticorin', 'thoothukudi', 'mannar', 'kanyakumari', 'wadge', 'colachel', 'தூத்துக்குடி', 'கன்னியாகுமரி', 'तूतीकोरिन', 'തൂത്തുക്കുടി'], lat: 8.7642, lon: 78.1348, zoom: 9 },
  { name: 'Veraval', aliases: ['veraval', 'porbandar', 'gujarat', 'saurashtra', 'okha', 'kandla', 'mundra', 'વેરાવળ', 'પોરબંદર', 'કંડલા', 'ઓખા', 'वेरावल', 'पोरबंदर'], lat: 20.9000, lon: 70.3667, zoom: 9 },
  { name: 'Paradip', aliases: ['paradip', 'paradeep', 'odisha', 'sundarbans', 'bengal', 'haldia', 'digha', 'dhamra', 'puri', 'kolkata', 'पारादीप', 'কলকাতা', 'দীঘা', 'পারাদীপ'], lat: 20.3160, lon: 86.6110, zoom: 9 },
  { name: 'Port Blair', aliases: ['port blair', 'andaman', 'nicobar', 'havelock', 'पोर्ट ब्लेयर', 'अंडमान', 'அந்தமான்', 'പോർട്ട് ബ്ലെയർ'], lat: 11.6234, lon: 92.7265, zoom: 9 },
  { name: 'Minicoy', aliases: ['minicoy', 'lakshadweep', 'kavaratti', 'agatti', 'लक्षद्वीप', 'कावारत्ती', 'ലക്ഷദ്വീപ്', 'കവരത്തി'], lat: 8.2833, lon: 73.0500, zoom: 9 },
];

const LOCAL_STORAGE_KEY = 'orca_ai_chat_sessions_v7';
const AUTO_SPEECH_STORAGE_KEY = 'orca_auto_speech_v3';

const makeUniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AskOrcaChat({
  onShowOnMap,
  onMapAction,
  isDedicatedPage = false,
  selectedMapTarget = null,
  onClearMapTarget = null,
  shipLocation = null,
}) {
  const [isAutoSpeechEnabled, setIsAutoSpeechEnabled] = useState(() => {
    try {
      return localStorage.getItem(AUTO_SPEECH_STORAGE_KEY) === 'true';
    } catch {
      return false; // Initially OFF by default as requested by user
    }
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'session-default',
        title: 'Maritime Intelligence Copilot',
        createdAt: new Date().toLocaleDateString(),
        messages: [],
        lastLocation: null,
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions[0]?.id || 'session-default';
  });

  const { currentLang, setLanguage: setGlobalLang, languages: appLanguages, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(currentLang || 'en');

  // Synchronize local selectedLang with global currentLang from LanguageContext
  useEffect(() => {
    if (currentLang && currentLang !== selectedLang) {
      setSelectedLang(currentLang);
    }
  }, [currentLang]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [expandedTraceIds, setExpandedTraceIds] = useState([]);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Multimodal File / Image Attachment State
  const [attachedFile, setAttachedFile] = useState(null); // { name, type, size, base64, previewUrl }
  const fileInputRef = useRef(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechKeepaliveRef = useRef(null);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (speechKeepaliveRef.current) {
        clearInterval(speechKeepaliveRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  // Current session messages
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = useMemo(() => {
    return currentSession ? currentSession.messages : [];
  }, [currentSession]);

  // Initialize Speech Recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) { }
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice Input Toggle (Strict Regional Language-Locked Dictation)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const sampleQueries = (selectedLang && REGIONAL_SUGGESTIONS[selectedLang]) || REGIONAL_SUGGESTIONS.en;
      setInputQuery(sampleQueries[0]);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) { }
      }
      setIsListening(false);
    } else {
      try {
        // Cancel active speech synthesis so audio playback does not interfere with mic
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (speechKeepaliveRef.current) {
          clearInterval(speechKeepaliveRef.current);
          speechKeepaliveRef.current = null;
        }
        setSpeakingMsgId(null);

        const langMap = {
          auto: 'en-IN',
          en: 'en-IN',
          mr: 'mr-IN',
          hi: 'hi-IN',
          ta: 'ta-IN',
          ml: 'ml-IN',
          te: 'te-IN',
          bn: 'bn-IN',
          gu: 'gu-IN',
          kn: 'kn-IN',
          or: 'or-IN',
          kok: 'mr-IN',
          pa: 'pa-IN',
          as: 'as-IN',
          ur: 'ur-IN',
          sa: 'sa-IN',
          si: 'si-LK',
          ar: 'ar-SA',
          fr: 'fr-FR',
          pt: 'pt-PT'
        };

        const targetSpeechLang = langMap[selectedLang] || 'en-IN';
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = targetSpeechLang;

        recog.onstart = () => setIsListening(true);
        recog.onaudiostart = () => setIsListening(true);
        recog.onsoundstart = () => setIsListening(true);
        recog.onspeechstart = () => setIsListening(true);

        recog.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInputQuery(transcript);
        };

        recog.onerror = (e) => {
          console.warn('SpeechRecognition error:', e);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
        recog.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Unable to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // File Attachment Handling
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        base64: reader.result,
        previewUrl: file.type.startsWith('image/') ? reader.result : null,
      });
    };
    reader.readAsDataURL(file);
  };

  // Helper to strip markdown and format text cleanly for natural voice output
  const cleanTextForSpeech = (rawText) => {
    if (!rawText) return '';
    let t = rawText;
    // Strip markdown links: [label](url) -> label
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Strip markdown images: ![alt](url) -> ''
    t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    // Strip table formatting dashes: |---|---|
    t = t.replace(/\|[\s-:]+\|/g, ' ');
    // Replace table pipes with commas for natural pauses
    t = t.replace(/\|/g, ', ');
    // Strip bold/italic/code markers
    t = t.replace(/[*#`_~]/g, '');
    // Strip bullet points at line starts
    t = t.replace(/^[\s]*[-+*]\s+/gm, '');
    // Replace multiple newlines with periods
    t = t.replace(/\n\s*\n/g, '. ').replace(/\n/g, ', ');
    // Replace repeated spaces
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t;
  };

  // Detect script from text to ensure authentic native pronunciation
  const detectScriptLang = (str, preferredLang = null) => {
    if (!str) return null;
    if (/[\u0B80-\u0BFF]/.test(str)) return 'ta'; // Tamil
    if (/[\u0D00-\u0D7F]/.test(str)) return 'ml'; // Malayalam
    if (/[\u0C00-\u0C7F]/.test(str)) return 'te'; // Telugu
    if (/[\u0C80-\u0CFF]/.test(str)) return 'kn'; // Kannada
    if (/[\u0980-\u09FF]/.test(str)) return 'bn'; // Bengali
    if (/[\u0A80-\u0AFF]/.test(str)) return 'gu'; // Gujarati
    if (/[\u0B00-\u0B7F]/.test(str)) return 'or'; // Odia
    if (/[\u0A00-\u0A7F]/.test(str)) return 'pa'; // Punjabi
    if (/[\u0600-\u06FF]/.test(str)) return 'ur'; // Urdu
    if (/[\u0900-\u097F]/.test(str)) {
      if (preferredLang === 'mr' || preferredLang === 'kok' || /आहे|नाही|करा|दाखवा|लाटा|मासे|सागरी|क्षेत्र|हवामान|असेल|होते/.test(str)) {
        return 'mr'; // Marathi
      }
      return 'hi'; // Hindi
    }
    return null;
  };

  // Text to Speech with Native Regional Speech Synthesis
  const toggleSpeech = (msgId, text, msgLang) => {
    if (!window.speechSynthesis) return;

    if (speechKeepaliveRef.current) {
      clearInterval(speechKeepaliveRef.current);
      speechKeepaliveRef.current = null;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    // Prioritize explicit message language > user's selected language > detected script fallback
    let resolvedLang = (msgLang && msgLang !== 'auto')
      ? msgLang
      : (selectedLang && selectedLang !== 'auto' ? selectedLang : null);

    if (!resolvedLang) {
      resolvedLang = detectScriptLang(clean, selectedLang) || 'en';
    }

    const SPEECH_LANG_MAP = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      ml: 'ml-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      gu: 'gu-IN',
      mr: 'mr-IN',
      kn: 'kn-IN',
      or: 'or-IN',
      kok: 'mr-IN',
      pa: 'pa-IN',
      as: 'as-IN',
      ur: 'ur-IN',
      sa: 'sa-IN',
      si: 'si-LK',
      ar: 'ar-SA',
      fr: 'fr-FR',
      pt: 'pt-PT',
    };
    const bcpTag = SPEECH_LANG_MAP[resolvedLang] || 'en-IN';
    utterance.lang = bcpTag;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const matched = voices.find((v) => v.lang === bcpTag) ||
        voices.find((v) => v.lang.replace('_', '-').toLowerCase() === bcpTag.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(resolvedLang.toLowerCase())) ||
        (resolvedLang === 'en' ? voices.find((v) => v.lang.includes('en-IN') || v.lang.startsWith('en')) : null);
      if (matched) {
        utterance.voice = matched;
      }
    }

    const stopSpeech = () => {
      if (speechKeepaliveRef.current) {
        clearInterval(speechKeepaliveRef.current);
        speechKeepaliveRef.current = null;
      }
      setSpeakingMsgId(null);
    };

    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;

    // Chromium keepalive for long speech synthesis
    speechKeepaliveRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        if (speechKeepaliveRef.current) {
          clearInterval(speechKeepaliveRef.current);
          speechKeepaliveRef.current = null;
        }
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Direct Download: Export Chat Briefing as PDF directly into user's Downloads folder (No print/save dialog)
  const handleDownloadPDF = () => {
    if (messages.length === 0) return;
    const sessionTitle = currentSession?.title || 'Maritime Intelligence Briefing';
    try {
      exportChatBriefingPDF(messages, sessionTitle);
    } catch (err) {
      console.error('Failed to export chat briefing PDF:', err);
    }
  };

  // Copy Message to Clipboard
  const handleCopy = (msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  // Toggle Reasoning Trace Accordion
  const toggleTrace = (msgId) => {
    setExpandedTraceIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  // Create New Chat Session
  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Maritime Inquiry',
      createdAt: new Date().toLocaleDateString(),
      messages: [],
      lastLocation: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  // Delete Session
  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([
        {
          id: 'session-default',
          title: 'Maritime Intelligence Copilot',
          createdAt: new Date().toLocaleDateString(),
          messages: [],
          lastLocation: null,
        },
      ]);
      return;
    }
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
  };

  // Submit Query to real backend API
  const handleSend = async (queryToSend = null) => {
    const rawQuery = (queryToSend || inputQuery).trim();
    if ((!rawQuery && !attachedFile) || isLoading) return;

    const query = rawQuery || (attachedFile ? `Inspect attached maritime file: ${attachedFile.name}` : '');
    const currentAttachment = attachedFile ? { ...attachedFile } : null;

    const lowerQuery = query.toLowerCase();
    const matchedPort = MARITIME_PORTS.find((p) =>
      p.aliases.some((alias) => lowerQuery.includes(alias))
    );

    // Resolve active reference location: matched port > clicked map target > user's home port > default Kochi
    const activeLat = matchedPort?.lat ?? selectedMapTarget?.lat ?? shipLocation?.lat ?? 9.9656;
    const activeLon = matchedPort?.lon ?? selectedMapTarget?.lon ?? shipLocation?.lon ?? 76.2425;
    const activeName = matchedPort?.name ?? (selectedMapTarget ? `Selected Map Point (${activeLat.toFixed(3)}°N, ${activeLon.toFixed(3)}°E)` : (shipLocation?.name ?? 'Cochin Port (Kochi)'));

    // Immediate Real-Time Map Actions on Query Dispatch
    if (onMapAction) {
      if (matchedPort) {
        onMapAction({
          type: 'flyto',
          data: { lat: matchedPort.lat, lon: matchedPort.lon, zoom: matchedPort.zoom },
        });
      } else if (selectedMapTarget) {
        onMapAction({
          type: 'flyto',
          data: { lat: selectedMapTarget.lat, lon: selectedMapTarget.lon, zoom: 10 },
        });
      }

      const isPfz = /pfz|fish|fishing|tuna|mackerel|sardine|catch|chlorophyll|hotspot|मछली|टूना|मीन|சூரை|മീൻ|ചൂര|చేపలు|మాছ|માછલી|मासे|ಮೀನು/i.test(query);
      const isRoute = /route|navigate|navigation|waypoint|from .* to|मार्ग|வழி|റൂട്ട്|మార్గం|পথ|રૂટ/i.test(query);
      const isNegativeWave = /mat dikhao|nahin dekhna|nahi dekhna|not show|don'?t show/i.test(query);

      if (isRoute) {
        onMapAction({ type: 'weather', mode: 'none' });
      } else if (isPfz) {
        onMapAction({ type: 'weather', mode: 'none' });
        onMapAction({
          type: 'pfz',
          data: {
            latitude: activeLat,
            longitude: activeLon,
            origin_lat: activeLat,
            origin_lon: activeLon,
            origin_name: activeName,
            landing_center: activeName,
            name: `${activeName} PFZ Region`,
          }
        });
      } else if (/wave|swell|sea state/i.test(query) && !isNegativeWave) {
        onMapAction({ type: 'weather', mode: 'waves' });
      } else if (/current|drift/i.test(query)) {
        onMapAction({ type: 'weather', mode: 'currents' });
      } else if (/wind|gust|cyclone|squall|monsoon/i.test(query)) {
        onMapAction({ type: 'weather', mode: 'wind' });
      }
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: makeUniqueId('user'),
      sender: 'user',
      text: query,
      timestamp: timeString,
      language: 'auto',
      attachment: currentAttachment,
    };

    // Update session title if first message
    const updatedTitle = messages.length === 0 ? query.slice(0, 36) + (query.length > 36 ? '...' : '') : currentSession.title;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: updatedTitle,
            messages: [...s.messages, userMsg],
          };
        }
        return s;
      })
    );

    setInputQuery('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsLoading(true);
    setLoadingStatus(
      currentAttachment
        ? `Ingesting & analyzing ${currentAttachment.name} with 8 collaborative maritime agents...`
        : 'Consulting 8 collaborative agents & INCOIS ocean telemetry...'
    );

    try {
      const latToSend = matchedPort
        ? matchedPort.lat
        : selectedMapTarget
          ? selectedMapTarget.lat
          : shipLocation
            ? shipLocation.lat
            : null;
      const lonToSend = matchedPort
        ? matchedPort.lon
        : selectedMapTarget
          ? selectedMapTarget.lon
          : shipLocation
            ? shipLocation.lon
            : null;
      const locNameToSend = matchedPort
        ? matchedPort.name
        : selectedMapTarget
          ? `Lat ${selectedMapTarget.lat.toFixed(4)}, Lon ${selectedMapTarget.lon.toFixed(4)}`
          : shipLocation?.name || currentSession?.lastLocation || null;

      const chatHistoryToSend = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          session_id: activeSessionId,
          language: selectedLang,
          latitude: latToSend,
          longitude: lonToSend,
          location_name: locNameToSend,
          chat_history: chatHistoryToSend,
          attachment_base64: currentAttachment ? currentAttachment.base64 : null,
          attachment_name: currentAttachment ? currentAttachment.name : null,
          attachment_type: currentAttachment ? currentAttachment.type : null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const responseText = data.synthesized_response || 'Ocean intelligence report generated.';
      const effectiveLanguage = (data.detected_language && data.detected_language !== 'auto')
        ? data.detected_language
        : (selectedLang !== 'auto' ? selectedLang : 'en');

      // Real-Time Autonomous Map Synchronization on Intelligence Response:
      if (onMapAction) {
        const isPfzQuery = data.intent === 'potential_fishing_zone' ||
          data.intent === 'chlorophyll_sst_correlation' ||
          /pfz|fish|tuna|mackerel|sardine|catch|chlorophyll|hotspot|मछली|टूना|மீன்|சூரை|മീൻ|ചൂര|చేపలు|మాছ|માછલી|मासे|ಮೀನು/i.test(query);

        const isRouteQuery = data.intent === 'marine_routing' ||
          /route|navigate|navigation|waypoint|from .* to|मार्ग|வழி|റൂട്ട്|మార్గం|পথ|રૂટ/i.test(query);

        const isWeatherQuery = data.intent === 'ocean_condition_telemetry' ||
          data.intent === 'weather_inquiry' ||
          /wave|swell|sea state|wind|gust|लहर|तरंग|मौसम|அலை|வானிலை|തിര|കാലാവസ്ഥ|అలలు|వాతావరణం|ঢেউ|હવામાન|लाटा/i.test(query);

        if (isPfzQuery) {
          const advisories = data.pfz_advisories && data.pfz_advisories.length > 0 ? data.pfz_advisories : null;
          const targetPfz = advisories ? advisories[0] : {
            latitude: data.target_coordinates?.latitude || activeLat,
            longitude: data.target_coordinates?.longitude || activeLon,
            origin_lat: activeLat,
            origin_lon: activeLon,
            origin_name: activeName,
            name: `${data.target_location || activeName} PFZ Hotspot`,
            landing_center: data.target_location || activeName,
            species: 'Yellowfin Tuna, Mackerel, Sardine',
            confidence: '92%'
          };
          onMapAction({ type: 'weather', mode: 'none' });
          onMapAction({
            type: 'pfz',
            data: targetPfz,
            allZones: advisories || [targetPfz],
          });
        } else if (isRouteQuery) {
          onMapAction({ type: 'weather', mode: 'none' });
          if (data.routes && data.routes.length > 0) {
            const chosenRoute = data.routes.find((r) => r.safety_score >= 90) || data.routes[0];
            onMapAction({ type: 'route', data: chosenRoute });
          }
        } else if (data.intent === 'port_inquiry' || data.intent === 'display_port_information') {
          if (data.target_coordinates?.latitude && data.target_coordinates?.longitude) {
            onMapAction({
              type: 'flyto',
              data: {
                lat: data.target_coordinates.latitude,
                lon: data.target_coordinates.longitude,
                zoom: 10,
                title: data.target_location || 'Maritime Coastal Port Network',
              },
            });
          }
        } else if (isWeatherQuery) {
          onMapAction({ type: 'weather', mode: /wind|gust/i.test(query) ? 'wind' : 'waves' });
          if (data.target_coordinates?.latitude && data.target_coordinates?.longitude) {
            onMapAction({
              type: 'flyto',
              data: {
                lat: data.target_coordinates.latitude,
                lon: data.target_coordinates.longitude,
                zoom: 10,
                title: data.target_location || 'Weather Telemetry Target',
              },
            });
          }
        } else if (data.target_coordinates && data.target_coordinates.latitude && data.target_coordinates.longitude && data.intent !== 'greeting' && data.intent !== 'out_of_domain') {
          onMapAction({
            type: 'flyto',
            data: {
              lat: data.target_coordinates.latitude,
              lon: data.target_coordinates.longitude,
              zoom: 11,
              title: data.target_location || 'ORCA Intelligence Target',
            },
          });
        }
      }

      const orcaMsgId = makeUniqueId('orca');
      const orcaMsg = {
        id: orcaMsgId,
        sender: 'orca',
        text: responseText,
        timestamp: timeString,
        risk: data.risk_assessment,
        telemetry: data.telemetry,
        routes: data.routes,
        pfz: data.pfz_advisories,
        matchedPort: matchedPort,
        query: query,
        intent: data.intent,
        execution_trace: data.execution_trace || [],
        target_location: data.target_location,
        target_coordinates: data.target_coordinates,
        language: effectiveLanguage,
        attachment_metadata: data.attachment_metadata,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, orcaMsg],
              lastLocation:
                data.target_location &&
                  data.intent !== 'greeting' &&
                  data.intent !== 'out_of_domain'
                  ? data.target_location
                  : s.lastLocation,
            };
          }
          return s;
        })
      );

      // 1-Click Voice Auto-Speech: Automatically speak incoming response in native regional voice if enabled
      if (isAutoSpeechEnabled) {
        setTimeout(() => {
          toggleSpeech(orcaMsgId, responseText, effectiveLanguage);
        }, 250);
      }
    } catch (err) {
      const errMsg = {
        id: makeUniqueId('err'),
        sender: 'orca',
        text: `Unable to fetch marine intelligence: ${err.message}. Please check server connection.`,
        timestamp: timeString,
        language: 'en',
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, errMsg],
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper for rendering formatted markdown text with tables, headings, lists, and inline styles
  const renderFormattedMarkdown = (rawText) => {
    if (!rawText) return null;
    const rawLines = rawText.split('\n');
    const elements = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // 1. Markdown Table Detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
        const tableLines = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        // Parse table rows
        if (tableLines.length >= 2) {
          const parseRow = (rowStr) =>
            rowStr
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim());

          const headerRow = parseRow(tableLines[0]);
          // Check if line 1 is separator |---|---|
          const isSep = tableLines[1].replace(/[\s\-|:]/g, '') === '';
          const bodyLines = isSep ? tableLines.slice(2) : tableLines.slice(1);

          elements.push(
            <div key={`tbl-${elements.length}`} className="msg-table-wrap">
              <table className="msg-table">
                <thead>
                  <tr>
                    {headerRow.map((h, hIdx) => (
                      <th key={hIdx}>{formatInlineText(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyLines.map((bLine, rIdx) => {
                    const cells = parseRow(bLine);
                    return (
                      <tr key={rIdx}>
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx}>{formatInlineText(cell)}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 2. Headings
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="msg-h2">
            {formatInlineText(trimmed.replace(/^#\s+/, ''))}
          </h2>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="msg-h2">
            {formatInlineText(trimmed.replace(/^##\s+/, ''))}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="msg-h3">
            {formatInlineText(trimmed.replace(/^###\s+/, ''))}
          </h3>
        );
      } else if (trimmed.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="msg-h4">
            {formatInlineText(trimmed.replace(/^####\s+/, ''))}
          </h4>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        elements.push(
          <li key={`li-${i}`} className="msg-li">
            {formatInlineText(trimmed.replace(/^[-*•]\s+/, ''))}
          </li>
        );
      } else if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(
          <li key={`numli-${i}`} className="msg-li msg-numbered-li">
            {formatInlineText(trimmed.replace(/^\d+\.\s+/, ''))}
          </li>
        );
      } else if (trimmed === '') {
        elements.push(<div key={`sp-${i}`} className="msg-space" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="msg-p">
            {formatInlineText(trimmed)}
          </p>
        );
      }
      i++;
    }

    return elements;
  };

  const formatInlineText = (text) => {
    if (!text) return text;
    // Replace **bold**, *italic*, and `code`
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="msg-inline-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className={`ask-orca-container ${isDedicatedPage ? 'dedicated-page-view' : 'dock-view'}`}>
      {/* If Dedicated Page: Show Chat Sessions History Sidebar */}
      {isDedicatedPage && (
        <aside className="chat-history-sidebar">
          <div className="history-sidebar-top">
            <button type="button" className="btn-new-chat" onClick={createNewSession}>
              <Plus size={16} />
              <span>New Inquiry</span>
            </button>
          </div>

          <div className="history-sessions-list">
            <span className="history-section-lbl">SAVED INQUIRY SESSIONS</span>
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  className={`session-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSessionId(sess.id)}
                >
                  <MessageSquare size={15} className="session-icon" />
                  <div className="session-text-wrap">
                    <span className="session-title">{sess.title}</span>
                    <span className="session-date">{sess.createdAt}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-delete-session"
                    onClick={(e) => deleteSession(e, sess.id)}
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Main Chat Conversation Column */}
      <div className="chat-main-column">
        {/* Top Header */}
        <div className={`chat-top-bar ${!isDedicatedPage ? 'dock-mode' : ''}`}>
          {isDedicatedPage ? (
            <div className="chat-title-group">
              <Bot size={20} className="icon-orca-ai" />
              <div>
                <h3 className="chat-heading">
                  {currentSession?.title || 'ORCA AI Marine Copilot'}
                </h3>
                <span className="chat-sub">8 Collaborative Specialized Maritime Agents</span>
              </div>
            </div>
          ) : (
            <div className="dock-status-pill">
              <span className="status-live-dot" />
              <span className="dock-status-text">8 Maritime Agents Active</span>
            </div>
          )}

          <div className="chat-top-actions">
            {/* Language Selector */}
            <div className="chat-lang-pill-wrap" title={t('selectLanguage', 'Select response & voice language')}>
              <Globe size={13} className="lang-globe-icon" />
              <select
                id="orca-chat-lang-select"
                className="chat-lang-select"
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setGlobalLang(e.target.value);
                }}
              >
                {appLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag || '🌐'} {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            {/* 1-Click Voice Auto-Speech Toggle */}
            <button
              type="button"
              className={`btn-speech-toggle ${isAutoSpeechEnabled ? 'active' : ''}`}
              onClick={() => {
                const next = !isAutoSpeechEnabled;
                setIsAutoSpeechEnabled(next);
                try {
                  localStorage.setItem(AUTO_SPEECH_STORAGE_KEY, String(next));
                } catch (_) { }
                if (!next) {
                  if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  if (speechKeepaliveRef.current) {
                    clearInterval(speechKeepaliveRef.current);
                    speechKeepaliveRef.current = null;
                  }
                  setSpeakingMsgId(null);
                } else {
                  // Instant audio feedback: read aloud the latest assistant message if available
                  const currentSess = sessions.find((s) => s.id === activeSessionId);
                  const lastAssistantMsg = currentSess?.messages?.filter((m) => m.sender === 'orca').slice(-1)[0];
                  if (lastAssistantMsg) {
                    setTimeout(() => {
                      toggleSpeech(lastAssistantMsg.id, lastAssistantMsg.text, lastAssistantMsg.language);
                    }, 150);
                  }
                }
              }}
              title={isAutoSpeechEnabled ? 'Voice Auto-Speech is ON (Click to mute)' : 'Voice Auto-Speech is OFF (Click to turn ON)'}
            >
              {isAutoSpeechEnabled ? <Volume2 size={13} className="voice-speaking-pulse" /> : <VolumeX size={13} />}
              <span>{isAutoSpeechEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn-chat-reset"
                  onClick={handleDownloadPDF}
                  title="Download complete conversation as official PDF"
                  style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  className="btn-chat-reset"
                  onClick={() => {
                    setSessions((prev) =>
                      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
                    );
                  }}
                  title="Clear current messages"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <div className="chat-empty-interactive">
              <div className="empty-copilot-badge">
                <div className="empty-ai-icon-wrap">
                  <Bot size={28} className="empty-sparkle-icon" />
                </div>
                <h4 className="empty-title">
                  {selectedLang === 'mr' ? 'ORCA सागरी गुप्तवार्ता सहाय्यक' : 'ORCA Autonomous Marine AI Copilot'}
                </h4>
                <p className="empty-desc">
                  {selectedLang === 'mr'
                    ? 'लाटा, हवामान, संभाव्य मासेमारी क्षेत्र (PFZ), बंदर धोक्याचे संकेत आणि सागरी सुरक्षेबद्दल कोणताही प्रश्न विचारा.'
                    : 'Real-time multi-agent decision support for wave states, PFZ hotspots, port danger signals, and vessel collision avoidance.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const hasTrace = msg.execution_trace && msg.execution_trace.length > 0;
                const isTraceExpanded = expandedTraceIds.includes(msg.id);

                return (
                  <div key={msg.id} className={`chat-message-row ${isUser ? 'user-row' : 'orca-row'}`}>
                    <div className={`message-avatar ${isUser ? 'user' : 'orca'}`}>
                      {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div className={`message-bubble ${isUser ? 'user-bubble' : 'orca-bubble'}`}>
                      <div className="bubble-header">
                        <span className="bubble-sender">{isUser ? 'Captain' : 'ORCA AI Copilot'}</span>
                        <span className="bubble-time">{msg.timestamp}</span>
                        {!isUser && (
                          <div className="bubble-header-tools">
                            <button
                              type="button"
                              className="btn-tts"
                              onClick={() => handleCopy(msg.id, msg.text)}
                              title={copiedMsgId === msg.id ? 'Copied!' : 'Copy report'}
                            >
                              {copiedMsgId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <button
                              type="button"
                              className={`btn-tts ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                              onClick={() => toggleSpeech(msg.id, msg.text, msg.language)}
                              title={speakingMsgId === msg.id ? 'Stop audio' : 'Read aloud in regional voice'}
                            >
                              {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bubble-content">
                        {isUser && msg.attachment && (
                          <div className="msg-user-attachment-wrap" style={{ marginBottom: '8px' }}>
                            {msg.attachment.previewUrl ? (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                  src={msg.attachment.previewUrl}
                                  alt={msg.attachment.name}
                                  style={{ maxWidth: '240px', maxHeight: '160px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', objectFit: 'cover' }}
                                  onClick={() => window.open(msg.attachment.previewUrl, '_blank')}
                                  title="Click to expand image"
                                />
                                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '3px', fontWeight: 600 }}>
                                  📎 {msg.attachment.name} ({Math.round((msg.attachment.size || 0) / 1024)} KB)
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dcfce7', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
                                <FileText size={18} />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{msg.attachment.name}</div>
                                  <div style={{ fontSize: '10px', color: '#15803d' }}>{Math.round((msg.attachment.size || 0) / 1024)} KB · Ingested Document</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="formatted-msg-body">
                          {renderFormattedMarkdown(msg.text)}
                        </div>

                        {/* Multi-Agent Reasoning Trace Accordion ("Thinking Chain") */}
                        {hasTrace && (
                          <div className="agent-trace-accordion">
                            <button
                              type="button"
                              className="trace-toggle-bar"
                              onClick={() => toggleTrace(msg.id)}
                            >
                              <div className="trace-bar-left">
                                <Zap size={14} className="trace-zap-icon" />
                                <span className="trace-label">Collaborative Multi-Agent Trace</span>
                                <span className="trace-badge">{msg.execution_trace.length} Agents</span>
                              </div>
                              <div className="trace-bar-right">
                                <span className="trace-total-ms">
                                  {Math.round(
                                    msg.execution_trace.reduce((acc, s) => acc + (s.duration_ms || 0), 0)
                                  )}{' '}
                                  ms
                                </span>
                                {isTraceExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                            </button>

                            {isTraceExpanded && (
                              <div className="trace-steps-list">
                                {msg.execution_trace.map((step, sIdx) => (
                                  <div key={sIdx} className="trace-step-item">
                                    <div className="trace-timeline-col">
                                      <span className="trace-dot" />
                                      {sIdx < msg.execution_trace.length - 1 && <span className="trace-line" />}
                                    </div>
                                    <div className="trace-card-content">
                                      <div className="trace-card-header">
                                        <span className="trace-agent-title">{step.agent_title || step.agent_name}</span>
                                        <div className="trace-meta-pills">
                                          <span className="trace-duration-tag">{step.duration_ms} ms</span>
                                          <span className="trace-status-tag">🟢 {step.status}</span>
                                        </div>
                                      </div>
                                      <p className="trace-summary-txt">{step.summary}</p>
                                      {step.output_preview && Object.keys(step.output_preview).length > 0 && (
                                        <div className="trace-preview-pills">
                                          {Object.entries(step.output_preview).map(([k, v]) => (
                                            <span key={k} className="trace-micro-pill">
                                              <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive Visual Telemetry & Safety Charts: Render ONLY when explicitly evaluating safety/risk */}
                        {msg.risk && (msg.intent === 'safety_assessment' || msg.intent === 'sea_safety_assessment' || msg.intent === 'risk_inquiry' || (msg.query && /risk|gauge|safety score|is it safe|खतरा|सुरक्षित|பாதுகாப்பு|അപകടം/i.test(msg.query))) && (
                          <div className="ai-charts-card">
                            <div className="chart-header-row">
                              <BarChart3 size={15} className="chart-icon" />
                              <span className="chart-title">Real-Time Maritime Risk & Telemetry Gauge</span>
                            </div>

                            <div className="chart-metrics-grid">
                              {/* Safety Score Radial Gauge */}
                              <div className="metric-gauge-box">
                                <div className="gauge-ring-wrap">
                                  <svg className="gauge-svg" viewBox="0 0 36 36">
                                    <path
                                      className="gauge-bg"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                      className="gauge-progress"
                                      strokeDasharray={`${msg.risk.risk_score ?? 35}, 100`}
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <text x="18" y="20.35" className="gauge-text">
                                      {msg.risk.risk_score ?? 35}%
                                    </text>
                                  </svg>
                                </div>
                                <div className="gauge-details">
                                  <span className="g-lbl">RISK INDEX</span>
                                  <span className="g-val">{msg.risk.is_safe_to_sail ? 'Safe to Venture' : 'Advisory Caution'}</span>
                                </div>
                              </div>

                              {/* Wind & Swell Bar Comparison */}
                              <div className="telemetry-bars-box">
                                <div className="bar-row">
                                  <div className="bar-lbl-group">
                                    <Wind size={13} />
                                    <span>Wind Speed</span>
                                  </div>
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill wind"
                                      style={{ width: `${Math.min(100, ((msg.telemetry?.wind_speed_knots ?? 14) / 35) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="bar-val">{msg.telemetry?.wind_speed_knots ?? 14} kt</span>
                                </div>

                                <div className="bar-row">
                                  <div className="bar-lbl-group">
                                    <Waves size={13} />
                                    <span>Wave Swell</span>
                                  </div>
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill wave"
                                      style={{ width: `${Math.min(100, ((msg.telemetry?.wave_height_meters ?? 1.4) / 4.0) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="bar-val">{msg.telemetry?.wave_height_meters ?? 1.4} m</span>
                                </div>

                                <div className="bar-row">
                                  <div className="bar-lbl-group">
                                    <Thermometer size={13} />
                                    <span>SST Water</span>
                                  </div>
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill sst"
                                      style={{ width: `${Math.min(100, (((msg.telemetry?.sst_celsius ?? 28.5) - 22) / 12) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="bar-val">{msg.telemetry?.sst_celsius ?? 28.5} °C</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Interactive Map Actions Connected to Live Map */}
                        {(msg.routes || msg.pfz || msg.telemetry || msg.matchedPort || (msg.target_coordinates?.latitude && msg.target_coordinates?.longitude)) && (
                          <div className="msg-interactive-actions">
                            {msg.target_coordinates && msg.target_coordinates.latitude && msg.target_coordinates.longitude && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                style={{ background: '#f0f9ff', borderColor: '#38bdf8', color: '#0284c7', fontWeight: 600 }}
                                onClick={() =>
                                  onMapAction?.({
                                    type: 'flyto',
                                    data: {
                                      lat: msg.target_coordinates.latitude,
                                      lon: msg.target_coordinates.longitude,
                                      zoom: 11,
                                      title: msg.target_location || 'ORCA Intelligence Target',
                                    },
                                  })
                                }
                                title="Fly to exact nautical coordinates on real-time Leaflet map"
                              >
                                <MapPin size={13} />
                                <span>📍 Radar Map Lock ({Number(msg.target_coordinates.latitude).toFixed(3)}°N, {Number(msg.target_coordinates.longitude).toFixed(3)}°E)</span>
                              </button>
                            )}
                            {msg.pfz && msg.pfz.length > 0 && (msg.intent === 'potential_fishing_zone' || msg.intent === 'chlorophyll_sst_correlation' || /pfz|fish|tuna|mackerel|sardine|catch|मछली|மீன்|ചൂര/i.test(msg.query || '')) && (
                              <button
                                type="button"
                                className="btn-action-pill pfz"
                                onClick={() => onMapAction?.({ type: 'pfz', data: msg.pfz[0] })}
                                title="Activate Pan-India PFZ layer and focus coordinates on the map"
                              >
                                <span>🐟 Focus PFZ Zone on Map</span>
                              </button>
                            )}
                            {msg.routes && msg.routes.length > 0 && (msg.intent === 'marine_routing' || /route|navigate|मार्ग|வழி|റൂട്ട്/i.test(msg.query || '')) && (
                              <button
                                type="button"
                                className="btn-action-pill route"
                                onClick={() =>
                                  onMapAction?.({
                                    type: 'route',
                                    data: msg.routes.find((r) => r.safety_score >= 90) || msg.routes[0],
                                  })
                                }
                                title="Activate Routes layer and render route on the map"
                              >
                                <Compass size={14} />
                                <span>Display Route on Map</span>
                              </button>
                            )}
                            {msg.telemetry && (msg.intent === 'ocean_condition_telemetry' || msg.intent === 'weather_inquiry' || /wave|swell|wind|weather|मौसम|வானிலை|കാലാവസ്ഥ/i.test(msg.query || '')) && (
                              <>
                                <button
                                  type="button"
                                  className="btn-action-pill weather"
                                  onClick={() => onMapAction?.({ type: 'weather', mode: 'wind' })}
                                  title="Toggle animated Windy wind field simulation"
                                >
                                  <Wind size={13} />
                                  <span>Wind Field</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn-action-pill weather"
                                  onClick={() => onMapAction?.({ type: 'weather', mode: 'waves' })}
                                  title="Toggle animated Windy wave swell simulation"
                                >
                                  <Waves size={13} />
                                  <span>Swell Simulation</span>
                                </button>
                              </>
                            )}
                            {msg.matchedPort && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                onClick={() =>
                                  onMapAction?.({
                                    type: 'flyto',
                                    data: { lat: msg.matchedPort.lat, lon: msg.matchedPort.lon, zoom: 9 },
                                  })
                                }
                                title={`Center map on ${msg.matchedPort.name}`}
                              >
                                <span>📍 Fly to {msg.matchedPort.name}</span>
                              </button>
                            )}
                            {msg.intent === 'geofencing_and_restricted_zones' && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                style={{ borderColor: '#f59e0b', color: '#d97706' }}
                                onClick={() => onMapAction?.({ type: 'layers', layer: 'restricted', enabled: true })}
                                title="Display designated Marine Protected Areas and restricted zones on map"
                              >
                                <span>⚠️ Show Restricted Areas</span>
                              </button>
                            )}
                            {msg.intent === 'lightning_and_cyclone_alerts' && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                style={{ borderColor: '#ef4444', color: '#dc2626' }}
                                onClick={() => onMapAction?.({ type: 'layers', layer: 'cyclone', enabled: true })}
                                title="Display cyclone warnings and radar bulletins on map"
                              >
                                <span>⚡ Show Alerts & Radar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="chat-message-row orca-row">
                  <div className="message-avatar orca">
                    <Bot size={16} />
                  </div>
                  <div className="message-bubble orca-bubble loading-bubble">
                    <div className="loading-indicator-row">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="loading-status-text">{loadingStatus}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          {/* Quick Action Chips Bar (Universal 1-click maritime overlays & queries in active language) */}
          <div className="quick-actions-strip">
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                onMapAction?.({ type: 'weather', mode: 'waves' });
                handleSend(selectedLang === 'mr' ? 'वर्तमान लाटांची उंची आणि समुद्राची स्थिती सांगा' : selectedLang === 'hi' ? 'वर्तमान समुद्री लहरें और समुद्र की स्थिति बताएं' : 'What is the current wave height, swell period, and sea state?');
              }}
              title="Activate Waves stream overlay on map"
            >
              🌊 {t('chipWaves', 'Waves')}
            </button>
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                onMapAction?.({ type: 'weather', mode: 'wind' });
                handleSend(selectedLang === 'mr' ? 'सागरी वाऱ्याचा वेग, झोत आणि दिशा सांगा' : selectedLang === 'hi' ? 'समुद्री हवा की गति, दिशा और झोंके बताएं' : 'What is the ocean wind speed, gust velocity, and wind direction?');
              }}
              title="Activate Wind stream overlay on map"
            >
              💨 {t('chipWind', 'Wind')}
            </button>
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                onMapAction?.({ type: 'weather', mode: 'currents' });
                handleSend(selectedLang === 'mr' ? 'सागरी प्रवाह आणि पाण्याचा वेग सांगा' : selectedLang === 'hi' ? 'समुद्री धाराएं और बहाव की गति बताएं' : 'What is the ocean current drift and surface circulation?');
              }}
              title="Activate Ocean Currents stream overlay on map"
            >
              🌀 {t('chipCurrents', 'Currents')}
            </button>
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                onMapAction?.({ type: 'weather', mode: 'sst' });
                handleSend(selectedLang === 'mr' ? 'समुद्राच्या पृष्ठभागाचे तापमान (SST) किती आहे?' : selectedLang === 'hi' ? 'समुद्र की सतह का तापमान (SST) कितना है?' : 'What is the sea surface temperature (SST) and thermal gradient?');
              }}
              title="Activate Sea Surface Temperature (SST) heatmap on map"
            >
              🌡️ {t('chipSST', 'SST Fronts')}
            </button>
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                const targetLat = selectedMapTarget?.lat ?? shipLocation?.lat ?? 9.9656;
                const targetLon = selectedMapTarget?.lon ?? shipLocation?.lon ?? 76.2425;
                const targetName = selectedMapTarget
                  ? `Selected Location (${targetLat.toFixed(3)}°N, ${targetLon.toFixed(3)}°E)`
                  : (shipLocation?.name ?? 'Cochin Port (Kochi)');

                if (onMapAction) {
                  onMapAction({ type: 'weather', mode: 'none' });
                  fetch(`/api/pfz/forecast?lat=${targetLat.toFixed(4)}&lon=${targetLon.toFixed(4)}&craft_type=artisanal`)
                    .then((res) => res.json())
                    .then((zones) => {
                      const list = Array.isArray(zones) ? zones : zones.zones || [];
                      onMapAction({
                        type: 'pfz',
                        data: {
                          latitude: list[0]?.latitude ?? targetLat,
                          longitude: list[0]?.longitude ?? targetLon,
                          origin_lat: targetLat,
                          origin_lon: targetLon,
                          origin_name: targetName,
                          landing_center: targetName,
                          name: `${targetName} PFZ Region`,
                          allZones: list,
                        },
                        allZones: list,
                      });
                    })
                    .catch(() => {
                      onMapAction({
                        type: 'pfz',
                        data: {
                          latitude: targetLat,
                          longitude: targetLon,
                          origin_lat: targetLat,
                          origin_lon: targetLon,
                          origin_name: targetName,
                          landing_center: targetName,
                          name: `${targetName} PFZ Region`,
                        },
                      });
                    });
                }
                handleSend(
                  selectedLang === 'mr'
                    ? `माझ्या स्थानाजवळील संभाव्य मासेमारी क्षेत्र (PFZ) आणि टूना हॉटस्पॉट दाखवा (${targetName})`
                    : selectedLang === 'hi'
                      ? `निकटतम संभावित मत्स्य पालन क्षेत्र (PFZ) और टूना हॉटस्पॉट दिखाएं (${targetName})`
                      : `Show nearest potential fishing zones (PFZ) and tuna hotspots for ${targetName}`
                );
              }}
              title="Calculate and display INCOIS PFZ hotspots from active location on map"
            >
              🐟 {t('chipPFZ', 'PFZ Hotspots')}
            </button>
            <button
              type="button"
              className="quick-chip-pill"
              onClick={() => {
                if (onMapAction) {
                  onMapAction({ type: 'toggle_layers' });
                }
                handleSend(selectedLang === 'mr' ? 'नकाशावरील सर्व सागरी स्तर, खोली आणि उपग्रह डेटा स्पष्ट करा' : selectedLang === 'hi' ? 'मानचित्र की सभी समुद्री परतें, गहराई और उपग्रह डेटा समझाएं' : 'Show and explain active ocean GIS map layers, bathymetry, buoys, and satellite overlays');
              }}
              title="Toggle active marine GIS map layers, bathymetry & buoys"
            >
              🗺️ {t('chipLayers', 'Map Layers')}
            </button>
          </div>

          {/* Map Selection Context Beacon Bar */}
          {selectedMapTarget && (
            <div className="map-context-beacon-bar" style={{ padding: '6px 12px', borderRadius: '8px', marginBottom: '8px' }}>
              <div className="beacon-header" style={{ margin: 0 }}>
                <div className="beacon-title">
                  <span className="beacon-pulse-dot" />
                  <span className="beacon-text">
                    Active Target Coordinates:{' '}
                    <strong>
                      {selectedMapTarget.lat.toFixed(4)}°N, {selectedMapTarget.lon.toFixed(4)}°E
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="beacon-close-btn"
                  onClick={onClearMapTarget}
                  title="Clear coordinates context"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {/* Attachment Preview Banner */}
          {attachedFile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                marginBottom: '8px',
                background: '#e0f2fe',
                border: '1px solid #7dd3fc',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0369a1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {attachedFile.previewUrl ? (
                  <img
                    src={attachedFile.previewUrl}
                    alt="Preview"
                    style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <FileText size={18} />
                )}
                <span style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                  {attachedFile.name}
                </span>
                <span style={{ fontSize: '10px', color: '#0284c7' }}>
                  ({Math.round(attachedFile.size / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove attachment"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Active Listening Voice Visualizer Ribbon */}
          {isListening && (
            <div
              className="voice-visualizer-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                marginBottom: '8px',
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12), rgba(249, 115, 22, 0.12))',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="soundwave-anim">
                  <span className="bar" style={{ background: '#ef4444' }} />
                  <span className="bar" style={{ background: '#f97316' }} />
                  <span className="bar" style={{ background: '#ef4444' }} />
                  <span className="bar" style={{ background: '#f97316' }} />
                  <span className="bar" style={{ background: '#ef4444' }} />
                </div>
                <span className="listening-label" style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.84rem' }}>
                  🎙️ {t('chatListening', 'Listening... speak clearly now')} ({VERNACULAR_LANGUAGES.find((l) => l.code === selectedLang)?.native || selectedLang.toUpperCase()})
                </span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Stop listening"
              >
                <span>Stop</span>
                <X size={12} />
              </button>
            </div>
          )}

          <div className="chat-input-wrapper">
            {/* Hidden Native File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.csv"
              style={{ display: 'none' }}
            />

            {/* Attachment Button */}
            <button
              type="button"
              className="btn-voice-input"
              onClick={() => fileInputRef.current?.click()}
              title="Attach maritime image, PDF chart, bulletin, or inspection doc"
            >
              <Paperclip size={18} />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              className={`btn-voice-input ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title={isListening ? 'Listening active... click mic again to pause/stop' : 'Voice Input (Click to speak in your language)'}
            >
              <Mic size={18} className={isListening ? 'mic-listening-pulse' : ''} />
            </button>

            <textarea
              className={`chat-textarea ${isListening ? 'recording-active' : ''}`}
              placeholder={
                isListening
                  ? (selectedLang === 'mr'
                    ? '🎙️ ऐकत आहे... मराठीत बोला... (थांबवण्यासाठी पुन्हा माईक दाबा)'
                    : selectedLang === 'hi'
                      ? '🎙️ सुन रहा हूँ... हिन्दी में बोलें... (रोकने के लिए माइक दबाएँ)'
                      : '🎙️ Listening... speak clearly now... (click mic or stop when done)')
                  : t('chatPlaceholder', 'Ask any ocean, marine, weather or project question in any language...')
              }
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <button
              type="button"
              className="btn-send-chat"
              onClick={() => handleSend()}
              disabled={isLoading || (!inputQuery.trim() && !attachedFile)}
              title="Send query"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
