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
let activeBaseMapKey = 'satellite';

const BASE_MAP_PROVIDERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; ISRO MOSDAC / NOAA' }
  },
  ocean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 13, attribution: 'Tiles &copy; Esri Ocean &mdash; GEBCO, NOAA' }
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
  // 1. Initialize Home Mini Satellite Map
  const miniEl = document.getElementById('home-mini-map');
  if (miniEl) {
    miniMapInstance = L.map('home-mini-map', {
      center: [9.85, 76.15], // Kochi coastal waters matching reference mockup
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    // Default base tile layer: Satellite
    miniBaseTileLayer = L.tileLayer(BASE_MAP_PROVIDERS.satellite.url, BASE_MAP_PROVIDERS.satellite.options).addTo(miniMapInstance);

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
      mockupZones: L.layerGroup().addTo(miniMapInstance),
      markers: L.layerGroup().addTo(miniMapInstance)
    };

    // Render the reference mockup scene features
    renderKochiMockupScene();

    miniMapInstance.on('mousemove', (e) => {
      const el = document.getElementById('home-cursor-coordinates');
      if (el) el.textContent = `LAT ${e.latlng.lat.toFixed(4)}° · LON ${e.latlng.lng.toFixed(4)}°`;
    });

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

    fullBaseTileLayer = L.tileLayer(BASE_MAP_PROVIDERS.satellite.url, BASE_MAP_PROVIDERS.satellite.options).addTo(fullMapInstance);

    window.fullMapLayers = {
      sstGrid: L.layerGroup().addTo(fullMapInstance),
      pfzZones: L.layerGroup().addTo(fullMapInstance),
      hazards: L.layerGroup().addTo(fullMapInstance),
      gisZones: L.layerGroup().addTo(fullMapInstance),
      routes: L.layerGroup().addTo(fullMapInstance),
      ports: L.layerGroup().addTo(fullMapInstance),
      userGps: L.layerGroup().addTo(fullMapInstance)
    };

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

  // 3. Initialize Route Map
  const routeEl = document.getElementById('route-full-map');
  if (routeEl) {
    routeMapInstance = L.map('route-full-map', {
      center: [10.2, 74.5],
      zoom: 7,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(routeMapInstance);

    L.tileLayer(BASE_MAP_PROVIDERS.satellite.url, BASE_MAP_PROVIDERS.satellite.options).addTo(routeMapInstance);

    window.routeMapLayers = {
      routes: L.layerGroup().addTo(routeMapInstance),
      markers: L.layerGroup().addTo(routeMapInstance)
    };
  }

  // Load initial spatial layers from backend
  loadAllMapLayersData(9.9312, 76.2673);

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
// Dynamic Live Overlays Toggle
// -------------------------------------------------------------------
function toggleMapOverlay(overlayKey, btnEl) {
  if (!miniMapInstance || !window.miniMapLayers) return;

  const targetGroup = window.miniMapLayers[overlayKey];
  if (!targetGroup) return;

  const isCurrentlyActive = miniMapInstance.hasLayer(targetGroup);

  if (isCurrentlyActive) {
    // Turn Off
    miniMapInstance.removeLayer(targetGroup);
    if (btnEl) btnEl.classList.remove('active');
    syncDropdownCheckbox(overlayKey, false);
  } else {
    // Turn On & Populate
    populateDynamicOverlay(overlayKey);
    miniMapInstance.addLayer(targetGroup);
    if (btnEl) btnEl.classList.add('active');
    syncDropdownCheckbox(overlayKey, true);
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
  } else {
    if (miniMapInstance.hasLayer(targetGroup)) {
      miniMapInstance.removeLayer(targetGroup);
    }
  }

  // Sync pill button active class
  const btn = document.querySelector(`.map-layer-switcher [data-overlay="${overlayKey}"]`);
  if (btn) {
    if (isChecked) btn.classList.add('active');
    else btn.classList.remove('active');
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
        <span class="wind-tag-badge">💨 ${pt.label}</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [60, 42],
      iconAnchor: [30, 21]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b>🌬️ Live Wind Vector</b><br>Speed: <b>${pt.speedKt} Knots</b> (${Math.round(pt.speedKt*1.852)} km/h)<br>Direction: <b>${pt.dirDeg}°</b><br>Beaufort: Force 4 (Moderate Breeze)`)
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
        <span class="wave-tag-badge">🌊 ${pt.heightM}m · ${pt.periodS}s</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [70, 44],
      iconAnchor: [35, 22]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b>🌊 Live Swell Conditions</b><br>Significant Wave: <b>${pt.heightM} meters</b><br>Swell Period: <b>${pt.periodS} seconds</b><br>State: <b>Douglas State 3 (Smooth/Moderate)</b>`)
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
          ➔
        </div>
        <span class="current-tag-badge">🌀 ${pt.label}</span>
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [65, 38],
      iconAnchor: [32, 19]
    });

    L.marker([lat, lon], { icon })
      .bindPopup(`<b>🌀 Live Surface Ocean Current</b><br>Velocity: <b>${pt.velKmh} km/h</b> (0.2 m/s)<br>Drift Direction: <b>${pt.dirDeg}°</b><br>Source: Copernicus Marine Physical Model`)
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
    }).bindPopup(`<b>🌡️ Sea Surface Temperature</b><br>SST: <b>${pt.sst}°C</b><br>Thermal Gradient: <b>${pt.gradient}°C/km</b><br>${pt.front ? '🔥 <b>Thermal Front Detected (PFZ indicator)</b>' : 'Stable Water Mass'}`)
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
    color: '#10b981',
    fillColor: '#10b981',
    fillOpacity: 0.28,
    weight: 2.5,
    dashArray: '6, 6'
  }).addTo(zonesGroup);

  pfzPolygon.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#10b981; font-size:13px;">🐟 Potential Fishing Zone (High)</b><br>
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
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.25,
    weight: 2.5,
    dashArray: '5, 5'
  }).addTo(zonesGroup);

  restrictedPolygon.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#ef4444; font-size:13px;">🛡️ Restricted Zone — Southern Naval Command</b><br>
      <b>Restriction:</b> Naval defense operations & Port Fairway<br>
      <b>Notice:</b> Commercial trawling strictly prohibited.<br>
      Maintain at least 2 NM safety perimeter.
    </div>
  `);

  // 3. Suggested Navigation Route (Amber dashed line)
  const routePoints = [
    [9.965, 76.242], // Cochin Harbour departure
    [9.930, 76.120], // Waypoint 1 (clearing fairway)
    [9.860, 75.980], // Waypoint 2
    [9.850, 75.880]  // Waypoint 3 (Arrival at PFZ centroid)
  ];

  const routePolyline = L.polyline(routePoints, {
    color: '#f59e0b',
    weight: 3.5,
    dashArray: '8, 8',
    opacity: 0.95
  }).addTo(zonesGroup);

  routePolyline.bindPopup(`
    <div style="font-family:inherit; padding:4px;">
      <b style="color:#f59e0b; font-size:13px;">🧭 Suggested Navigation Route</b><br>
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
      html: '<div style="background:#0f2c59; border:2px solid #fff; border-radius:50%; width:16px; height:16px; box-shadow:0 0 8px #0f2c59;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).bindPopup('<b>⚓ Cochin Fisheries Harbour</b><br>Base Port & Landing Center').addTo(zonesGroup);

  // 5. Marine Advisory Buoy Marker
  L.marker([9.76, 76.15], {
    icon: L.divIcon({
      className: 'mockup-buoy-icon',
      html: '<div style="font-size:16px; text-shadow:0 0 8px #f59e0b;" title="Marine Advisory Buoy">⚠️</div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }).bindPopup('<b>⚠️ Marine Advisory Alert</b><br>Moderate chop observed 18 km South of Kochi. Wave height 1.3m.').addTo(zonesGroup);

  // 6. Vessel markers
  const vesselCoords = [
    [9.92, 76.02],
    [9.82, 75.91],
    [9.75, 76.20]
  ];

  vesselCoords.forEach((pos, idx) => {
    const vesselIcon = L.divIcon({
      className: 'mockup-vessel-pin',
      html: '<div style="background:#0284c7; border:2px solid #fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; box-shadow:0 0 8px #0284c7;" title="Fishing Craft in transit">⚓</div>',
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

  const marker = L.marker([lat, lon], { icon }).bindPopup(`<b>📍 ${label}</b><br>Lat: ${lat}, Lon: ${lon}`).addTo(window.fullMapLayers.userGps);
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

// Global window registrations
window.initOrcaMaps = initOrcaMaps;
window.setGlobalTargetPin = setGlobalTargetPin;
window.locateUserGPS = locateUserGPS;
window.setMiniLayer = setMiniLayer;
window.switchBaseMap = switchBaseMap;
window.toggleMapOverlay = toggleMapOverlay;
window.toggleMapOverlayCheckbox = toggleMapOverlayCheckbox;
window.toggleLayerDropdown = toggleLayerDropdown;
window.renderKochiMockupScene = renderKochiMockupScene;
