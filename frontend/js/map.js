/**
 * ORCA Leaflet Map Engine — Multi-Base Maps & Dynamic Marine Overlays
 * SIH26176 — Ocean Intelligence Companion
 */

let miniMapInstance = null;
let fullMapInstance = null;
let routeMapInstance = null;
let liveLocationMarker = null;

let miniBaseTileLayer = null;
let fullBaseTileLayer = null;
let activeBaseMapKey = 'light';

const BASE_MAP_PROVIDERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; CartoDB &copy; OpenStreetMap' }
  },
  ocean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 13, attribution: 'Tiles &copy; Esri Ocean &mdash; GEBCO, NOAA' }
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; ISRO MOSDAC / NOAA' }
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, attribution: '&copy; CartoDB &copy; OpenStreetMap' }
  },
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
  }
};

const SEAMARKS_TILE_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
const RAINVIEWER_RADAR_URL = 'https://tilecache.rainviewer.com/v2/radar/nowcast_45/256/{z}/{x}/{y}/2/1_1.png';

function initOrcaMaps() {
  // 1. Initialize Home Mini Map with Crisp Light Nautical Tiles
  const miniEl = document.getElementById('home-mini-map');
  if (miniEl) {
    miniMapInstance = L.map('home-mini-map', {
      center: [9.85, 76.15], // Kochi coastal waters matching reference mockup
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    // Default base tile layer: Clean Light Positron
    miniBaseTileLayer = L.tileLayer(BASE_MAP_PROVIDERS.light.url, BASE_MAP_PROVIDERS.light.options).addTo(miniMapInstance);

    window.miniMapLayers = {
      wind: L.layerGroup(),
      waves: L.layerGroup(),
      currents: L.layerGroup(),
      weather: L.layerGroup(),
      sst: L.layerGroup(),
      seamarks: L.layerGroup(),
      pfz: L.layerGroup().addTo(miniMapInstance),
      restricted: L.layerGroup().addTo(miniMapInstance),
      route: L.layerGroup().addTo(miniMapInstance),
      ports: L.layerGroup().addTo(miniMapInstance),
      buoys: L.layerGroup().addTo(miniMapInstance),
      hazards: L.layerGroup().addTo(miniMapInstance),
      mockupZones: L.layerGroup().addTo(miniMapInstance),
      markers: L.layerGroup().addTo(miniMapInstance)
    };

    // Render the reference mockup scene features
    renderKochiMockupScene();

    // Fetch real NOAA/ISRO GeoJSON layers from backend API
    loadLiveGisData();

    // Initialize Windy-Style Native Canvas Animation Engine on Mini Map
    if (typeof OrcaWindyAnimator !== 'undefined') {
      window.miniWindyAnimator = new OrcaWindyAnimator(miniMapInstance, 'home-mini-map');
    }

    // Direct Leaflet mousemove listener for live telemetry probe
    miniMapInstance.on('mousemove', (e) => {
      updateCursorTelemetryBar(e.latlng.lat, e.latlng.lng);
    });

    // Fail-safe direct DOM pointermove listener on canvas container
    const miniMapCanvasEl = document.getElementById('home-mini-map');
    if (miniMapCanvasEl) {
      miniMapCanvasEl.addEventListener('mousemove', (e) => {
        if (!miniMapInstance) return;
        const rect = miniMapCanvasEl.getBoundingClientRect();
        const pt = [e.clientX - rect.left, e.clientY - rect.top];
        const latlng = miniMapInstance.containerPointToLatLng(pt);
        if (latlng) updateCursorTelemetryBar(latlng.lat, latlng.lng);
      });
    }

    miniMapInstance.on('click', (e) => {
      if (typeof setHomeMapContext === 'function') {
        setHomeMapContext({type:'location', lat:e.latlng.lat, lon:e.latlng.lng});
      }
    });
  }

  // 2. Initialize Full Live Satellite Map
  const fullEl = document.getElementById('live-full-map');
  if (fullEl) {
    fullMapInstance = L.map('live-full-map', {
      center: [9.9312, 76.2673],
      zoom: 9,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(fullMapInstance);

    fullBaseTileLayer = L.tileLayer(BASE_MAP_PROVIDERS.light.url, BASE_MAP_PROVIDERS.light.options).addTo(fullMapInstance);

    window.fullMapLayers = {
      sstGrid: L.layerGroup().addTo(fullMapInstance),
      pfzZones: L.layerGroup().addTo(fullMapInstance),
      hazards: L.layerGroup().addTo(fullMapInstance),
      gisZones: L.layerGroup().addTo(fullMapInstance),
      routes: L.layerGroup().addTo(fullMapInstance),
      ports: L.layerGroup().addTo(fullMapInstance),
      userGps: L.layerGroup().addTo(fullMapInstance)
    };

    // Initialize Windy-Style Native Canvas Animation Engine on Full Map
    if (typeof OrcaWindyAnimator !== 'undefined') {
      window.fullWindyAnimator = new OrcaWindyAnimator(fullMapInstance, 'live-full-map');
    }

    fullMapInstance.on('click', (e) => {
      const lat = e.latlng.lat.toFixed(4);
      const lon = e.latlng.lng.toFixed(4);
      setGlobalTargetPin(lat, lon, `Selected Coordinate (${lat}, ${lon})`);
      
      const input = document.getElementById('viewChatInput');
      if (input) {
        input.value = `Analyze sea safety and marine conditions at Lat ${lat}, Lon ${lon}`;
        switchView('chat');
        input.focus();
      }
    });
  }

  // 3. Initialize Route Map with Light CartoDB Positron
  const routeEl = document.getElementById('route-full-map');
  if (routeEl) {
    routeMapInstance = L.map('route-full-map', {
      center: [10.2, 74.5],
      zoom: 7,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(routeMapInstance);

    L.tileLayer(BASE_MAP_PROVIDERS.light.url, BASE_MAP_PROVIDERS.light.options).addTo(routeMapInstance);

    window.routeMapLayers = {
      routes: L.layerGroup().addTo(routeMapInstance),
      markers: L.layerGroup().addTo(routeMapInstance)
    };

    // Allow user to click anywhere on Route Map to pick custom destination or departure
    routeMapInstance.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(4));
      const lon = parseFloat(e.latlng.lng.toFixed(4));
      if (typeof window.handleRouteMapClick === 'function') {
        window.handleRouteMapClick(lat, lon);
      }
    });
  }

  // Load initial spatial layers from backend
  loadAllMapLayersData(9.9312, 76.2673);

  // Trigger robust multi-stage map invalidation so Leaflet computes full dimensions without grey boxes
  const triggerMapSizing = () => {
    try {
      if (miniMapInstance) miniMapInstance.invalidateSize();
      if (fullMapInstance) fullMapInstance.invalidateSize();
      if (routeMapInstance) routeMapInstance.invalidateSize();
    } catch(e) {}
  };
  triggerMapSizing();
  setTimeout(triggerMapSizing, 150);
  setTimeout(triggerMapSizing, 400);
  setTimeout(triggerMapSizing, 800);
  window.addEventListener('resize', triggerMapSizing);

  // Close floating layer dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('mapLayersDropdown');
    const trigger = document.getElementById('layerDropdownToggleBtn');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!dropdown.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
        dropdown.classList.add('hidden');
      }
    }
  });
}

// -------------------------------------------------------------------
// Cockpit Full Map Mode Toggle (Smooth 100% Full-Width Map)
// -------------------------------------------------------------------
function toggleCockpitFullMap() {
  const layout = document.getElementById('homeCompanionLayout');
  const copilotBtn = document.getElementById('floatingCopilotBtn');
  const fullBtn = document.getElementById('btnToggleCockpitFull');
  if (!layout) return;

  const isFull = layout.classList.toggle('cockpit-full-map-mode');
  if (copilotBtn) {
    if (isFull) copilotBtn.classList.remove('hidden');
    else copilotBtn.classList.add('hidden');
  }
  if (fullBtn) {
    fullBtn.textContent = isFull ? '⛶ Split' : '⛶ Full';
    fullBtn.title = isFull ? 'Restore Split View with Chatbot' : 'Maximize Map to Full View';
  }

  const invalidate = () => {
    if (miniMapInstance) {
      miniMapInstance.invalidateSize({ pan: false });
    }
  };
  invalidate();
  setTimeout(invalidate, 50);
  setTimeout(invalidate, 150);
  setTimeout(invalidate, 350);
}
window.toggleCockpitFullMap = toggleCockpitFullMap;

// -------------------------------------------------------------------
// Base Map Switcher
// -------------------------------------------------------------------
function switchBaseMap(baseKey, btnEl) {
  if (!BASE_MAP_PROVIDERS[baseKey]) return;
  activeBaseMapKey = baseKey;

  // 1. Switch on miniMap
  if (miniMapInstance) {
    if (miniBaseTileLayer) {
      miniMapInstance.removeLayer(miniBaseTileLayer);
    }
    const cfg = BASE_MAP_PROVIDERS[baseKey];
    miniBaseTileLayer = L.tileLayer(cfg.url, cfg.options).addTo(miniMapInstance);
    // Ensure tile layer stays beneath markers/overlays
    miniBaseTileLayer.bringToBack();
  }

  // 2. Switch on fullMap
  if (fullMapInstance) {
    if (fullBaseTileLayer) {
      fullMapInstance.removeLayer(fullBaseTileLayer);
    }
    const cfg = BASE_MAP_PROVIDERS[baseKey];
    fullBaseTileLayer = L.tileLayer(cfg.url, cfg.options).addTo(fullMapInstance);
    fullBaseTileLayer.bringToBack();
  }

  // 3. Update pill button states
  document.querySelectorAll('.map-layer-switcher .layer-tab-btn[data-base-layer]').forEach(btn => {
    if (btn.getAttribute('data-base-layer') === baseKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 4. Update dropdown radio buttons
  const radio = document.querySelector(`input[name="basemap_radio"][value="${baseKey}"]`);
  if (radio) radio.checked = true;
}

// -------------------------------------------------------------------
// Dynamic Live Overlays Toggle with Windy Animation Sync
// -------------------------------------------------------------------
const FLUID_ANIMATED_LAYERS = ['wind', 'waves', 'currents', 'chlorophyll', 'sst'];

function syncWindyRailButtons(activeMode) {
  // 1. Sync right-side vertical floating rail
  document.querySelectorAll('.windy-rail-btn[data-windy-layer]').forEach(btn => {
    if (activeMode && btn.getAttribute('data-windy-layer') === activeMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Sync top horizontal switcher tabs
  document.querySelectorAll('.map-layer-switcher .overlay-tab-btn[data-overlay]').forEach(btn => {
    const layer = btn.getAttribute('data-overlay');
    if (FLUID_ANIMATED_LAYERS.includes(layer)) {
      if (activeMode && layer === activeMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // 3. Sync dropdown menu checkboxes
  FLUID_ANIMATED_LAYERS.forEach(layer => {
    const isThisActive = (activeMode && layer === activeMode);
    syncDropdownCheckbox(layer, isThisActive);
  });
}
window.syncWindyRailButtons = syncWindyRailButtons;

function triggerLayerClickFeedback(btnEl) {
  if (!btnEl) return;
  btnEl.classList.remove('windy-click-ripple');
  void btnEl.offsetWidth; // force DOM reflow
  btnEl.classList.add('windy-click-ripple');
  setTimeout(() => btnEl.classList.remove('windy-click-ripple'), 600);
}

function showStatutoryLayerNotice(layerKey) {
  const notices = {
    pfz: { icon: '🐟', title: 'INCOIS Potential Fishing Zones Active', sub: 'Satellite Ocean Color & SST Front Convergence' },
    restricted: { icon: '⛔', title: 'Restricted Corridors & IMBL Geofence', sub: 'Buffer Monitoring Active (< 12 NM Warning Alarm)' },
    route: { icon: '🚢', title: 'Navigable Sea Routing Channel', sub: 'Obstacle-Avoiding Coastal Clearance Track' },
    ports: { icon: '⚓', title: 'Indian Coastal Harbors & Ports Active', sub: '35+ Commercial Berths, Fishery Harbors & VHF Channels' },
    buoys: { icon: '⚡', title: 'INCOIS Moored Ocean Buoys Active', sub: 'Deep Sea OMNI Buoys & Coastal Wave Rider Telemetry' },
    hazards: { icon: '⚠️', title: 'Marine Hazard Advisories Active', sub: 'Real-Time INCOIS & IMD High Swell & Weather Bulletins' },
    sst: { icon: '🌡️', title: 'ISRO/NOAA SST Thermal Gradients', sub: 'High-Resolution 1km Thermal Front Contours' },
    seamarks: { icon: '⚓', title: 'OpenSeaMap Marine Seamarks', sub: 'Moored Deep Sea Buoys & Coastal Lighthouses' }
  };

  const n = notices[layerKey];
  if (!n) return;

  const animator = window.miniWindyAnimator || window.fullWindyAnimator;
  if (animator && animator.hudToastEl) {
    const titleEl = animator.hudToastEl.querySelector('#windyHudTitle');
    const subEl = animator.hudToastEl.querySelector('#windyHudSubtitle');
    if (titleEl) titleEl.textContent = `${n.icon} ${n.title}`;
    if (subEl) subEl.textContent = n.sub;
    animator.hudToastEl.classList.remove('hidden');
    animator.hudToastEl.classList.add('active');
    setTimeout(() => {
      if (!animator.activeMode) {
        animator.hudToastEl.classList.remove('active');
        animator.hudToastEl.classList.add('hidden');
      }
    }, 4000);
  }
}

function toggleMapOverlay(overlayKey, btnEl) {
  if (!miniMapInstance || !window.miniMapLayers) return;
  triggerLayerClickFeedback(btnEl);

  const targetGroup = window.miniMapLayers[overlayKey];
  if (!targetGroup) return;

  const isCurrentlyActive = miniMapInstance.hasLayer(targetGroup);

  if (isCurrentlyActive) {
    // Turn Off
    miniMapInstance.removeLayer(targetGroup);
    if (btnEl) btnEl.classList.remove('active');
    syncDropdownCheckbox(overlayKey, false);

    // Turn off Windy Particle Engine if it was active for this fluid layer
    if (FLUID_ANIMATED_LAYERS.includes(overlayKey)) {
      if (window.miniWindyAnimator?.activeMode === overlayKey) window.miniWindyAnimator.clear();
      if (window.fullWindyAnimator?.activeMode === overlayKey) window.fullWindyAnimator.clear();
      syncWindyRailButtons(null);
    }
  } else {
    // Turn On & Populate
    populateDynamicOverlay(overlayKey);
    miniMapInstance.addLayer(targetGroup);
    if (btnEl) btnEl.classList.add('active');
    syncDropdownCheckbox(overlayKey, true);

    // Trigger Dynamic Windy Particle Engine for fluid layers
    if (FLUID_ANIMATED_LAYERS.includes(overlayKey)) {
      window.miniWindyAnimator?.setMode(overlayKey);
      window.fullWindyAnimator?.setMode(overlayKey);
      syncWindyRailButtons(overlayKey);
    } else {
      // Statutory layers remain crisp, static cartography
      showStatutoryLayerNotice(overlayKey);
    }
  }
}

function toggleMapOverlayCheckbox(overlayKey, isChecked) {
  if (!miniMapInstance || !window.miniMapLayers) return;

  const targetGroup = window.miniMapLayers[overlayKey];
  if (!targetGroup) return;

  if (isChecked) {
    populateDynamicOverlay(overlayKey);
    if (!miniMapInstance.hasLayer(targetGroup)) {
      miniMapInstance.addLayer(targetGroup);
    }

    if (FLUID_ANIMATED_LAYERS.includes(overlayKey)) {
      window.miniWindyAnimator?.setMode(overlayKey);
      window.fullWindyAnimator?.setMode(overlayKey);
      syncWindyRailButtons(overlayKey);
    } else {
      showStatutoryLayerNotice(overlayKey);
    }
  } else {
    if (miniMapInstance.hasLayer(targetGroup)) {
      miniMapInstance.removeLayer(targetGroup);
    }

    if (FLUID_ANIMATED_LAYERS.includes(overlayKey)) {
      if (window.miniWindyAnimator?.activeMode === overlayKey) window.miniWindyAnimator.clear();
      if (window.fullWindyAnimator?.activeMode === overlayKey) window.fullWindyAnimator.clear();
      syncWindyRailButtons(null);
    }
  }

  // Sync pill button active class
  const btn = document.querySelector(`.map-layer-switcher [data-overlay="${overlayKey}"]`);
  if (btn) {
    if (isChecked) btn.classList.add('active');
    else btn.classList.remove('active');
    triggerLayerClickFeedback(btn);
  }
}

function syncDropdownCheckbox(overlayKey, isChecked) {
  const chkMap = {
    wind: 'chkOverlayWind',
    waves: 'chkOverlayWaves',
    currents: 'chkOverlayCurrents',
    weather: 'chkOverlayRadar',
    pfz: 'chkOverlayPfz',
    restricted: 'chkOverlayRestricted',
    route: 'chkOverlayRoute',
    sst: 'chkOverlaySst',
    seamarks: 'chkOverlaySeamarks'
  };
  const id = chkMap[overlayKey];
  if (id) {
    const chk = document.getElementById(id);
    if (chk) chk.checked = isChecked;
  }
}

function toggleLayerDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('mapLayersDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// -------------------------------------------------------------------
// Dynamic Overlay Generators
// -------------------------------------------------------------------
function populateDynamicOverlay(overlayKey) {
  if (!miniMapInstance || !window.miniMapLayers) return;

  const center = miniMapInstance.getCenter();
  const cLat = center.lat;
  const cLon = center.lng;

  switch (overlayKey) {
    case 'wind':
      renderLiveWindOverlay(window.miniMapLayers.wind, cLat, cLon);
      break;
    case 'waves':
      renderLiveWaveOverlay(window.miniMapLayers.waves, cLat, cLon);
      break;
    case 'currents':
      renderLiveCurrentsOverlay(window.miniMapLayers.currents, cLat, cLon);
      break;
    case 'weather':
      renderLiveWeatherRadar(window.miniMapLayers.weather);
      break;
    case 'seamarks':
      renderOpenSeaMapSeamarks(window.miniMapLayers.seamarks);
      break;
    case 'sst':
      renderLiveSstThermalFronts(window.miniMapLayers.sst, cLat, cLon);
      break;
  }
}

// 1. Live Wind Vectors Overlay
function renderLiveWindOverlay(layerGroup, centerLat, centerLon) {
  layerGroup.clearLayers();

  // Grid offsets around the center
  const offsets = [
    { dLat: -0.15, dLon: -0.22, speedKt: 12, dirDeg: 240, label: "12 kt WSW" },
    { dLat: -0.05, dLon: -0.10, speedKt: 10, dirDeg: 245, label: "10 kt WSW" },
    { dLat: 0.10,  dLon: -0.25, speedKt: 14, dirDeg: 235, label: "14 kt SW" },
    { dLat: 0.18,  dLon: -0.12, speedKt: 11, dirDeg: 240, label: "11 kt WSW" },
    { dLat: -0.25, dLon: -0.32, speedKt: 15, dirDeg: 230, label: "15 kt SW" }
  ];

  offsets.forEach(pt => {
    const lat = centerLat + pt.dLat;
    const lon = centerLon + pt.dLon;

    const iconHtml = `
      <div class="wind-hud-marker">
        <div class="wind-arrow-wrapper" style="transform: rotate(${pt.dirDeg}deg)">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="#38bdf8"/>
          </svg>
        </div>
        <span class="wind-tag-badge"> ${pt.label}</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [60, 42],
      iconAnchor: [30, 21]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b> Live Wind Vector</b><br>Speed: <b>${pt.speedKt} Knots</b> (${Math.round(pt.speedKt*1.852)} km/h)<br>Direction: <b>${pt.dirDeg}°</b><br>Beaufort: Force 4 (Moderate Breeze)`)
      .addTo(layerGroup);
  });
}

// 2. Live Wave Swell Overlay
function renderLiveWaveOverlay(layerGroup, centerLat, centerLon) {
  layerGroup.clearLayers();

  const wavePoints = [
    { dLat: -0.12, dLon: -0.18, heightM: 1.3, periodS: 10.3, status: "safe" },
    { dLat: 0.05,  dLon: -0.15, heightM: 1.2, periodS: 10.1, status: "safe" },
    { dLat: 0.16,  dLon: -0.30, heightM: 1.6, periodS: 11.2, status: "moderate" },
    { dLat: -0.22, dLon: -0.28, heightM: 1.4, periodS: 9.8,  status: "safe" }
  ];

  wavePoints.forEach(pt => {
    const lat = centerLat + pt.dLat;
    const lon = centerLon + pt.dLon;

    const iconHtml = `
      <div class="wave-hud-marker">
        <div class="wave-pulse-ring ${pt.status}"></div>
        <span class="wave-tag-badge"> ${pt.heightM}m · ${pt.periodS}s</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [70, 44],
      iconAnchor: [35, 22]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b> Live Swell Conditions</b><br>Significant Wave: <b>${pt.heightM} meters</b><br>Swell Period: <b>${pt.periodS} seconds</b><br>State: <b>Douglas State 3 (Smooth/Moderate)</b>`)
      .addTo(layerGroup);
  });
}

// 3. Live Ocean Currents Overlay
function renderLiveCurrentsOverlay(layerGroup, centerLat, centerLon) {
  layerGroup.clearLayers();

  const currentPoints = [
    { dLat: -0.08, dLon: -0.14, velKmh: 0.7, dirDeg: 166, label: "0.7 km/h SSE" },
    { dLat: 0.08,  dLon: -0.20, velKmh: 0.8, dirDeg: 162, label: "0.8 km/h SSE" },
    { dLat: -0.18, dLon: -0.24, velKmh: 0.6, dirDeg: 170, label: "0.6 km/h S" }
  ];

  currentPoints.forEach(pt => {
    const lat = centerLat + pt.dLat;
    const lon = centerLon + pt.dLon;

    const iconHtml = `
      <div class="current-hud-marker">
        <div class="current-arrow-wrapper" style="transform: rotate(${pt.dirDeg}deg)">
          
        </div>
        <span class="current-tag-badge"> ${pt.label}</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [65, 38],
      iconAnchor: [32, 19]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b> Live Surface Ocean Current</b><br>Velocity: <b>${pt.velKmh} km/h</b> (0.2 m/s)<br>Drift Direction: <b>${pt.dirDeg}°</b><br>Source: Copernicus Marine Physical Model`)
      .addTo(layerGroup);
  });
}

// 4. Live RainViewer Weather Radar
function renderLiveWeatherRadar(layerGroup) {
  layerGroup.clearLayers();
  const radarTile = L.tileLayer(RAINVIEWER_RADAR_URL, {
    opacity: 0.65,
    maxZoom: 18,
    attribution: 'RainViewer Live Radar'
  });
  radarTile.addTo(layerGroup);
}

// 5. OpenSeaMap Seamarks
function renderOpenSeaMapSeamarks(layerGroup) {
  layerGroup.clearLayers();
  const seamarksTile = L.tileLayer(SEAMARKS_TILE_URL, {
    maxZoom: 18,
    attribution: 'OpenSeaMap'
  });
  seamarksTile.addTo(layerGroup);
}

// 6. Live SST & Thermal Fronts Overlay
function renderLiveSstThermalFronts(layerGroup, centerLat, centerLon) {
  layerGroup.clearLayers();

  const sstPoints = [
    { dLat: -0.05, dLon: -0.25, sst: 27.8, gradient: 0.65, front: true },
    { dLat: 0.12,  dLon: -0.22, sst: 28.4, gradient: 0.48, front: false },
    { dLat: -0.15, dLon: -0.15, sst: 27.4, gradient: 0.58, front: true }
  ];

  sstPoints.forEach(pt => {
    const lat = centerLat + pt.dLat;
    const lon = centerLon + pt.dLon;
    const color = pt.front ? '#ef4444' : '#10b981';

    L.circleMarker([lat, lon], {
      radius: pt.front ? 10 : 7,
      color: color,
      fillColor: color,
      fillOpacity: 0.6,
      weight: pt.front ? 2 : 1
    }).bindPopup(`<b> Sea Surface Temperature</b><br>SST: <b>${pt.sst}°C</b><br>Thermal Gradient: <b>${pt.gradient}°C/km</b><br>${pt.front ? ' <b>Thermal Front Detected (PFZ indicator)</b>' : 'Stable Water Mass'}`)
      .addTo(layerGroup);
  });
}

// -------------------------------------------------------------------
// Render Reference Mockup Scene (PFZ, Restricted, Route, Vessels)
// -------------------------------------------------------------------
function renderKochiMockupScene() {
  if (!miniMapInstance || !window.miniMapLayers) return;

  const zonesGroup = window.miniMapLayers.mockupZones;
  zonesGroup.clearLayers();

  // 1. High Potential Fishing Zone (Emerald Green dashed polygon)
  const pfzPolygonCoords = [
    [9.90, 75.85],
    [9.98, 75.92],
    [9.88, 76.05],
    [9.80, 75.98]
  ];

  const pfzPolygon = L.polygon(pfzPolygonCoords, {
    color: '#059669',
    fillColor: '#10b981',
    fillOpacity: 0.16,
    weight: 2.0,
    dashArray: '6, 6'
  }).addTo(zonesGroup);

  pfzPolygon.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#059669; font-size:13px;">Potential Fishing Zone (High)</b><br>
      <b>Sector:</b> Offshore Vypeen Shelf<br>
      <b>Distance:</b> 28 km WSW of Cochin Harbour<br>
      <b>Depth:</b> 45 meters<br>
      <b>SST:</b> 27.8°C (Thermal front ΔT = 0.65°C/km)<br>
      <b>Species:</b> Yellowfin Tuna, Mackerel, Sardine<br>
      <b>Confidence:</b> 92% (INCOIS / ISRO Oceansat-3)
    </div>
  `);

  // 2. Restricted Zone (Coral Red dashed polygon)
  const restrictedPolygonCoords = [
    [9.88, 76.22],
    [9.95, 76.26],
    [9.85, 76.32],
    [9.78, 76.28]
  ];

  const restrictedPolygon = L.polygon(restrictedPolygonCoords, {
    color: '#dc2626',
    fillColor: '#ef4444',
    fillOpacity: 0.16,
    weight: 2.0,
    dashArray: '5, 5'
  }).addTo(zonesGroup);

  restrictedPolygon.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#dc2626; font-size:13px;">Restricted Zone — Southern Naval Command</b><br>
      <b>Restriction:</b> Naval defense operations & Port Fairway<br>
      <b>Notice:</b> Commercial trawling strictly prohibited.<br>
      Maintain at least 2 NM safety perimeter.
    </div>
  `);

  // 3. Suggested Navigation Route (Solid Maritime Blue track)
  const routePoints = [
    [9.965, 76.242], // Cochin Harbour departure
    [9.930, 76.120], // Waypoint 1 (clearing fairway)
    [9.860, 75.980], // Waypoint 2
    [9.850, 75.880]  // Waypoint 3 (Arrival at PFZ centroid)
  ];

  const routePolyline = L.polyline(routePoints, {
    color: '#0284c7',
    weight: 3.5,
    dashArray: '8, 8',
    opacity: 0.95
  }).addTo(zonesGroup);

  routePolyline.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#0284c7; font-size:13px;">Suggested Navigation Route</b><br>
      <b>Departure:</b> Cochin Fisheries Harbour<br>
      <b>Destination:</b> High PFZ Centroid<br>
      <b>Total Distance:</b> 15.4 Nautical Miles (28.5 km)<br>
      <b>Est. Travel Time:</b> 1h 25m @ 11 Knots<br>
      <b>Safety:</b> Avoids Kochi restricted naval corridor
    </div>
  `);

  // 4. Harbor Marker (Kochi)
  const kochiMarker = L.marker([9.9656, 76.2425], {
    icon: L.divIcon({
      className: 'mockup-pin-kochi',
      html: '<div style="background:#0284c7; border:2px solid #ffffff; border-radius:50%; width:16px; height:16px; box-shadow:0 2px 6px rgba(0,0,0,0.2);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).bindPopup('<b>Cochin Fisheries Harbour</b><br>Base Port & Landing Center').addTo(zonesGroup);

  // 5. Marine Advisory Buoy Marker
  L.marker([9.76, 76.15], {
    icon: L.divIcon({
      className: 'mockup-buoy-icon',
      html: '<div style="background:#d97706; border:2px solid #ffffff; border-radius:50%; width:14px; height:14px; box-shadow:0 2px 6px rgba(0,0,0,0.2);" title="Marine Advisory Buoy"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    })
  }).bindPopup('<b>Marine Advisory Alert</b><br>Moderate chop observed 18 km South of Kochi. Wave height 1.3m.').addTo(zonesGroup);

  // 6. Vessel markers
  const vesselCoords = [
    [9.92, 76.02],
    [9.82, 75.91],
    [9.75, 76.20]
  ];

  vesselCoords.forEach((pos, idx) => {
    const vesselIcon = L.divIcon({
      className: 'mockup-vessel-pin',
      html: '<div style="background:#0284c7; border:2px solid #fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; box-shadow:0 0 8px #0284c7;" title="Fishing Craft in transit"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker(pos, { icon: vesselIcon }).bindPopup(`<b>Vessel Craft #${idx+1}</b><br>Heading: 285° WNW<br>Speed: 10.5 Knots`).addTo(zonesGroup);
  });
}

function setGlobalTargetPin(lat, lon, label = "Target") {
  if (!fullMapInstance || !window.fullMapLayers) return;
  window.fullMapLayers.userGps.clearLayers();

  const icon = L.divIcon({
    className: 'custom-target-pin',
    html: `<div style="background:#0284c7; border:2px solid #ffffff; width:18px; height:18px; border-radius:50%; box-shadow:0 0 12px #0284c7;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  const marker = L.marker([lat, lon], { icon }).bindPopup(`<b> ${label}</b><br>Lat: ${lat}, Lon: ${lon}`).addTo(window.fullMapLayers.userGps);
  marker.openPopup();
  fullMapInstance.panTo([lat, lon]);
}

function locateUserGPS() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      
      const locText = document.getElementById('current-location-text');
      if (locText) {
        locText.innerText = `My Location (${lat}, ${lon})`;
      }
      const headerPortText = document.getElementById('currentUserRoleText');
      if (headerPortText) {
        headerPortText.innerText = `GPS (${lat}, ${lon})`;
      }

      setGlobalTargetPin(lat, lon, "Your Live GPS Location");
      if (miniMapInstance) {
        miniMapInstance.setView([lat, lon], 10);
        if (window.miniMapLayers && window.miniMapLayers.markers) {
          window.miniMapLayers.markers.clearLayers();
          L.circleMarker([lat, lon], {radius:8, color:'#ffffff', fillColor:'#0284c7', weight:2, fillOpacity:1}).bindTooltip('My Live GPS Location').addTo(window.miniMapLayers.markers);
        }
      }
      if (typeof setHomeMapContext === 'function') setHomeMapContext({type:'live_location', lat:Number(lat), lon:Number(lon), accuracy:pos.coords.accuracy});
      
      if (fullMapInstance) fullMapInstance.setView([lat, lon], 9);
      if (typeof updateHomeOverviewForCoords === 'function') updateHomeOverviewForCoords(lat, lon, 'My Live Location');
    },
    (err) => {
      alert(`GPS location error: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function setMiniLayer(layerKey, btnEl) {
  toggleMapOverlay(layerKey, btnEl);
}

// -------------------------------------------------------------------
// Live Marine GIS Data Ingestion from NOAA/INCOIS Backend API
// -------------------------------------------------------------------
async function loadLiveGisData() {
  try {
    const res = await fetch('/api/map/layers');
    if (!res.ok) return;
    const data = await res.json();

    // 1. Render Real GIS Zones (PFZ & Restricted)
    if (data.gis_zones && data.gis_zones.features && window.miniMapLayers) {
      if (window.miniMapLayers.pfz) window.miniMapLayers.pfz.clearLayers();
      if (window.miniMapLayers.restricted) window.miniMapLayers.restricted.clearLayers();

      L.geoJSON(data.gis_zones, {
        style: (feature) => {
          const isRestricted = feature.properties && (feature.properties.zone_type === 'RESTRICTED' || feature.properties.type === 'restricted');
          if (isRestricted) {
            return {
              color: '#ef4444',
              weight: 2.5,
              dashArray: '6, 6',
              fillColor: '#ef4444',
              fillOpacity: 0.20
            };
          }
          return {
            color: '#10b981',
            weight: 2,
            dashArray: '8, 6',
            fillColor: '#10b981',
            fillOpacity: 0.24
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          const isRestricted = p.zone_type === 'RESTRICTED' || p.type === 'restricted';
          const popup = isRestricted ? `
            <div class="gis-tactical-popup restricted" style="font-family:var(--font-sans); padding:4px;">
              <strong style="color:#ef4444; font-size:0.85rem;">⛔ ${p.name || 'Restricted Maritime Corridor'}</strong><br>
              <span style="font-size:0.75rem; color:#cbd5e1;">Status: <b>No-Go Defense Zone (Active Geofence)</b></span><br>
              <span style="font-size:0.72rem; color:#94a3b8;">Buffer: <b>12 NM Early Warning Alarm Perimeter</b></span>
            </div>
          ` : `
            <div class="gis-tactical-popup pfz" style="font-family:var(--font-sans); padding:4px;">
              <strong style="color:#10b981; font-size:0.85rem;">🐟 ${p.name || 'Potential Fishing Zone (PFZ)'}</strong><br>
              <span style="font-size:0.75rem; color:#cbd5e1;">Target Pelagics: <b>Yellowfin Tuna, Sardine, Mackerel</b></span><br>
              <span style="font-size:0.72rem; color:#38bdf8;">Convergence: <b>High Chlorophyll &amp; SST Front (ISRO)</b></span><br>
              <span style="font-size:0.70rem; color:#94a3b8;">Validity: <b>Next 36 Hours (INCOIS Advisory)</b></span>
            </div>
          `;
          layer.bindPopup(popup);

          if (isRestricted) {
            if (window.miniMapLayers.restricted) layer.addTo(window.miniMapLayers.restricted);
          } else {
            if (window.miniMapLayers.pfz) layer.addTo(window.miniMapLayers.pfz);
          }
        }
      });
    }

    // 2. Render Navigational Route Bravo (Kochi to Lakshadweep)
    if (window.miniMapLayers && window.miniMapLayers.route) {
      window.miniMapLayers.route.clearLayers();
      const routeWaypoints = [
        [9.9312, 76.2673],
        [9.9800, 75.8500],
        [10.1500, 75.2000],
        [10.3500, 74.5000],
        [10.5667, 72.6417]
      ];
      L.polyline(routeWaypoints, {
        color: '#a855f7',
        weight: 3.5,
        dashArray: '8, 8',
        lineCap: 'round',
        opacity: 0.95
      }).bindPopup('<b>🚢 Navigational Route Bravo</b><br>Kochi → Lakshadweep Deep Water Clearance Channel').addTo(window.miniMapLayers.route);

      routeWaypoints.forEach((wp, idx) => {
        L.circleMarker(wp, {
          radius: idx === 0 || idx === routeWaypoints.length - 1 ? 6 : 4,
          color: '#ffffff',
          fillColor: '#a855f7',
          fillOpacity: 1,
          weight: 2
        }).bindTooltip(idx === 0 ? 'Departure: Kochi Port' : (idx === routeWaypoints.length - 1 ? 'Destination: Kavaratti' : `Waypoint WP-${idx}`)).addTo(window.miniMapLayers.route);
      });
    }

    // 3. Render Ports (35+ Coastal Harbors & Commercial Berths)
    if (window.miniMapLayers && window.miniMapLayers.ports) {
      window.miniMapLayers.ports.clearLayers();
      const portItems = data.ports?.features || (Array.isArray(data.ports) ? data.ports : []);
      portItems.forEach(item => {
        const coords = item.geometry?.coordinates ? [item.geometry.coordinates[1], item.geometry.coordinates[0]] : (item.lat && item.lon ? [item.lat, item.lon] : null);
        const p = item.properties || item;
        if (coords) {
          const marker = L.circleMarker(coords, {
            radius: 6,
            color: '#38bdf8',
            fillColor: '#0284c7',
            fillOpacity: 0.95,
            weight: 2
          });
          marker.bindPopup(`
            <div class="gis-tactical-popup port" style="font-family:var(--font-sans); padding:4px;">
              <strong style="color:#38bdf8; font-size:0.85rem;">⚓ ${p.name || 'Coastal Port / Harbor'}</strong><br>
              <span style="font-size:0.75rem; color:#cbd5e1;">State / Region: <b>${p.state || p.region || 'India'}</b></span><br>
              <span style="font-size:0.72rem; color:#94a3b8;">Berths: <b>Commercial &amp; Fishery Wharf</b></span><br>
              <span style="font-size:0.70rem; color:#94a3b8;">Marine Radio: <b>VHF Ch 16 / 68</b></span>
            </div>
          `);
          marker.addTo(window.miniMapLayers.ports);
        }
      });
    }

    // 4. Render Moored Marine Data Buoys (INCOIS OMNI & Wave Rider Network)
    if (window.miniMapLayers && window.miniMapLayers.buoys) {
      window.miniMapLayers.buoys.clearLayers();
      const buoyItems = data.buoys?.features || (Array.isArray(data.buoys) ? data.buoys : []);
      buoyItems.forEach(item => {
        const coords = item.geometry?.coordinates ? [item.geometry.coordinates[1], item.geometry.coordinates[0]] : (item.lat && item.lon ? [item.lat, item.lon] : null);
        const b = item.properties || item;
        if (coords) {
          const marker = L.circleMarker(coords, {
            radius: 5,
            color: '#facc15',
            fillColor: '#eab308',
            fillOpacity: 0.95,
            weight: 2
          });
          marker.bindPopup(`
            <div class="gis-tactical-popup buoy" style="font-family:var(--font-sans); padding:4px;">
              <strong style="color:#facc15; font-size:0.85rem;">⚡ ${b.name || ('INCOIS Moored Buoy ' + (b.id || ''))}</strong><br>
              <span style="font-size:0.75rem; color:#cbd5e1;">Region: <b>${b.region || 'Indian Ocean'}</b></span><br>
              <span style="font-size:0.72rem; color:#38bdf8;">Depth: <b>${b.depth_m || 1850} meters</b></span><br>
              <span style="font-size:0.70rem; color:#94a3b8;">Telemetry: <b>Surface Met &amp; Subsurface CTD</b></span>
            </div>
          `);
          marker.addTo(window.miniMapLayers.buoys);
        }
      });
    }

    // 5. Render Active Marine Hazards & Safety Advisories
    if (window.miniMapLayers && window.miniMapLayers.hazards) {
      window.miniMapLayers.hazards.clearLayers();
      const hazardItems = Array.isArray(data.hazards) ? data.hazards : [];
      hazardItems.forEach(hz => {
        if (hz.lat && hz.lon) {
          const isWarning = hz.severity === 'WARNING';
          const alertColor = isWarning ? '#ef4444' : '#f59e0b';

          const alertCircle = L.circle([hz.lat, hz.lon], {
            radius: 35000,
            color: alertColor,
            weight: 2,
            dashArray: '4, 6',
            fillColor: alertColor,
            fillOpacity: 0.18
          });
          alertCircle.addTo(window.miniMapLayers.hazards);

          const alertMarker = L.circleMarker([hz.lat, hz.lon], {
            radius: 7,
            color: '#ffffff',
            fillColor: alertColor,
            fillOpacity: 1.0,
            weight: 2.5
          });
          alertMarker.bindPopup(`
            <div class="gis-tactical-popup hazard" style="font-family:var(--font-sans); padding:4px; max-width:260px;">
              <strong style="color:${alertColor}; font-size:0.85rem;">⚠️ ${hz.title || 'Marine Weather Advisory'}</strong><br>
              <span style="font-size:0.74rem; color:#cbd5e1;">Severity: <b>${hz.severity || 'ADVISORY'}</b> | Authority: <b>${hz.issuing_authority || 'INCOIS'}</b></span><br>
              <p style="font-size:0.72rem; color:#e2e8f0; margin:4px 0;">${hz.description || ''}</p>
              <span style="font-size:0.70rem; color:#f87171;">Port Signal: <b>Signal ${hz.port_warning_signal || 1} Caution</b></span>
            </div>
          `);
          alertMarker.addTo(window.miniMapLayers.hazards);
        }
      });
    }
  } catch (err) {
    console.warn('[ORCA Map] Real GIS layer fetch fallback:', err);
  }
}
window.loadLiveGisData = loadLiveGisData;

// -------------------------------------------------------------------
// Active Layer Badge Synchronizer
// -------------------------------------------------------------------
function updateActiveLayerBadges(label, icon = '') {
  const headerText = document.getElementById('activeLayerStatusText');
  const probeLabel = document.getElementById('cursorActiveLayerLabel');
  const fullText = icon ? `${icon} ${label}` : label;
  if (headerText) headerText.textContent = fullText;
  if (probeLabel) probeLabel.textContent = fullText;
}
window.updateActiveLayerBadges = updateActiveLayerBadges;

// -------------------------------------------------------------------
// Windy-Style Interactive Ocean Command Center Handlers (Phase 2)
// -------------------------------------------------------------------

function switchBaseMap(baseKey, btnEl) {
  if (!BASE_MAP_PROVIDERS[baseKey]) return;
  activeBaseMapKey = baseKey;

  if (miniBaseTileLayer && miniMapInstance) {
    miniMapInstance.removeLayer(miniBaseTileLayer);
    miniBaseTileLayer = L.tileLayer(BASE_MAP_PROVIDERS[baseKey].url, BASE_MAP_PROVIDERS[baseKey].options).addTo(miniMapInstance);
    miniBaseTileLayer.bringToBack();
  }

  // Highlight above-the-map header buttons
  document.querySelectorAll('.header-basemap-btn[data-base-layer]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-base-layer') === baseKey);
  });

  const names = { satellite: 'Satellite Imagery', dark: 'Tactical Dark Mode', streets: 'Maritime Road Map' };
  const icons = { satellite: '🛰️', dark: '🌙', streets: '🗺️' };
  updateActiveLayerBadges(names[baseKey] || baseKey, icons[baseKey] || '');
}

// -------------------------------------------------------------------
// 1-Click Map Layers Drawer Toggle (Slide-in / Slide-out)
// -------------------------------------------------------------------
function toggleMapLayersDrawer(forceOpen) {
  const rail = document.getElementById('windyFloatingRail');
  const toggleBtn = document.getElementById('btnToggleLayersDrawer');
  const togglePill = document.getElementById('windyRailTogglePill');
  if (!rail) return;

  const isClosed = rail.classList.contains('closed');
  const shouldOpen = forceOpen !== undefined ? forceOpen : isClosed;

  if (shouldOpen) {
    rail.classList.remove('closed');
    if (toggleBtn) toggleBtn.classList.add('active');
    if (togglePill) togglePill.classList.add('active');
  } else {
    rail.classList.add('closed');
    if (toggleBtn) toggleBtn.classList.remove('active');
    if (togglePill) togglePill.classList.remove('active');
  }
}
window.toggleMapLayersDrawer = toggleMapLayersDrawer;

function handleWindyRailClick(mode, btnEl) {
  triggerLayerClickFeedback(btnEl);

  const animator = window.miniWindyAnimator;
  if (!animator) return;

  if (animator.activeMode === mode) {
    // Already active -> toggle OFF and reveal pristine base map
    animator.clear();
    if (window.fullWindyAnimator) window.fullWindyAnimator.clear();
    syncWindyRailButtons(null);
    updateActiveLayerBadges('Satellite Base Map', '🛰️');
  } else {
    // Switch to selected Windy overlay
    animator.setMode(mode);
    if (window.fullWindyAnimator) window.fullWindyAnimator.setMode(mode);
    syncWindyRailButtons(mode);

    const modeTitles = {
      wind: 'Wind Velocity & Flow',
      waves: 'Swell Waves & Crests',
      sst: 'Sea Surface Temp (SST)',
      chlorophyll: 'Chlorophyll-a Biomass',
      currents: 'Surface Ocean Currents'
    };
    const modeIcons = { wind: '💨', waves: '🌊', sst: '🌡️', chlorophyll: '🌿', currents: '🌀' };
    updateActiveLayerBadges(modeTitles[mode] || mode, modeIcons[mode] || '');
  }
}

function handleGisRailClick(layerKey, btnEl) {
  triggerLayerClickFeedback(btnEl);
  if (!miniMapInstance || !window.miniMapLayers) return;

  const grp = window.miniMapLayers[layerKey];
  if (!grp) return;

  if (miniMapInstance.hasLayer(grp)) {
    miniMapInstance.removeLayer(grp);
    if (btnEl) btnEl.classList.remove('active');
  } else {
    miniMapInstance.addLayer(grp);
    if (btnEl) btnEl.classList.add('active');
    showStatutoryLayerNotice(layerKey);
  }
}

function handleClearAllLayers() {
  // 1. Clear fluid animation engine
  if (window.miniWindyAnimator) window.miniWindyAnimator.clear();
  if (window.fullWindyAnimator) window.fullWindyAnimator.clear();
  syncWindyRailButtons(null);

  // 2. Hide all dynamic and GIS overlay layers
  if (miniMapInstance && window.miniMapLayers) {
    const allOverlays = ['wind', 'waves', 'currents', 'chlorophyll', 'sst', 'seamarks', 'pfz', 'restricted', 'route', 'ports', 'buoys', 'hazards', 'mockupZones'];
    allOverlays.forEach(k => {
      const grp = window.miniMapLayers[k];
      if (grp && miniMapInstance.hasLayer(grp)) {
        miniMapInstance.removeLayer(grp);
      }
    });
  }

  // 3. Deactivate GIS rail buttons
  document.querySelectorAll('.windy-rail-btn.gis-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 4. Update status chip
  updateActiveLayerBadges('Pristine Satellite View', '✨');

  // 5. Show pristine notice
  const animator = window.miniWindyAnimator || window.fullWindyAnimator;
  if (animator && animator.hudToastEl) {
    const titleEl = animator.hudToastEl.querySelector('#windyHudTitle');
    const subEl = animator.hudToastEl.querySelector('#windyHudSubtitle');
    if (titleEl) titleEl.textContent = '✨ Pristine Base Map Active';
    if (subEl) subEl.textContent = 'All Overlays Cleared · Clean Satellite Chart';
    animator.hudToastEl.classList.remove('hidden');
    animator.hudToastEl.classList.add('active');
    setTimeout(() => {
      if (!animator.activeMode) {
        animator.hudToastEl.classList.remove('active');
        animator.hudToastEl.classList.add('hidden');
      }
    }, 3000);
  }
}

function updateCursorTelemetryBar(lat, lon) {
  const coordsEl = document.getElementById('cursorCoords');
  const headerCoordsEl = document.getElementById('headerLiveCoords');
  const windEl = document.getElementById('cursorWind');
  const waveEl = document.getElementById('cursorWave');
  const sstEl = document.getElementById('cursorSst');
  const chlEl = document.getElementById('cursorChl');

  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
  const formattedCoords = `${latStr}, ${lonStr}`;

  if (coordsEl) coordsEl.textContent = formattedCoords;
  if (headerCoordsEl) headerCoordsEl.textContent = formattedCoords;

  // Cache last coordinates for reactive unit switches
  window._lastHoverCoords = { lat, lon };

  const sstUnit = window.orcaUnits?.sst || '°C';
  const waveUnit = window.orcaUnits?.waves || 'm';
  const windUnit = window.orcaUnits?.wind || 'kt';

  // Real-time satellite oceanography
  const rawSst = (typeof window.sampleRealtimeSst === 'function') ? window.sampleRealtimeSst(lat, lon) : (29.2 - (lat - 8.0) * 0.28 + Math.sin(lon * 0.3) * 0.4);
  const rawChl = (typeof window.sampleRealtimeChl === 'function') ? window.sampleRealtimeChl(lat, lon) : 0.85;
  const rawWave = Math.max(0.4, 1.25 + Math.cos(lat * 2.0) * 0.45 + Math.sin(lon * 1.5) * 0.3);
  const rawWind = Math.max(3, 11 + Math.sin(lat * 0.35) * 5 + Math.cos(lon * 0.25) * 4);

  const dispSst = (typeof window.convertValue === 'function') ? window.convertValue(rawSst, 'sst', sstUnit) : rawSst;
  const dispWave = (typeof window.convertValue === 'function') ? window.convertValue(rawWave, 'waves', waveUnit) : rawWave;
  const dispWind = (typeof window.convertValue === 'function') ? window.convertValue(rawWind, 'wind', windUnit) : rawWind;

  if (windEl) windEl.textContent = `${Math.round(dispWind)} ${windUnit} ↙ SW`;
  if (waveEl) waveEl.textContent = `${dispWave.toFixed(1)}${waveUnit} ↙ WSW`;
  if (sstEl) sstEl.textContent = `${dispSst.toFixed(1)}${sstUnit}`;
  if (chlEl) chlEl.textContent = `${rawChl.toFixed(2)} mg/m³`;
}

function refreshCursorTelemetryUnits() {
  if (window._lastHoverCoords) {
    updateCursorTelemetryBar(window._lastHoverCoords.lat, window._lastHoverCoords.lon);
  }
}
window.refreshCursorTelemetryUnits = refreshCursorTelemetryUnits;

// Global window registrations
window.initOrcaMaps = initOrcaMaps;
window.setGlobalTargetPin = setGlobalTargetPin;
window.locateUserGPS = locateUserGPS;
window.setMiniLayer = setMiniLayer;
window.switchBaseMap = switchBaseMap;
window.toggleMapLayersDrawer = toggleMapLayersDrawer;
window.toggleMapOverlay = toggleMapOverlay;
window.toggleMapOverlayCheckbox = toggleMapOverlayCheckbox;
window.toggleLayerDropdown = toggleLayerDropdown;
window.renderKochiMockupScene = renderKochiMockupScene;
window.handleWindyRailClick = handleWindyRailClick;
window.handleGisRailClick = handleGisRailClick;
window.handleClearAllLayers = handleClearAllLayers;
window.updateCursorTelemetryBar = updateCursorTelemetryBar;
window.refreshCursorTelemetryUnits = refreshCursorTelemetryUnits;
