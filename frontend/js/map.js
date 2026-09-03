/**
 * ORCA Leaflet Map Engine — Multi-View Satellite Maps
 * SIH26176 — Ocean Intelligence Companion
 */

let miniMapInstance = null;
let fullMapInstance = null;
let routeMapInstance = null;
let liveLocationMarker = null;

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

    // High-Res Satellite Imagery Base Layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(miniMapInstance);

    window.miniMapLayers = {
      sst: L.layerGroup().addTo(miniMapInstance),
      chl: L.layerGroup(),
      waves: L.layerGroup(),
      wind: L.layerGroup(),
      currents: L.layerGroup(),
      mockupZones: L.layerGroup().addTo(miniMapInstance),
      markers: L.layerGroup().addTo(miniMapInstance)
    };

    // Render the exact mockup scene features (PFZ, Restricted Zone, Suggested Route, Vessels, Labels)
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

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; ISRO MOSDAC / NOAA'
    }).addTo(fullMapInstance);

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
      center: [10.2, 74.5], // Kochi to Lakshadweep / Goa coastal corridor
      zoom: 7,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(routeMapInstance);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(routeMapInstance);

    window.routeMapLayers = {
      routes: L.layerGroup().addTo(routeMapInstance),
      markers: L.layerGroup().addTo(routeMapInstance)
    };
  }

  // Load initial spatial layers from backend
  loadAllMapLayersData(9.9312, 76.2673);
}

/**
 * Render the exact Kochi coastal scene matching the uploaded reference image
 */
function renderKochiMockupScene() {
  if (!window.miniMapLayers || !window.miniMapLayers.mockupZones) return;
  const layerGroup = window.miniMapLayers.mockupZones;
  layerGroup.clearLayers();

  // 1. High Potential Fishing Zone (Green Dashed Polygon)
  const pfzCoords = [
    [10.08, 75.92],
    [9.98, 76.10],
    [9.75, 76.08],
    [9.82, 75.76],
    [10.02, 75.74]
  ];
  const pfzPolygon = L.polygon(pfzCoords, {
    color: '#10b981',
    weight: 2,
    dashArray: '6, 6',
    fillColor: '#10b981',
    fillOpacity: 0.22
  }).addTo(layerGroup);

  // Label inside PFZ
  const pfzLabelIcon = L.divIcon({
    className: 'mockup-map-label pfz-label',
    html: '<div style="color:#34d399; font-weight:800; font-size:11px; text-shadow:0 1px 4px rgba(0,0,0,0.9); text-align:center; pointer-events:none;">High Potential<br>Fishing Zone</div>',
    iconSize: [120, 30],
    iconAnchor: [60, 15]
  });
  L.marker([9.95, 75.88], { icon: pfzLabelIcon }).addTo(layerGroup);

  // 2. Restricted Zone (Red Dashed Polygon along coast)
  const restrictedCoords = [
    [9.90, 76.24],
    [9.85, 76.32],
    [9.68, 76.35],
    [9.74, 76.20]
  ];
  L.polygon(restrictedCoords, {
    color: '#ef4444',
    weight: 2,
    dashArray: '6, 6',
    fillColor: '#ef4444',
    fillOpacity: 0.28
  }).addTo(layerGroup);

  const restrictedLabelIcon = L.divIcon({
    className: 'mockup-map-label restricted-label',
    html: '<div style="color:#f87171; font-weight:800; font-size:11px; text-shadow:0 1px 4px rgba(0,0,0,0.9); text-align:center; pointer-events:none;">Restricted<br>Zone</div>',
    iconSize: [100, 30],
    iconAnchor: [50, 15]
  });
  L.marker([9.80, 76.27], { icon: restrictedLabelIcon }).addTo(layerGroup);

  // 3. Suggested Navigation Route (Dashed orange/amber line)
  const routeWaypoints = [
    [9.965, 76.242], // Kochi harbor
    [9.88, 76.19],
    [9.82, 76.14],
    [9.73, 76.06],
    [9.65, 75.98],
    [9.85, 75.88]  // Ending into High PFZ
  ];

  L.polyline(routeWaypoints, {
    color: '#f59e0b',
    weight: 2.5,
    dashArray: '6, 6',
    opacity: 0.95
  }).addTo(layerGroup);

  // 4. Place Markers & Labels Matching Mockup
  const places = [
    { name: 'Kochi', pos: [9.97, 76.27], isMain: true },
    { name: 'Fort Kochi', pos: [9.96, 76.22] },
    { name: 'Vypeen Island', pos: [10.01, 76.21] },
    { name: 'Alappuzha', pos: [9.77, 76.22] },
    { name: 'Cherthala', pos: [9.68, 76.27] },
    { name: 'Kumarakom', pos: [9.60, 76.38] }
  ];

  places.forEach(p => {
    if (p.isMain) {
      // Blue Pin for Kochi / Your Location
      const mainPinIcon = L.divIcon({
        className: 'main-loc-pin',
        html: `<div style="background:#0284c7; color:#fff; border:2px solid #fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.6); font-size:12px;">📍</div><div style="background:rgba(15,23,42,0.85); color:#fff; font-weight:800; font-size:11px; padding:1px 6px; border-radius:4px; margin-top:2px; white-space:nowrap;">${p.name}</div>`,
        iconSize: [60, 44],
        iconAnchor: [30, 12]
      });
      L.marker(p.pos, { icon: mainPinIcon }).addTo(layerGroup);
    } else {
      const townIcon = L.divIcon({
        className: 'town-label-marker',
        html: `<div style="display:flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; border-radius:50%; background:#94a3b8; border:1px solid #ffffff;"></span><span style="color:#e2e8f0; font-size:10px; font-weight:600; text-shadow:0 1px 3px #000;">${p.name}</span></div>`,
        iconSize: [100, 18],
        iconAnchor: [3, 9]
      });
      L.marker(p.pos, { icon: townIcon }).addTo(layerGroup);
    }
  });

  // 5. Marine Advisory Marker (Yellow Warning Triangle along route)
  const advisoryIcon = L.divIcon({
    className: 'mockup-advisory-pin',
    html: '<div style="background:#f59e0b; border:2px solid #fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:11px; box-shadow:0 0 10px #f59e0b; cursor:pointer;" title="Marine Advisory: Moderate sea state">⚠️</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  L.marker([9.82, 76.14], { icon: advisoryIcon }).bindPopup('<b>⚠️ Marine Advisory</b><br>Moderate sea state. Wind speed 10 km/h, wave 1.1m.').addTo(layerGroup);

  // 6. Vessel Markers (Blue circular boat/anchor icons)
  const vesselWaypoints = [
    [9.88, 76.19],
    [9.73, 76.06],
    [9.65, 75.98],
    [9.85, 75.88]
  ];

  vesselWaypoints.forEach((pos, idx) => {
    const vesselIcon = L.divIcon({
      className: 'mockup-vessel-pin',
      html: '<div style="background:#0284c7; border:2px solid #fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; box-shadow:0 0 8px #0284c7;" title="Fishing Craft in transit">⚓</div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker(pos, { icon: vesselIcon }).bindPopup(`<b>Vessel Craft #${idx+1}</b><br>Heading: 285° WNW<br>Speed: 10.5 Knots`).addTo(layerGroup);
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
  if (!miniMapInstance || !window.miniMapLayers) return;
  
  document.querySelectorAll('.map-layer-switcher .layer-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  Object.keys(window.miniMapLayers).forEach(k => {
    if (k !== 'markers' && k !== 'mockupZones' && miniMapInstance.hasLayer(window.miniMapLayers[k])) {
      miniMapInstance.removeLayer(window.miniMapLayers[k]);
    }
  });

  if (window.miniMapLayers[layerKey]) {
    miniMapInstance.addLayer(window.miniMapLayers[layerKey]);
  }
}

window.initOrcaMaps = initOrcaMaps;
window.setGlobalTargetPin = setGlobalTargetPin;
window.locateUserGPS = locateUserGPS;
window.setMiniLayer = setMiniLayer;
window.renderKochiMockupScene = renderKochiMockupScene;
