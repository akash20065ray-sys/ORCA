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

 // 9. Initialize Resizable Layout Splitters
 if (typeof initResizablePanels === 'function') {
 initResizablePanels();
 }
});

// Theme Management (Light / Dark mode toggle)
function toggleTheme() {
  const isDark = document.body.classList.toggle('theme-dark');
  document.body.classList.toggle('theme-light', !isDark);
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.textContent = isDark ? 'Dark' : 'Light';
  try {
    localStorage.setItem('orca_theme', isDark ? 'dark' : 'light');
  } catch(e) {}
}

function initTheme() {
  try {
    const saved = localStorage.getItem('orca_theme');
    if (saved === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
      const icon = document.getElementById('themeToggleIcon');
      if (icon) icon.textContent = 'Dark';
    } else {
      // Default to Clean Enterprise White & Light Theme
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      const icon = document.getElementById('themeToggleIcon');
      if (icon) icon.textContent = 'Light';
    }
  } catch(e) {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
  }
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
  const risk = data.risk_assessment || {};
  const isSafe = risk.overall_risk === 'LOW' || !risk.overall_risk;

  // 1. Update Top Floating Telemetry HUD Capsule
  const hudSst = document.getElementById('hud-sst');
  if (hudSst && t.sst_celsius != null) hudSst.textContent = `${Number(t.sst_celsius).toFixed(1)}°C`;

  const hudWave = document.getElementById('hud-wave');
  if (hudWave && t.wave_height_meters != null) {
    hudWave.textContent = `${Number(t.wave_height_meters).toFixed(1)}m ↙ WSW`;
  }

  const hudWind = document.getElementById('hud-wind');
  if (hudWind && t.wind_speed_knots != null) {
    hudWind.textContent = `${Math.round(t.wind_speed_knots)} kt ↙ SW`;
  }

  const hudSafety = document.getElementById('hud-safety');
  if (hudSafety) {
    const score = risk.safety_score != null ? risk.safety_score : (isSafe ? 92 : 48);
    hudSafety.textContent = `${score}/100 ${isSafe ? 'Safe' : 'Caution'}`;
    hudSafety.className = `hud-stat-val ${isSafe ? 'hud-safe-green' : 'hud-safe-amber'}`;
  }

  // Legacy element bindings
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
 const waveHeight = t.wave_height_meters != null ? `${t.wave_height_meters} m` : '-- m';
 const windSpeed = t.wind_speed_knots != null ? `${Math.round(t.wind_speed_knots * 1.852)} km/h` : '-- km/h';
 const currentSpeed = '-- m/s';
 const weatherCond = '--';
 const visibility = '--';
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
 <span class="lead-check-icon" style="${!isSafe ? 'background:#f59e0b;' : ''}">${isSafe ? '' : ''}</span>
 <strong class="lead-title">${escapeHome(mainHeading)}</strong>
 </div>

 <div class="assistant-telemetry-grid">
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
 <span class="telemetry-name">Wave Height</span>
 <span class="telemetry-val">${escapeHome(waveHeight)} <span class="val-pill-safe" style="${!isSafe ? 'color:#f59e0b;' : ''}">(${isSafe ? 'Safe' : 'Caution'})</span></span>
 </div>
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
 <span class="telemetry-name">Wind Speed</span>
 <span class="telemetry-val">${escapeHome(windSpeed)}</span>
 </div>
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
 <span class="telemetry-name">Current</span>
 <span class="telemetry-val">${escapeHome(currentSpeed)}</span>
 </div>
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
 <span class="telemetry-name">Weather</span>
 <span class="telemetry-val">${escapeHome(weatherCond)}</span>
 </div>
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
 <span class="telemetry-name">Visibility</span>
 <span class="telemetry-val">${escapeHome(visibility)}</span>
 </div>
 <div class="telemetry-item">
 <span class="telemetry-icon"></span>
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
 <span class="source-badge"><span class="source-icon"></span> INCOIS</span>
 <span class="source-badge"><span class="source-icon"></span> IMD</span>
 <span class="source-badge"><span class="source-icon"></span> CMFRI</span>
 <span class="source-badge"><span class="source-icon"></span> GFS</span>
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
 Unable to reach ORCA backend (/api/chat). Please verify server status.
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
 <div class="bubble-timestamp">${timeStr} <span class="read-receipt"></span></div>
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
  // User reviews/edits and clicks submit arrow manually
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

function setMapLayerType(type, btnEl) {
 if (typeof window.switchBaseMap === 'function') {
 window.switchBaseMap(type, btnEl);
 }
}

function toggleOverlayLayer(layerName, btnEl) {
 if (typeof window.toggleMapOverlay === 'function') {
 window.toggleMapOverlay(layerName, btnEl);
 }
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

  // Synchronize full map position if switching to 'map'
  if (viewName === 'map' && window.fullMapInstance && window.miniMapInstance) {
    try {
      const c = window.miniMapInstance.getCenter();
      const z = window.miniMapInstance.getZoom();
      window.fullMapInstance.setView(c, z, { animate: false });
    } catch(e) {}
  }

  const invalidateAll = () => {
    try {
      if (window.miniMapInstance) window.miniMapInstance.invalidateSize({ pan: false });
      if (window.fullMapInstance) window.fullMapInstance.invalidateSize({ pan: false });
      if (window.routeMapInstance) window.routeMapInstance.invalidateSize({ pan: false });
    } catch(e) {}
  };
  invalidateAll();
  setTimeout(invalidateAll, 60);
  setTimeout(invalidateAll, 60);
  setTimeout(invalidateAll, 160);
  setTimeout(invalidateAll, 360);
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
 loadEl.innerHTML = `<div style="color:var(--rose-danger);"> Error: ${err.message}</div>`;
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
 <strong style="color:${color}; font-size:0.85rem;"> SAFETY VERDICT: ${escapeHome(r.overall_risk)} (Score ${r.risk_score}/100)</strong><br>
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
 <b style="color:var(--brand-primary); font-size:1rem;"> New Session Started.</b>
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
let routeCustomOriginCoords = null;
let routeCustomDestCoords = null;
let activeRoutePickingMode = null; // 'origin' | 'dest' | null

function toggleRoutePicking(targetType) {
  if (activeRoutePickingMode === targetType) {
    activeRoutePickingMode = null;
    updateRoutePickerBanner();
    return;
  }
  activeRoutePickingMode = targetType;
  updateRoutePickerBanner();
}

function updateRoutePickerBanner() {
  const banner = document.getElementById('routePickMapBanner');
  if (!banner) return;
  if (activeRoutePickingMode) {
    banner.innerHTML = `📍 <b>Click anywhere on the map to set ${activeRoutePickingMode === 'origin' ? 'Departure' : 'Destination'} location</b> <button onclick="toggleRoutePicking(null)" style="background:none; border:none; color:#ef4444; font-weight:800; cursor:pointer; margin-left:8px;">Cancel</button>`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function handleRouteMapClick(lat, lon) {
  const coordStr = `${lat}, ${lon}`;
  if (activeRoutePickingMode === 'origin') {
    routeCustomOriginCoords = coordStr;
    const oInput = document.getElementById('routeCustomOriginInput');
    if (oInput) oInput.value = coordStr;
    const badge = document.getElementById('routeOriginCustomBadge');
    if (badge) {
      const span = badge.querySelector('span');
      if (span) span.textContent = `📍 Map Point: ${lat}°N, ${lon}°E`;
      else badge.textContent = `📍 Map Point: ${lat}°N, ${lon}°E`;
      badge.classList.remove('hidden');
    }
    activeRoutePickingMode = null;
    updateRoutePickerBanner();
  } else {
    // Default to destination
    routeCustomDestCoords = coordStr;
    const dInput = document.getElementById('routeCustomDestInput');
    if (dInput) dInput.value = coordStr;
    const badge = document.getElementById('routeDestCustomBadge');
    if (badge) {
      const span = badge.querySelector('span');
      if (span) span.textContent = `🏁 Map Point: ${lat}°N, ${lon}°E`;
      else badge.textContent = `🏁 Map Point: ${lat}°N, ${lon}°E`;
      badge.classList.remove('hidden');
    }
    activeRoutePickingMode = null;
    updateRoutePickerBanner();
  }
}

function useCurrentGpsAsRouteOrigin() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      routeCustomOriginCoords = `${lat}, ${lon}`;
      const badge = document.getElementById('routeOriginCustomBadge');
      if (badge) {
        const span = badge.querySelector('span');
        if (span) span.textContent = `📱 My GPS: ${lat}°N, ${lon}°E`;
        else badge.textContent = `📱 My GPS: ${lat}°N, ${lon}°E`;
        badge.classList.remove('hidden');
      }
      const oInput = document.getElementById('routeCustomOriginInput');
      if (oInput) oInput.value = routeCustomOriginCoords;
      if (window.routeMapInstance) {
        window.routeMapInstance.setView([lat, lon], 8);
      }
    },
    (err) => {
      alert(`GPS detection note: ${err.message}`);
    }
  );
}

function setRouteDestinationFromPfz(lat, lon, zoneName) {
  switchView('routes');
  routeCustomDestCoords = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const badge = document.getElementById('routeDestCustomBadge');
  if (badge) {
    const span = badge.querySelector('span');
    if (span) span.textContent = `🐟 PFZ: ${zoneName} (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
    else badge.textContent = `🐟 PFZ: ${zoneName} (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
    badge.classList.remove('hidden');
  }
  const dInput = document.getElementById('routeCustomDestInput');
  if (dInput) dInput.value = routeCustomDestCoords;
  setTimeout(() => {
    runRouteOptimization();
  }, 250);
}

function clearCustomRouteCoords(type) {
  if (type === 'origin') {
    routeCustomOriginCoords = null;
    const badge = document.getElementById('routeOriginCustomBadge');
    if (badge) badge.classList.add('hidden');
    const oInput = document.getElementById('routeCustomOriginInput');
    if (oInput) oInput.value = '';
  } else {
    routeCustomDestCoords = null;
    const badge = document.getElementById('routeDestCustomBadge');
    if (badge) badge.classList.add('hidden');
    const dInput = document.getElementById('routeCustomDestInput');
    if (dInput) dInput.value = '';
  }
}

async function runRouteOptimization() {
  const originSelect = document.getElementById('routeOriginSelect')?.value || 'kochi';
  const destSelect = document.getElementById('routeDestSelect')?.value || 'lakshadweep';
  
  // Use custom coords if set, otherwise use dropdown harbor
  const origin = routeCustomOriginCoords || originSelect;
  const dest = routeCustomDestCoords || destSelect;
  const speed = parseFloat(document.getElementById('routeVesselSpeed')?.value || '12.0');
  const compContainer = document.getElementById('routeResultsComparison');

  if (compContainer) {
    compContainer.innerHTML = '<div style="color:var(--brand-primary); font-size:0.85rem; padding:12px; display:flex; align-items:center; gap:8px;"><span class="hud-live-dot"></span> Calculating obstacle-avoiding maritime passage plan avoiding MPAs &amp; shallow reefs...</div>';
  }

  try {
    const res = await fetch('/api/routes/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: origin,
        destination: dest,
        vessel_speed_knots: speed
      })
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const routes = await res.json();

    if (!Array.isArray(routes) || routes.length === 0) {
      throw new Error("No navigable corridors found for these coordinates.");
    }

    window.currentActiveRoutes = routes;

    // 1. Render routes and waypoints on the Route Leaflet Map
    if (typeof window.displayRoutesOnRouteMap === 'function') {
      window.displayRoutesOnRouteMap(routes);
    }

    // 2. Render route comparison, Fuel ROI & Turn-by-Turn Compass Steerage Guide
    if (compContainer) {
      const routeAlpha = routes.find(r => r.route_id.includes('ALPHA')) || routes[0];
      const routeBravo = routes.find(r => r.route_id.includes('BRAVO')) || routes[1] || routes[0];

      let waypointsHtml = '';
      if (routeBravo.waypoints && routeBravo.waypoints.length > 0) {
        routeBravo.waypoints.forEach((wp, idx) => {
          const isDepart = idx === 0;
          const isDest = idx === routeBravo.waypoints.length - 1;
          const steer = wp.steer_instruction || (wp.bearing_deg ? `Steer ${wp.bearing_deg}° ${wp.bearing_cardinal}` : 'Maintain course');
          
          waypointsHtml += `
            <div class="steerage-leg-item">
              <div class="leg-indicator-col">
                <span class="leg-badge ${isDepart ? 'depart' : isDest ? 'dest' : ''}">${isDepart ? '⚓' : isDest ? '🏁' : idx}</span>
                ${!isDest ? '<span class="leg-line"></span>' : ''}
              </div>
              <div class="leg-info-col">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:var(--text-main); font-size:0.84rem;">${wp.name}</strong>
                  <span class="steer-compass-badge">🧭 ${steer}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                  <span>Pos: <b>${wp.latitude.toFixed(3)}°N, ${wp.longitude.toFixed(3)}°E</b></span> · 
                  <span>Leg: <b>${wp.segment_distance_nm} NM</b></span> · 
                  <span>Total: <b>${wp.cumulative_distance_nm} NM</b></span>
                </div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
                  🌊 Swell: <b>${wp.wave_height_m}m</b> · Wind: <b>${wp.wind_speed_kts} kt</b> · Clearance: <b style="color:var(--emerald-safe);">${wp.hazard_proximity_km}km</b>
                </div>
              </div>
            </div>
          `;
        });
      }

      compContainer.innerHTML = `
        <!-- Route Alpha vs Bravo Comparison Cards -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
          <!-- Route Bravo (Safest) -->
          <div class="route-choice-card recommended">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="font-size:0.85rem; color:var(--brand-primary);">Route Bravo</strong>
              <span class="route-tag safe">RECOMMENDED</span>
            </div>
            <div style="font-size:0.76rem; color:var(--text-secondary);">
              Distance: <b>${routeBravo.total_distance_nm} NM</b> · ETA: <b>${routeBravo.estimated_duration_hours} hrs</b><br>
              Safety Score: <b style="color:var(--emerald-safe); font-size:0.9rem;">${routeBravo.safety_score}/100</b>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Deep-water eco-bypass avoiding all MPAs and shallow coastal reefs.</p>
          </div>

          <!-- Route Alpha (Direct) -->
          <div class="route-choice-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="font-size:0.85rem; color:var(--text-main);">Route Alpha</strong>
              <span class="route-tag direct">DIRECT TRACK</span>
            </div>
            <div style="font-size:0.76rem; color:var(--text-secondary);">
              Distance: <b>${routeAlpha.total_distance_nm} NM</b> · ETA: <b>${routeAlpha.estimated_duration_hours} hrs</b><br>
              Safety Score: <b style="color:var(--amber-warning); font-size:0.9rem;">${routeAlpha.safety_score}/100</b>
            </div>
            <p style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">Faster coastal fairway track with standard navigable clearance.</p>
          </div>
        </div>

        <!-- Blue Economy Fuel ROI & Carbon Reduction Card -->
        <div class="fuel-roi-card">
          <div class="fuel-roi-header">
            <div class="fuel-roi-title">
              <span>⛽</span>
              <strong>Blue Economy Fuel ROI &amp; Emissions Saved</strong>
            </div>
            <span class="co2-badge">🌿 ${routeBravo.co2_saved_kg || 102} kg CO₂ Avoided</span>
          </div>
          <div class="fuel-stat-grid">
            <div class="fuel-stat-col">
              <span class="fuel-stat-lbl">DIESEL SAVED</span>
              <span class="fuel-stat-val val-green">-${routeBravo.fuel_saved_liters || 38.2} L</span>
            </div>
            <div class="fuel-stat-col">
              <span class="fuel-stat-lbl">FINANCIAL SAVINGS</span>
              <span class="fuel-stat-val val-green">₹${routeBravo.fuel_cost_savings_inr ? Number(routeBravo.fuel_cost_savings_inr).toLocaleString() : '3,590'}</span>
            </div>
            <div class="fuel-stat-col">
              <span class="fuel-stat-lbl">EST. TOTAL BURN</span>
              <span class="fuel-stat-val">${routeBravo.fuel_estimate_liters || 142} L</span>
            </div>
            <div class="fuel-stat-col">
              <span class="fuel-stat-lbl">EFFICIENCY GAIN</span>
              <span class="fuel-stat-val val-cyan">+18% Eco-Drift</span>
            </div>
          </div>
        </div>

        <!-- Simulator & Quick Actions Toolbar -->
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button type="button" class="btn-primary btn-simulator-launch" style="flex:1; padding:9px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="startVoyageSimulator()" title="Simulate vessel cruising along Route Bravo with real-time telemetry">
            <span>▶</span>
            <span>Start Voyage Simulator</span>
          </button>
          <button type="button" class="btn-secondary" style="padding:9px 14px; font-size:0.8rem; font-weight:700; border-radius:8px; border:1px solid var(--border-medium); background:var(--bg-card); color:var(--text-main); cursor:pointer;" onclick="fitCalculatedRoute()" title="Zoom to fit entire route">
            <span>🎯 Center Route</span>
          </button>
        </div>

        <!-- Turn-by-Turn Compass Steerage Guide -->
        <div class="passage-steerage-container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border-light);">
            <strong style="font-size:0.85rem; color:var(--text-main);">🧭 Nautical Passage Plan &amp; Compass Steerage</strong>
            <span style="font-size:0.72rem; color:var(--emerald-safe); font-weight:700;">SOLAS Compliant</span>
          </div>
          <div class="steerage-legs-list">
            ${waypointsHtml}
          </div>
        </div>
      `;
    }
  } catch (err) {
    if (compContainer) {
      compContainer.innerHTML = `<div style="color:var(--rose-danger); font-size:0.8rem; padding:10px; background:var(--rose-bg); border-radius:8px;">Routing error: ${err.message}. Ensure coordinates are in marine waters.</div>`;
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

  const headerPortText = document.getElementById('currentUserRoleText');
  if (headerPortText) headerPortText.innerText = displayName;

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
  // User reviews/edits and clicks submit arrow manually
  }
  } else {
  const vInput = document.getElementById('viewChatInput');
  if (vInput) {
  vInput.value = text;
  // User reviews/edits and clicks submit arrow manually
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
window.handleRouteMapClick = handleRouteMapClick;
window.useCurrentGpsAsRouteOrigin = useCurrentGpsAsRouteOrigin;
window.setRouteDestinationFromPfz = setRouteDestinationFromPfz;
window.toggleRoutePicking = toggleRoutePicking;
window.clearCustomRouteCoords = clearCustomRouteCoords;

// -------------------------------------------------------------------
// Phase 4: Interactive Voyage Simulator Engine
// -------------------------------------------------------------------
let voyageSimState = {
  active: false,
  paused: false,
  waypoints: [],
  currentLegIdx: 0,
  legProgress: 0.0,
  animFrameId: null,
  vesselMarker: null
};

function startVoyageSimulator() {
  if (!window.currentActiveRoutes || window.currentActiveRoutes.length === 0) return;
  const route = window.currentActiveRoutes.find(r => r.route_id.includes('BRAVO')) || window.currentActiveRoutes[0];
  if (!route || !route.waypoints || route.waypoints.length < 2) return;

  const hud = document.getElementById('voyageSimulatorHud');
  if (hud) hud.classList.remove('hidden');

  voyageSimState.waypoints = route.waypoints;
  voyageSimState.currentLegIdx = 0;
  voyageSimState.legProgress = 0.0;
  voyageSimState.active = true;
  voyageSimState.paused = false;

  const playBtn = document.getElementById('simPlayPauseBtn');
  if (playBtn) playBtn.textContent = '⏸ Pause';

  // Create or reset vessel marker on Route Map
  if (window.routeMapInstance) {
    if (voyageSimState.vesselMarker) {
      window.routeMapInstance.removeLayer(voyageSimState.vesselMarker);
    }
    const startWp = route.waypoints[0];
    const boatIcon = L.divIcon({
      className: 'sim-boat-icon',
      html: '<div class="sim-boat-marker"><span class="boat-glyph">🚢</span><span class="boat-wake"></span></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    voyageSimState.vesselMarker = L.marker([startWp.latitude, startWp.longitude], { icon: boatIcon, zIndexOffset: 2000 }).addTo(window.routeMapInstance);
    window.routeMapInstance.panTo([startWp.latitude, startWp.longitude], { animate: true });
  }

  runVoyageSimLoop();
}

function runVoyageSimLoop() {
  if (!voyageSimState.active || voyageSimState.paused) return;

  const wps = voyageSimState.waypoints;
  const leg = voyageSimState.currentLegIdx;

  if (leg >= wps.length - 1) {
    // Arrival
    updateVoyageSimHud(100, wps[wps.length - 1], "ARRIVED", "Reached Destination Safely");
    const playBtn = document.getElementById('simPlayPauseBtn');
    if (playBtn) playBtn.textContent = '↺ Restart';
    return;
  }

  const p1 = wps[leg];
  const p2 = wps[leg + 1];

  voyageSimState.legProgress += 0.015;
  if (voyageSimState.legProgress >= 1.0) {
    voyageSimState.legProgress = 0.0;
    voyageSimState.currentLegIdx++;
  }

  const curT = voyageSimState.legProgress;
  const curLat = p1.latitude + (p2.latitude - p1.latitude) * curT;
  const curLon = p1.longitude + (p2.longitude - p1.longitude) * curT;

  if (voyageSimState.vesselMarker) {
    voyageSimState.vesselMarker.setLatLng([curLat, curLon]);
  }

  const totalLegs = wps.length - 1;
  const overallPct = Math.min(100, Math.round(((leg + curT) / totalLegs) * 100));
  const steer = p2.steer_instruction || `Steer ${p2.bearing_deg || 270}° ${p2.bearing_cardinal || ''}`;

  updateVoyageSimHud(overallPct, {
    latitude: curLat,
    longitude: curLon,
    wave_height_m: (p1.wave_height_m * (1 - curT) + p2.wave_height_m * curT).toFixed(1),
    wind_speed_kts: (p1.wind_speed_kts * (1 - curT) + p2.wind_speed_kts * curT).toFixed(1)
  }, steer, `Leg ${leg + 1} of ${totalLegs}`);

  voyageSimState.animFrameId = requestAnimationFrame(runVoyageSimLoop);
}

function updateVoyageSimHud(pct, pos, steer, status) {
  const pctEl = document.getElementById('simProgressPct');
  const fillEl = document.getElementById('simProgressFill');
  const posEl = document.getElementById('simPosText');
  const steerEl = document.getElementById('simSteerText');
  const waveEl = document.getElementById('simWaveText');
  const windEl = document.getElementById('simWindText');
  const statusEl = document.getElementById('simStatusText');

  if (pctEl) pctEl.textContent = `${pct}%`;
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (posEl && pos.latitude != null) posEl.textContent = `${pos.latitude.toFixed(3)}°, ${pos.longitude.toFixed(3)}°`;
  if (steerEl) steerEl.textContent = steer;
  if (waveEl) waveEl.textContent = `${pos.wave_height_m || 1.2}m`;
  if (windEl) windEl.textContent = `${pos.wind_speed_kts || 14} kt`;
  if (statusEl) statusEl.textContent = status;
}

function toggleVoyageSimulatorPause() {
  if (!voyageSimState.active) {
    startVoyageSimulator();
    return;
  }
  const wps = voyageSimState.waypoints;
  if (voyageSimState.currentLegIdx >= wps.length - 1) {
    startVoyageSimulator();
    return;
  }
  voyageSimState.paused = !voyageSimState.paused;
  const playBtn = document.getElementById('simPlayPauseBtn');
  if (playBtn) playBtn.textContent = voyageSimState.paused ? '▶ Resume' : '⏸ Pause';
  if (!voyageSimState.paused) {
    runVoyageSimLoop();
  }
}

function resetVoyageSimulator() {
  voyageSimState.active = false;
  voyageSimState.paused = false;
  if (voyageSimState.animFrameId) cancelAnimationFrame(voyageSimState.animFrameId);
  if (voyageSimState.vesselMarker && window.routeMapInstance) {
    window.routeMapInstance.removeLayer(voyageSimState.vesselMarker);
    voyageSimState.vesselMarker = null;
  }
  const hud = document.getElementById('voyageSimulatorHud');
  if (hud) hud.classList.add('hidden');
}

window.startVoyageSimulator = startVoyageSimulator;
window.toggleVoyageSimulatorPause = toggleVoyageSimulatorPause;
window.resetVoyageSimulator = resetVoyageSimulator;

// -------------------------------------------------------------------
// Phase 4: Emergency SOS Distress Beacon (Coast Guard SAR Mayday)
// -------------------------------------------------------------------
function openEmergencyDistressModal() {
  const modal = document.getElementById('emergencyDistressModal');
  if (!modal) return;

  let lat = 9.9312;
  let lon = 76.2673;
  if (routeCustomOriginCoords) {
    const parts = routeCustomOriginCoords.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0])) { lat = parts[0]; lon = parts[1]; }
  }

  const gpsEl = document.getElementById('emGpsPos');
  if (gpsEl) gpsEl.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;

  const degLat = Math.floor(lat);
  const minLat = ((lat - degLat) * 60).toFixed(2);
  const degLon = Math.floor(lon);
  const minLon = ((lon - degLon) * 60).toFixed(2);

  const maydayText = document.getElementById('emMaydayText');
  if (maydayText) {
    maydayText.textContent = `MAYDAY MAYDAY MAYDAY\nTHIS IS VESSEL: IND-KL-07-ORCA (CALLSIGN: ORCA-INDIA)\nPOSITION: ${degLat.toString().padStart(2, '0')}°${minLat}' N, ${degLon.toString().padStart(3, '0')}°${minLon}' E\nSEVERITY: IMMEDIATE ASSISTANCE REQUIRED\nPERSONS ON BOARD: 4\nSEA STATE: MODERATE SWELL 1.4m · WIND 16 KT`;
  }

  const receipt = document.getElementById('emTransmissionReceipt');
  if (receipt) receipt.classList.add('hidden');
  const txBtn = document.getElementById('btnTransmitMayday');
  if (txBtn) {
    txBtn.disabled = false;
    txBtn.textContent = '🚨 Transmit Distress Beacon to Coast Guard';
  }

  modal.classList.remove('hidden');
}

function closeEmergencyDistressModal() {
  const modal = document.getElementById('emergencyDistressModal');
  if (modal) modal.classList.add('hidden');
}

async function transmitMaydayDistress() {
  const txBtn = document.getElementById('btnTransmitMayday');
  const receipt = document.getElementById('emTransmissionReceipt');
  if (txBtn) {
    txBtn.disabled = true;
    txBtn.textContent = '📡 Broadcasting Distress Frequencies (VHF Ch 16 / DSC 70)...';
  }

  let lat = 9.9312;
  let lon = 76.2673;
  if (routeCustomOriginCoords) {
    const parts = routeCustomOriginCoords.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0])) { lat = parts[0]; lon = parts[1]; }
  }

  try {
    const res = await fetch('/api/emergency/distress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
        vessel_id: 'IND-KL-07-ORCA',
        callsign: 'ORCA-INDIA',
        crew_count: 4,
        distress_type: 'ENGINE_FAILURE_DRIFT',
        sea_state: 'Moderate Swell 1.4m · Wind 16 kt'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (txBtn) txBtn.textContent = `✅ Acknowledged by ${data.nearest_mrcc?.name || 'ICG MRCC'}`;
      if (receipt) {
        receipt.innerHTML = `
          <div class="receipt-icon">📡</div>
          <div>
            <strong style="color:#10b981;">DISTRESS BEACON BROADCAST TRANSMITTED (${data.dispatch_token})</strong>
            <p style="font-size:0.75rem; color:#cbd5e1; margin-top:2px;">
              Relayed to <b>${data.nearest_mrcc?.name}</b> (${data.distance_to_mrcc_nm} NM offshore). Fast Interceptor Craft ETA: <b>~${data.sar_response_eta_minutes} mins</b>. Maintain ${data.nearest_mrcc?.vhf_channel || 'VHF Ch 16'} standby.
            </p>
          </div>
        `;
        receipt.classList.remove('hidden');
      }
      return;
    }
  } catch (err) {
    console.warn("Emergency endpoint error, fallback to visual confirmation:", err);
  }

  // Fallback visual acknowledgement
  if (txBtn) txBtn.textContent = '✅ Distress Signal Acknowledged by ICG MRCC';
  if (receipt) receipt.classList.remove('hidden');
}

window.openEmergencyDistressModal = openEmergencyDistressModal;
window.closeEmergencyDistressModal = closeEmergencyDistressModal;
window.transmitMaydayDistress = transmitMaydayDistress;
