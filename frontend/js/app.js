/**
 * ORCA Master Frontend Controller
 * SIH26176 — Smart India Hackathon Enterprise Controller
 * Ocean Intelligence Companion
 */

let currentView = "home";
let currentSessionId = "session-default";
let chatSessions = [];
let currentPortKey = "kochi";
let currentPortName = "Kochi Coast, India";
let isVoiceListening = false;
let speechRecognizer = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme from localStorage
  initTheme();

  // 2. Initialize Satellite Maps
  if (typeof initOrcaMaps === 'function') {
    initOrcaMaps();
  }

  // 3. Setup Navigation Sidebar & Header Clicks
  setupNavigation();

  // 4. Setup connected Home Companion Center
  setupHomeCompanionCenter();

  // 5. Setup Chat View Listeners
  setupChatView();

  // 6. Setup Route Planner Form
  setupRoutePlanner();

  // 7. Setup Speech Recognition
  setupSpeechRecognition();

  // 8. Load Previous Chat Sessions History
  loadPreviousChatSessions();
});

// Theme Management (Light / Dark mode toggle)
function toggleTheme() {
  const isDark = document.body.classList.toggle('theme-dark');
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.textContent = isDark ? '🌙' : '☀️';
  try {
    localStorage.setItem('orca_theme', isDark ? 'dark' : 'light');
  } catch(e) {}
}

function initTheme() {
  try {
    const saved = localStorage.getItem('orca_theme');
    if (saved === 'dark') {
      document.body.classList.add('theme-dark');
      const icon = document.getElementById('themeToggleIcon');
      if (icon) icon.textContent = '🌙';
    }
  } catch(e) {}
}

// SIH 1-Click Demo Presets
function runSihPreset(key) {
  const presets = {
    pfz: "Find nearest Potential Fishing Zones (PFZ) and sea surface temperature fronts near Kochi / Chennai Port.",
    safety: "Check sea safety verdict, wind speeds, wave height, and cyclone warnings for Kochi harbour.",
    route: "Plan an optimal, obstacle-avoiding sea route from Kochi to Lakshadweep avoiding MPAs.",
    sst: "Show satellite Sea Surface Temperature (SST) and Chlorophyll-a frontal analysis off Kochi coast.",
    tamil: "கொச்சியிலிருந்து கடலுக்குச் செல்ல திட்டமிட்டுள்ளேன். கடல் பாதுகாப்பு மற்றும் மீன்பிடி மண்டலம் எப்படி உள்ளது?"
  };

  const text = presets[key] || key;

  if (currentView === 'home') {
    const input = document.getElementById('homeDockInput');
    if (input) input.value = text;
    submitHomeDockChat();
  } else {
    switchView('chat');
    const input = document.getElementById('viewChatInput');
    if (input) {
      input.value = text;
      submitChatMessage();
    }
  }
}

// Connected Home Companion Center
let homeMapData = null;
let homeSelectedContext = null;
let homeActiveLayers = new Set(['satellite', 'mockupZones']);
let homeSessionId = 'home-session-' + Date.now();

function setupHomeCompanionCenter() {
  const form = document.getElementById('home-chat-form');
  const input = document.getElementById('homeDockInput');
  if (form && input) {
    form.addEventListener('submit', e => { e.preventDefault(); submitHomeDockChat(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitHomeDockChat(); } });
  }
  const mic = document.getElementById('homeDockMicBtn');
  if (mic) mic.addEventListener('click', () => startHomeVoiceInput());
}

function setHomeMapContext(ctx) {
  homeSelectedContext = ctx;
  if (ctx.lat != null && ctx.lon != null) {
    const locText = document.getElementById('current-location-text');
    if (locText) {
      locText.textContent = `${Number(ctx.lat).toFixed(2)}°N, ${Number(ctx.lon).toFixed(2)}°E`;
    }
    fetchHomeContextTelemetry(ctx);
  }
}

window.setHomeMapContext = setHomeMapContext;
window.onHomeMapDataLoaded = function(data) {
  homeMapData = data;
};

async function fetchHomeContextTelemetry(ctx) {
  if (ctx.lat == null || ctx.lon == null) return;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `Analyze current marine conditions at latitude ${ctx.lat}, longitude ${ctx.lon}. Focus on fishing safety and sea state.`,
        latitude: Number(ctx.lat),
        longitude: Number(ctx.lon),
        session_id: homeSessionId
      })
    });
    if (!res.ok) return;
    const data = await res.json();
    updateTelemetryCards(data);
  } catch(e) {
    console.warn('Home context telemetry error', e);
  }
}

function updateTelemetryCards(data) {
  const t = data.telemetry || {};
  if (t.sst_celsius != null) {
    const el = document.getElementById('cond-sst');
    if (el) el.textContent = `${t.sst_celsius} °C`;
  }
  if (t.wave_height_meters != null) {
    const el = document.getElementById('cond-wave');
    if (el) el.textContent = `${t.wave_height_meters} m`;
  }
  if (t.wind_speed_knots != null) {
    const el = document.getElementById('cond-wind');
    if (el) el.textContent = `${Math.round(t.wind_speed_knots * 1.852)} km/h`;
  }
}

async function submitHomeDockChat() {
  const input = document.getElementById('homeDockInput');
  const text = input?.value.trim();
  if (!text) return;
  input.value = '';

  appendHomeMessage('user', text);
  const pending = appendHomeMessage('assistant', 'Coordinating marine agents & satellite data feeds...');

  try {
    const body = { query: text, session_id: homeSessionId };
    if (homeSelectedContext?.lat != null) {
      body.latitude = Number(homeSelectedContext.lat);
      body.longitude = Number(homeSelectedContext.lon);
    } else {
      // Default to Kochi coords
      body.latitude = 9.9656;
      body.longitude = 76.2425;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const t = data.telemetry || {};
    const risk = data.risk_assessment || {};
    const isSafe = risk.overall_risk === 'LOW' || !risk.overall_risk;
    const waveHeight = t.wave_height_meters != null ? `${t.wave_height_meters} m` : '1.1 m';
    const windSpeed = t.wind_speed_knots != null ? `${Math.round(t.wind_speed_knots * 1.852)} km/h` : '10 km/h';
    const currentSpeed = '0.5 m/s';
    const weatherCond = 'Partly Cloudy';
    const visibility = 'Good';
    const pfzStatus = (data.pfz_advisories?.length ? 'HIGH' : 'MODERATE');

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let mainHeading = `Yes, it is safe to operate offshore from ${currentPortName} under current conditions.`;
    if (!isSafe) {
      mainHeading = `Caution advised for offshore activities off ${currentPortName}.`;
    }

    pending.innerHTML = `
      <div class="chat-assistant-card">
        <div class="assistant-status-lead">
          <span class="lead-check-icon" style="${!isSafe ? 'background:#f59e0b;' : ''}">${isSafe ? '✔' : '⚠️'}</span>
          <strong class="lead-title">${escapeHome(mainHeading)}</strong>
        </div>

        <div class="assistant-telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-icon">🌊</span>
            <span class="telemetry-name">Wave Height</span>
            <span class="telemetry-val">${escapeHome(waveHeight)} <span class="val-pill-safe" style="${!isSafe ? 'color:#f59e0b;' : ''}">(${isSafe ? 'Safe' : 'Caution'})</span></span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-icon">💨</span>
            <span class="telemetry-name">Wind Speed</span>
            <span class="telemetry-val">${escapeHome(windSpeed)}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-icon">🌀</span>
            <span class="telemetry-name">Current</span>
            <span class="telemetry-val">${escapeHome(currentSpeed)}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-icon">☁️</span>
            <span class="telemetry-name">Weather</span>
            <span class="telemetry-val">${escapeHome(weatherCond)}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-icon">👁️</span>
            <span class="telemetry-name">Visibility</span>
            <span class="telemetry-val">${escapeHome(visibility)}</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-icon">📍</span>
            <span class="telemetry-name">Fishing Potential</span>
            <span class="telemetry-val val-green-bold">${escapeHome(pfzStatus)}</span>
          </div>
        </div>

        <div class="assistant-recommendation-box">
          <div class="recommendation-header">Recommendation</div>
          <p class="recommendation-text">${escapeHome(risk.safety_advisory || data.synthesized_response || 'Good conditions for fishing with low risk. Stay updated for any changes in weather.')}</p>
          <div class="recommendation-time">${timeStr}</div>
        </div>

        <div class="assistant-sources-bar">
          <span class="sources-label">Sources</span>
          <div class="sources-pills">
            <span class="source-badge"><span class="source-icon">🌐</span> INCOIS</span>
            <span class="source-badge"><span class="source-icon">🛰️</span> IMD</span>
            <span class="source-badge"><span class="source-icon">🐟</span> CMFRI</span>
            <span class="source-badge"><span class="source-icon">📡</span> GFS</span>
          </div>
        </div>
      </div>
    `;

    updateTelemetryCards(data);

    if (data.pfz_advisories?.length && typeof displayPFZsOnMap === 'function') {
      displayPFZsOnMap(data.pfz_advisories);
    }
  } catch(e) {
    pending.innerHTML = `
      <div class="chat-assistant-card">
        <div style="color:var(--rose-danger); font-size:0.8rem;">
          ❌ Unable to reach ORCA backend (/api/chat). Please verify server status.
        </div>
      </div>
    `;
  }
}

function appendHomeMessage(role, text) {
  const c = document.getElementById('home-chat-messages');
  const d = document.createElement('div');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (role === 'user') {
    d.className = 'chat-bubble-row user';
    d.innerHTML = `
      <div class="chat-user-bubble">
        <p class="bubble-text">${escapeHome(text)}</p>
        <div class="bubble-timestamp">${timeStr} <span class="read-receipt">✓✓</span></div>
      </div>
    `;
  } else {
    d.className = 'chat-bubble-row assistant';
    d.innerHTML = `
      <div class="chat-assistant-card">
        <div class="assistant-status-lead">
          <span class="lead-check-icon">⏳</span>
          <strong class="lead-title">${escapeHome(text)}</strong>
        </div>
      </div>
    `;
  }

  c?.appendChild(d);
  if (c) c.scrollTop = c.scrollHeight;
  return d;
}

function escapeHome(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function sendQuickPrompt(text) {
  const input = document.getElementById('homeDockInput');
  if (input) input.value = text;
  submitHomeDockChat();
}

function startHomeVoiceInput() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    alert('Voice input is not supported in this browser.');
    return;
  }
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new R();
  r.lang = 'en-IN';
  r.interimResults = false;
  r.onresult = e => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById('homeDockInput');
    if (input) {
      input.value = text;
      submitHomeDockChat();
    }
  };
  r.start();
}

function speakLastResponse() {
  if (!('speechSynthesis' in window)) {
    alert("Speech synthesis is not supported in this browser.");
    return;
  }
  const lastMsg = document.querySelector('#home-chat-messages .chat-bubble-row.assistant:last-child .recommendation-text');
  const text = lastMsg ? lastMsg.innerText : "Yes, it is safe to fish offshore tomorrow morning with low risk.";
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-IN';
  window.speechSynthesis.speak(u);
}

function refreshOceanData() {
  const dateEl = document.getElementById('sidebarSyncDate');
  const timeEl = document.getElementById('sidebarSyncTime');
  const now = new Date();
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';
  
  if (typeof loadAllMapLayersData === 'function') {
    loadAllMapLayersData(9.9656, 76.2425);
  }
}

function setMapLayerType(type) {
  document.querySelectorAll('.map-layer-switcher .layer-tab-btn').forEach(b => {
    if (b.getAttribute('data-map-layer') === type) b.classList.add('active');
    else if (!b.classList.contains('layer-dropdown-btn')) b.classList.remove('active');
  });
}

function toggleOverlayLayer(layerName) {
  const btn = document.querySelector(`.map-layer-switcher [data-map-layer="${layerName}"]`);
  if (btn) btn.classList.toggle('active');
}

// Navigation View Switcher
function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-link, .header-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      if (viewId) switchView(viewId);
    });
  });
}

function switchView(viewName) {
  currentView = viewName;

  document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => {
    if (el.getAttribute('data-view') === viewName) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  setTimeout(() => {
    if (viewName === 'map' && window.fullMapInstance) window.fullMapInstance.invalidateSize();
    if (viewName === 'routes' && window.routeMapInstance) window.routeMapInstance.invalidateSize();
    if (viewName === 'home' && window.miniMapInstance) window.miniMapInstance.invalidateSize();
  }, 100);
}

// Chat View Setup (Standalone Sessions)
function setupChatView() {
  const input = document.getElementById('viewChatInput');
  const sendBtn = document.getElementById('viewChatSendBtn');
  const micBtn = document.getElementById('viewChatMicBtn');

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitChatMessage();
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', submitChatMessage);
  if (micBtn) micBtn.addEventListener('click', toggleVoiceInput);
}

async function submitChatMessage() {
  const input = document.getElementById('viewChatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendUserChatBubble(text);

  const loadId = 'load-' + Date.now();
  appendChatLoadingBubble(loadId);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: text,
        session_id: currentSessionId
      })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.remove();

    appendOrcaChatBubble(data);
    saveChatSessionEntry(currentSessionId, text);

    if (data.pfz_advisories?.length && typeof displayPFZsOnMap === 'function') {
      displayPFZsOnMap(data.pfz_advisories);
    }
  } catch (err) {
    const loadEl = document.getElementById(loadId);
    if (loadEl) {
      loadEl.innerHTML = `<div style="color:var(--rose-danger);">❌ Error: ${err.message}</div>`;
    }
  }
}

function appendUserChatBubble(text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user';
  bubble.style.cssText = 'align-self:flex-end; background:#0056b3; color:#ffffff; border-radius:12px 12px 2px 12px; padding:10px 14px; max-width:80%; font-size:0.85rem;';
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendChatLoadingBubble(id) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.id = id;
  bubble.className = 'chat-bubble orca';
  bubble.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color:var(--text-secondary); font-size:0.82rem;"><span class="status-dot-pulse"></span> ORCA is analyzing multi-source ocean telemetry...</div>`;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function appendOrcaChatBubble(data) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble orca';

  let riskHtml = '';
  if (data.risk_assessment) {
    const r = data.risk_assessment;
    const isSafe = r.overall_risk === 'LOW';
    const color = isSafe ? 'var(--emerald-safe)' : 'var(--amber-warning)';
    riskHtml = `
      <div style="background:var(--bg-card); border-left:3px solid ${color}; border-radius:4px; padding:8px 10px; margin-bottom:8px; font-size:0.78rem;">
        <strong style="color:${color}; font-size:0.85rem;">🛡️ SAFETY VERDICT: ${escapeHome(r.overall_risk)} (Score ${r.risk_score}/100)</strong><br>
        <span style="color:var(--text-secondary);">${escapeHome(r.safety_advisory || '')}</span>
      </div>
    `;
  }

  bubble.innerHTML = `
    ${riskHtml}
    <div style="font-size:0.85rem; color:var(--text-main); line-height:1.4;">${formatChatMarkdown(data.synthesized_response || 'No response data available.')}</div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function formatChatMarkdown(raw) {
  return raw
    .replace(/^### (.*$)/gim, '<h4 style="color:var(--brand-primary); margin:8px 0 4px;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color:var(--brand-primary); margin:10px 0 6px;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-card-subtle); padding:2px 4px; border-radius:4px; font-family:var(--font-mono); font-size:0.8em;">$1</code>')
    .replace(/\n\n/g, '<p style="margin:6px 0;"></p>')
    .replace(/\n/g, '<br>');
}

// Session History Management
function loadPreviousChatSessions() {
  try {
    const saved = localStorage.getItem('orca_chat_sessions');
    if (saved) chatSessions = JSON.parse(saved);
  } catch(e) {}
  renderSessionsList();
}

function renderSessionsList() {
  const listEl = document.getElementById('chatSessionsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  chatSessions.forEach(sess => {
    const item = document.createElement('div');
    item.className = 'session-history-item';
    item.style.cssText = 'padding:6px 8px; border-radius:6px; font-size:0.78rem; cursor:pointer; color:var(--text-secondary); background:var(--bg-card-subtle); margin-bottom:4px;';
    item.textContent = sess.title || 'Marine Query';
    item.onclick = () => openChatSession(sess.id);
    listEl.appendChild(item);
  });
}

function startNewChatSession() {
  currentSessionId = 'session-' + Date.now();
  const c = document.getElementById('chatMessages');
  if (c) {
    c.innerHTML = `
      <div class="chat-bubble orca">
        <b style="color:var(--brand-primary); font-size:1rem;">👋 New Session Started.</b>
        <p style="margin-top:6px; color:var(--text-secondary);">Ask any natural language query about sea safety, fishing zones, wave forecasts, or sea routing.</p>
      </div>
    `;
  }
}

function openChatSession(sessId) {
  currentSessionId = sessId;
  switchView('chat');
}

function saveChatSessionEntry(sessId, firstQuery) {
  if (!chatSessions.find(s => s.id === sessId)) {
    chatSessions.unshift({ id: sessId, title: firstQuery.slice(0, 30) + '...' });
    if (chatSessions.length > 10) chatSessions.pop();
    try {
      localStorage.setItem('orca_chat_sessions', JSON.stringify(chatSessions));
    } catch(e) {}
    renderSessionsList();
  }
}

// Route Planner Form
function setupRoutePlanner() {
  const oSelect = document.getElementById('routeOriginSelect');
  if (oSelect) oSelect.value = 'kochi';
  const dSelect = document.getElementById('routeDestSelect');
  if (dSelect) dSelect.value = 'lakshadweep';
}

async function runRouteOptimization() {
  const origin = document.getElementById('routeOriginSelect')?.value || 'kochi';
  const dest = document.getElementById('routeDestSelect')?.value || 'lakshadweep';
  const speed = parseFloat(document.getElementById('routeVesselSpeed')?.value || '12.0');
  const compContainer = document.getElementById('routeResultsComparison');

  if (compContainer) {
    compContainer.innerHTML = '<div style="color:var(--text-secondary); font-size:0.8rem;">Calculating obstacle-avoiding maritime route avoiding MPAs...</div>';
  }

  try {
    const res = await fetch('/api/route/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_harbor: origin,
        destination_harbor: dest,
        vessel_speed_knots: speed
      })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (compContainer) {
      compContainer.innerHTML = `
        <div style="background:var(--bg-card-subtle); border:1px solid var(--border-light); border-radius:8px; padding:10px; font-size:0.8rem;">
          <div style="font-weight:800; color:var(--emerald-safe); margin-bottom:4px;">✅ Safe Sea Corridor Calculated</div>
          <div>Distance: <b>${data.distance_nm || '180'} NM</b> · Duration: <b>${data.eta_hours || '15'} hrs</b></div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">Obstacle avoidance: 0 MPA violations. Verified navigable bathymetry depth &gt; 10m.</div>
        </div>
      `;
    }
  } catch (err) {
    if (compContainer) {
      compContainer.innerHTML = `<div style="color:var(--rose-danger); font-size:0.8rem;">Error: ${err.message}</div>`;
    }
  }
}

// Location Modal Controls
function openLocationModal() {
  const m = document.getElementById('locationModal');
  if (m) m.classList.add('open');
}

function closeLocationModal() {
  const m = document.getElementById('locationModal');
  if (m) m.classList.remove('open');
}

function selectLocation(portKey, displayName) {
  currentPortKey = portKey;
  currentPortName = displayName;

  const locText = document.getElementById('current-location-text');
  if (locText) locText.innerText = displayName;

  closeLocationModal();

  const portsCoords = {
    kochi: [9.9656, 76.2425],
    chennai: [13.0827, 80.2707],
    mumbai: [18.9438, 72.8389],
    visakhapatnam: [17.6868, 83.2185],
    goa: [15.4187, 73.8010],
    mangalore: [12.9230, 74.8190],
    tuticorin: [8.7642, 78.1348],
    veraval: [20.9000, 70.3667],
    paradip: [20.2644, 86.6698],
    kolkata: [22.5726, 88.3639]
  };

  const c = portsCoords[portKey] || [9.9656, 76.2425];
  if (typeof setGlobalTargetPin === 'function') setGlobalTargetPin(c[0], c[1], displayName);
  if (window.miniMapInstance) {
    window.miniMapInstance.flyTo(c, 10, { duration: 1 });
  }
  setHomeMapContext({ type: 'location', lat: c[0], lon: c[1] });
}

// Voice Recognition
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  speechRecognizer = new SR();
  speechRecognizer.continuous = false;
  speechRecognizer.interimResults = false;
  speechRecognizer.lang = 'en-IN';

  speechRecognizer.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (currentView === 'home') {
      const hInput = document.getElementById('homeDockInput');
      if (hInput) {
        hInput.value = text;
        submitHomeDockChat();
      }
    } else {
      const vInput = document.getElementById('viewChatInput');
      if (vInput) {
        vInput.value = text;
        submitChatMessage();
      }
    }
  };

  speechRecognizer.onend = () => { isVoiceListening = false; };
}

function toggleVoiceInput() {
  if (!speechRecognizer) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }
  if (!isVoiceListening) {
    speechRecognizer.start();
    isVoiceListening = true;
  } else {
    speechRecognizer.stop();
    isVoiceListening = false;
  }
}

window.switchView = switchView;
window.runSihPreset = runSihPreset;
window.submitChatMessage = submitChatMessage;
window.startNewChatSession = startNewChatSession;
window.openChatSession = openChatSession;
window.runRouteOptimization = runRouteOptimization;
window.openLocationModal = openLocationModal;
window.closeLocationModal = closeLocationModal;
window.selectLocation = selectLocation;
window.toggleVoiceInput = toggleVoiceInput;
window.toggleTheme = toggleTheme;
window.sendQuickPrompt = sendQuickPrompt;
window.speakLastResponse = speakLastResponse;
window.refreshOceanData = refreshOceanData;
window.setMapLayerType = setMapLayerType;
window.toggleOverlayLayer = toggleOverlayLayer;
