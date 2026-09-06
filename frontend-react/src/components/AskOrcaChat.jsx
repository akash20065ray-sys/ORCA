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
} from 'lucide-react';

const SUGGESTIONS = [
  'Analyze voyage from Kochi to Minicoy (Lakshadweep)',
  'Check monsoon swell and squall risk near Malabar Coast',
  'Find nearest Yellowfin Tuna PFZ hotspots today',
  'Is it safe to depart Cochin Port under current sea state?',
];

const LOCAL_STORAGE_KEY = 'orca_ai_chat_sessions_v1';

export default function AskOrcaChat({ onShowOnMap, isDedicatedPage = false }) {
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
        title: 'Cochin Offshore Voyage Query',
        createdAt: new Date().toLocaleDateString(),
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions[0]?.id || 'session-default';
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const messageCounterRef = useRef(1);

  // Save sessions to localStorage
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputQuery(transcript);
      };

      recog.onerror = () => setIsListening(false);
      recog.onend = () => setIsListening(false);

      recognitionRef.current = recog;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice Input Toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setInputQuery('What is the wave swell and wind condition near Kochi?');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Text to Speech
  const toggleSpeech = (msgId, text) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Create New Chat Session
  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Ocean Inquiry',
      createdAt: new Date().toLocaleDateString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  // Delete Session
  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Clear messages instead of deleting sole session
      setSessions([
        {
          id: 'session-default',
          title: 'New Ocean Inquiry',
          createdAt: new Date().toLocaleDateString(),
          messages: [],
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
    const query = (queryToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `user-${messageCounterRef.current++}`,
      sender: 'user',
      text: query,
      timestamp: timeString,
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
    setIsLoading(true);
    setLoadingStatus('Consulting maritime models & INCOIS ocean telemetry...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, latitude: 9.9656, longitude: 76.2425 }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const responseText = data.synthesized_response || data.final_synthesis || 'Ocean intelligence report generated.';

      const orcaMsg = {
        id: `orca-${messageCounterRef.current++}`,
        sender: 'orca',
        text: responseText,
        timestamp: timeString,
        risk: data.risk_assessment,
        telemetry: data.telemetry,
        routes: data.routes,
        pfz: data.pfz_advisories,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...s.messages, orcaMsg],
            };
          }
          return s;
        })
      );
    } catch (err) {
      const errMsg = {
        id: `err-${messageCounterRef.current++}`,
        sender: 'orca',
        text: `Unable to fetch marine intelligence: ${err.message}. Please verify the server connection.`,
        timestamp: timeString,
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
        <div className="chat-top-bar">
          <div className="chat-title-group">
            <Bot size={20} className="icon-orca-ai" />
            <div>
              <h3 className="chat-heading">
                {isDedicatedPage ? currentSession?.title || 'ORCA AI Marine Copilot' : 'ORCA AI Assistant'}
              </h3>
              <span className="chat-sub">Real-Time Multi-Agent Marine Intelligence · SIH26176</span>
            </div>
          </div>
          <div className="chat-top-actions">
            {messages.length > 0 && (
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
                <RotateCcw size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-ai-icon-wrap">
                <Sparkles size={32} className="empty-sparkle-icon" />
              </div>
              <h4 className="empty-title">Ask ORCA Marine Intelligence</h4>
              <p className="empty-desc">
                Direct access to 8 collaborative maritime agents, INCOIS ocean state forecasts,
                dynamic route optimization, and COLREGS safety compliance.
              </p>

              <div className="empty-suggestions-grid">
                <span className="suggestions-label">RECOMMENDED INQUIRIES</span>
                {SUGGESTIONS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-chip-btn"
                    onClick={() => handleSend(prompt)}
                  >
                    <Sparkles size={13} className="chip-icon" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`chat-message-row ${isUser ? 'user-row' : 'orca-row'}`}>
                    <div className={`message-avatar ${isUser ? 'user' : 'orca'}`}>
                      {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div className={`message-bubble ${isUser ? 'user-bubble' : 'orca-bubble'}`}>
                      <div className="bubble-header">
                        <span className="bubble-sender">{isUser ? 'Captain' : 'ORCA AI'}</span>
                        <span className="bubble-time">{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            className="btn-tts"
                            onClick={() => toggleSpeech(msg.id, msg.text)}
                            title={speakingMsgId === msg.id ? 'Stop audio' : 'Read aloud'}
                          >
                            {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                        )}
                      </div>

                      <div className="bubble-content">
                        <p className="bubble-text">{msg.text}</p>

                        {/* Interactive Visual Telemetry & Safety Charts */}
                        {msg.risk && (
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
                                      strokeDasharray={`${msg.risk.safety_score ?? 91}, 100`}
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <text x="18" y="20.35" className="gauge-text">
                                      {msg.risk.safety_score ?? 91}%
                                    </text>
                                  </svg>
                                </div>
                                <div className="gauge-details">
                                  <span className="g-lbl">SAFETY INDEX</span>
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

                        {/* Quick Interactive Map Actions */}
                        {(msg.routes || msg.pfz) && (
                          <div className="msg-interactive-actions">
                            {msg.routes && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                onClick={() => onShowOnMap && onShowOnMap('routes')}
                              >
                                <Compass size={14} />
                                <span>Inspect Route on Map</span>
                              </button>
                            )}
                            {msg.pfz && (
                              <button
                                type="button"
                                className="btn-action-pill"
                                onClick={() => onShowOnMap && onShowOnMap('pfz')}
                              >
                                <span>🐟 Inspect PFZ Fishing Zone</span>
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
          <div className="chat-input-wrapper">
            <button
              type="button"
              className={`btn-voice-input ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title={isListening ? 'Listening... click to stop' : 'Voice Input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <textarea
              className="chat-textarea"
              placeholder="Ask about voyages, swell, PFZ hotspots, or port regulations..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <button
              type="button"
              className="btn-send-chat"
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
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
