/**
 * ORCA Map Layers Engine
 * SIH26176 — Ocean & Satellite Layer Data Renderer
 */

async function loadAllMapLayersData(centerLat = 13.0827, centerLon = 80.2707) {
  try {
    const res = await fetch(`/api/map/layers?center_lat=${centerLat}&center_lon=${centerLon}&radius_deg=3.5`);
    if (!res.ok) return;
    const data = await res.json();

    // 1. Populate Mini Map layers
    if (window.miniMapLayers && window.miniMapInstance) {
      renderMiniSstGrid(data.sst_grid);
      renderMiniChlGrid(data.sst_grid);
      renderMiniBuoys(data.buoys);
    }

    // 2. Populate Full Map layers
    if (window.fullMapLayers && window.fullMapInstance) {
      renderFullSstGrid(data.sst_grid);
      renderFullGisZones(data.gis_zones);
      renderFullHazards(data.hazards);
      renderFullPorts(data.ports);
    }

    // 3. Load active PFZ and Alerts views
    loadPfzListView();
    renderFullHazardsView(data.hazards);
    if (typeof window.onHomeMapDataLoaded === 'function') window.onHomeMapDataLoaded(data);
  } catch (err) {
    console.error("Failed to load map layers:", err);
  }
}

// Mini Map SST rendering
function renderMiniSstGrid(grid) {
  if (!grid || !window.miniMapLayers) return;
  window.miniMapLayers.sst.clearLayers();

  grid.forEach(pt => {
    let color = '#00f2fe';
    if (pt.sst >= 30.0) color = '#ef4444';
    else if (pt.sst >= 28.5) color = '#f59e0b';
    else if (pt.sst >= 27.0) color = '#10b981';
    else if (pt.sst >= 25.0) color = '#38bdf8';

    L.circleMarker([pt.lat, pt.lon], {
      radius: pt.is_front ? 8 : 6,
      fillColor: color,
      fillOpacity: 0.65,
      color: color,
      weight: 1
    }).bindTooltip(`SST: ${pt.sst}°C | Chl: ${pt.chl} mg/m³`, { permanent: false })
      .addTo(window.miniMapLayers.sst);
  });
}

function renderMiniChlGrid(grid) {
  if (!grid || !window.miniMapLayers) return;
  window.miniMapLayers.chl.clearLayers();

  grid.forEach(pt => {
    let color = '#065f46';
    if (pt.chl >= 1.5) color = '#facc15';
    else if (pt.chl >= 0.8) color = '#10b981';
    else if (pt.chl >= 0.3) color = '#00f2fe';

    L.circleMarker([pt.lat, pt.lon], {
      radius: 6,
      fillColor: color,
      fillOpacity: 0.6,
      color: color,
      weight: 1
    }).addTo(window.miniMapLayers.chl);
  });
}

function renderMiniBuoys(buoysGeoJson) {
  if (!window.miniMapLayers || !window.miniMapLayers.markers) return;
  const group = window.miniMapLayers.markers;
  group.clearLayers();
  const features = buoysGeoJson?.features || [];
  features.forEach(feature => {
    const [lon, lat] = feature.geometry?.coordinates || [];
    if (lat == null || lon == null) return;
    const p = feature.properties || {};
    const icon = L.divIcon({ className:'', html:'<div style="background:#f59e0b; border:2px solid #ffffff; width:12px; height:12px; border-radius:50%; box-shadow:0 0 8px #f59e0b;"></div>', iconSize:[12,12], iconAnchor:[6,6] });
    const marker = L.marker([lat,lon], {icon});
    marker.on('click', () => {
      const title = p.name || p.id || 'Ocean Buoy';
      if (typeof setHomeMapContext === 'function') setHomeMapContext({
        type:'buoy', lat, lon, name:title, region:p.region, depth_m:p.depth_m
      });
    });
    marker.bindTooltip(p.name || 'Ocean Buoy');
    marker.addTo(group);
  });
}

function renderFullSstGrid(grid) {
  if (!grid || !window.fullMapLayers) return;
  window.fullMapLayers.sstGrid.clearLayers();

  grid.forEach(pt => {
    let color = '#38bdf8';
    if (pt.sst >= 30.0) color = '#ef4444';
    else if (pt.sst >= 28.5) color = '#f59e0b';
    else if (pt.sst >= 27.0) color = '#10b981';

    L.circleMarker([pt.lat, pt.lon], {
      radius: pt.is_front ? 8 : 5,
      fillColor: color,
      fillOpacity: pt.is_front ? 0.75 : 0.45,
      color: pt.is_front ? '#ffffff' : color,
      weight: pt.is_front ? 2 : 1
    }).bindTooltip(`ISRO/NOAA SST: ${pt.sst}°C | Chl-a: ${pt.chl} mg/m³ ${pt.is_front ? ' (Thermal Frontier)' : ''}`)
      .addTo(window.fullMapLayers.sstGrid);
  });
}

function renderFullGisZones(geojson) {
  if (!geojson || !window.fullMapLayers) return;
  window.fullMapLayers.gisZones.clearLayers();

  L.geoJSON(geojson, {
    style: (feature) => {
      const type = feature.properties.zone_type;
      if (type === "IMBL_GEOFENCE" || type === "RESTRICTED_NAVAL") {
        return { color: '#dc2626', weight: 2, fillColor: '#dc2626', fillOpacity: 0.14, dashArray: '6 4' };
      } else if (type === "MPA") {
        return { color: '#059669', weight: 2, fillColor: '#059669', fillOpacity: 0.14, dashArray: '4 4' };
      }
      return { color: '#0284c7', weight: 1.5, fill: false, opacity: 0.6 };
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`
        <div style="font-size:12px; max-width:220px; color:#0f172a;">
          <b style="color:#0284c7;">${p.name}</b><br>
          <span style="color:#64748b;">${p.zone_type}</span>
          <p style="margin-top:4px; font-size:11px;">${p.description}</p>
        </div>
      `);
    }
  }).addTo(window.fullMapLayers.gisZones);
}

function renderFullHazards(hazards) {
  if (!hazards || !window.fullMapLayers) return;
  window.fullMapLayers.hazards.clearLayers();

  hazards.forEach(h => {
    let iconChar = '⚠️';
    if (h.advisory_type === "LIGHTNING") iconChar = '⚡';
    else if (h.advisory_type === "CYCLONE") iconChar = '🌀';

    const icon = L.divIcon({
      className: 'custom-hazard-pin',
      html: `<div style="background:#ffffff; border:2px solid #dc2626; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(220,38,38,0.25);">${iconChar}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    let hLat = 13.08, hLon = 80.27;
    if (h.region.includes("Tamil Nadu")) { hLat = 9.20; hLon = 79.10; }
    else if (h.region.includes("Kerala")) { hLat = 9.96; hLon = 76.00; }
    else if (h.region.includes("Gujarat")) { hLat = 21.00; hLon = 69.80; }
    else if (h.region.includes("Odisha")) { hLat = 19.50; hLon = 86.20; }

    L.marker([hLat, hLon], { icon }).bindPopup(`
      <div style="font-size:12px; max-width:220px; color:#0f172a;">
        <b style="color:#dc2626;">${h.title}</b><br>
        <span style="color:#64748b;">${h.issuing_authority}</span>
        <p style="margin-top:4px; font-size:11px;">${h.description}</p>
      </div>
    `).addTo(window.fullMapLayers.hazards);
  });
}

function renderFullPorts(portsGeoJson) {
  if (!portsGeoJson || !window.fullMapLayers) return;
  window.fullMapLayers.ports.clearLayers();

  L.geoJSON(portsGeoJson, {
    pointToLayer: (feature, latlng) => {
      const icon = L.divIcon({
        className: 'custom-port-pin',
        html: `<div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; padding:3px 8px; font-size:12px; font-weight:700; color:#0f172a; box-shadow:0 2px 4px rgba(0,0,0,0.08); display:flex; align-items:center; gap:4px;">⚓ ${feature.properties.name.split(' ')[0]}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });
      return L.marker(latlng, { icon }).bindPopup(`<b>${feature.properties.name}</b><br>${feature.properties.region}`);
    }
  }).addTo(window.fullMapLayers.ports);
}

function displayPFZsOnMap(pfzList) {
  if (!pfzList || !window.fullMapLayers) return;
  window.fullMapLayers.pfzZones.clearLayers();

  pfzList.forEach((pfz) => {
    const icon = L.divIcon({
      className: 'custom-pfz-pin',
      html: `<div style="background:#ffffff; border:2px solid #059669; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.12);">🐟</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([pfz.latitude, pfz.longitude], { icon }).bindPopup(`
      <div style="font-size:12px; max-width:220px; color:#0f172a;">
        <b style="color:#059669;">${pfz.zone_name}</b><br>
        <span>Distance: <b>${pfz.distance_km} km (${pfz.distance_nm} NM)</b> heading <b>${pfz.bearing_cardinal}</b></span><br>
        <span>SST: <b>${pfz.sst_celsius}°C</b> | Depth: <b>${pfz.depth_meters}m</b></span><br>
        <span>Confidence: <b>${Math.round(pfz.confidence_score * 100)}%</b></span>
      </div>
    `).addTo(window.fullMapLayers.pfzZones);

    L.circle([pfz.latitude, pfz.longitude], {
      radius: 4500,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.14,
      weight: 2,
      dashArray: '3 3'
    }).addTo(window.fullMapLayers.pfzZones);
  });
}

function displayRoutesOnRouteMap(routesList) {
  if (!routesList || !window.routeMapLayers || !window.routeMapInstance) return;
  window.currentActiveRoutes = routesList;
  window.routeMapLayers.routes.clearLayers();
  if (window.routeMapLayers.markers) window.routeMapLayers.markers.clearLayers();

  let combinedBounds = null;

  routesList.forEach((route, idx) => {
    const isAlpha = route.route_id.includes("ALPHA");
    const routeColor = isAlpha ? "#d97706" : "#0284c7";
    const latlngs = route.waypoints.map(wp => [wp.latitude, wp.longitude]);

    const poly = L.polyline(latlngs, {
      color: routeColor,
      weight: isAlpha ? 3.0 : 4.5,
      opacity: isAlpha ? 0.85 : 0.98,
      dashArray: isAlpha ? '8 6' : null,
      lineCap: 'round',
      lineJoin: 'round'
    }).bindPopup(`
      <div style="color:#0f172a; font-family:var(--font-sans, sans-serif); font-size:12px; max-width:250px;">
        <b style="color:${routeColor}; font-size:13px;">${route.route_name}</b><br>
        <span style="color:#475569;">Distance: <b>${route.total_distance_nm} NM (${route.total_distance_km} km)</b></span><br>
        <span style="color:#475569;">Duration: <b>${route.estimated_duration_hours} hrs</b></span><br>
        <span style="color:${route.safety_score >= 85 ? '#059669' : '#d97706'}; font-weight:800;">Safety Score: ${route.safety_score}/100</span><br>
        <p style="margin-top:4px; font-size:11px; color:#334155;">${route.recommendation_verdict}</p>
      </div>
    `).addTo(window.routeMapLayers.routes);

    if (!combinedBounds) {
      combinedBounds = poly.getBounds();
    } else {
      combinedBounds.extend(poly.getBounds());
    }

    // Place waypoint markers along Route Bravo (recommended) or Route Alpha
    if (!isAlpha || routesList.length === 1) {
      route.waypoints.forEach((wp, wIdx) => {
        let pinColor = '#0284c7';
        let pinLabel = `${wIdx}`;
        if (wIdx === 0) {
          pinColor = '#059669';
          pinLabel = '⚓';
        } else if (wIdx === route.waypoints.length - 1) {
          pinColor = '#d97706';
          pinLabel = '🏁';
        }

        const icon = L.divIcon({
          className: 'route-waypoint-pin',
          html: `<div style="background:#ffffff; border:2px solid ${pinColor}; color:#0f172a; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.15);">${pinLabel}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const steerInfo = wp.steer_instruction || (wp.bearing_deg != null ? `Steer ${wp.bearing_deg}° ${wp.bearing_cardinal || ''}` : 'Maintain course');

        L.marker([wp.latitude, wp.longitude], { icon }).bindPopup(`
          <div style="font-size:12px; font-family:var(--font-sans, sans-serif); color:#0f172a; max-width:240px;">
            <b style="color:#0284c7; font-size:13px;">${wp.name}</b><br>
            <span style="color:#64748b; font-size:11px;">Coordinates: (${wp.latitude.toFixed(4)}°N, ${wp.longitude.toFixed(4)}°E)</span><br>
            <div style="margin:6px 0; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:5px 8px; font-size:11px; font-weight:800; color:#15803d;">
              🧭 ${steerInfo}
            </div>
            <div style="font-size:11px; color:#334155; line-height:1.4;">
              <span>Leg Distance: <b>${wp.segment_distance_nm} NM</b></span> · 
              <span>Cumulative: <b>${wp.cumulative_distance_nm} NM</b></span><br>
              <span>🌊 Swell: <b>${wp.wave_height_m}m</b> · Wind: <b>${wp.wind_speed_kts} kt</b></span><br>
              <span style="color:#10b981; font-weight:700;">Safe Nav Corridor Clearance: <b>${wp.hazard_proximity_km} km</b></span>
            </div>
          </div>
        `).addTo(window.routeMapLayers.routes);
      });
    }
  });

  if (combinedBounds && window.routeMapInstance) {
    window.currentActiveRouteBounds = combinedBounds;
    window.routeMapInstance.fitBounds(combinedBounds, { padding: [40, 40], maxZoom: 11 });
  }
}

function fitCalculatedRoute() {
  if (window.routeMapInstance && window.currentActiveRouteBounds) {
    window.routeMapInstance.fitBounds(window.currentActiveRouteBounds, { padding: [40, 40], maxZoom: 11 });
  }
}
window.fitCalculatedRoute = fitCalculatedRoute;

async function loadPfzListView() {
  try {
    const res = await fetch('/api/pfz/zones?port_name=chennai');
    if (!res.ok) return;
    const list = await res.json();
    const container = document.getElementById('pfzFullGrid');
    if (!container) return;

    let html = '';
    list.forEach(p => {
      html += `
        <div class="pfz-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:1.4rem;"></span>
            <span style="font-size:0.72rem; font-weight:800; color:var(--emerald-safe); background:var(--emerald-bg); padding:2px 8px; border-radius:10px;">Confidence: ${Math.round(p.confidence_score*100)}%</span>
          </div>
          <h3 style="font-size:0.95rem; font-weight:700; color:var(--brand-primary);">${p.zone_name}</h3>
          <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">
            Distance: <b>${p.distance_km} km (${p.distance_nm} NM)</b> · Heading: <b>${p.bearing_cardinal} (${p.bearing_deg}°)</b><br>
            SST: <b>${p.sst_celsius}°C</b> · Chlorophyll-a: <b>${p.chlorophyll_mg_m3} mg/m³</b><br>
            Depth: <b>${p.depth_meters}m</b><br>
            Target Species: <i style="color:var(--text-main);">${p.species_association.join(', ')}</i>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
            <button class="btn-primary" style="padding:6px 12px; font-size:0.78rem;" onclick="focusPfzOnMap(${p.latitude}, ${p.longitude}, '${p.zone_name}')">
              View on Live Map 
            </button>
            <button class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; background:var(--bg-card); border:1px solid var(--border-medium); color:var(--brand-primary); border-radius:6px; cursor:pointer; font-weight:700;" onclick="setRouteDestinationFromPfz(${p.latitude}, ${p.longitude}, '${p.zone_name}')">
              🧭 Plot Route to PFZ
            </button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (e) {
    console.error("PFZ view load error:", e);
  }
}

function renderFullHazardsView(hazards) {
  const container = document.getElementById('alertsFullList');
  if (!container || !hazards) return;

  let html = '';
  hazards.forEach(h => {
    const isCritical = (h.severity || '').toUpperCase() === 'CRITICAL';
    const borderColor = isCritical ? 'var(--rose-danger)' : 'var(--amber-warning)';
    html += `
      <div class="alert-item" style="border-left-color:${borderColor};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:0.95rem; color:var(--text-main);">${h.title}</strong>
          <span style="font-size:0.7rem; font-weight:800; color:${borderColor};">${h.severity}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--brand-primary); margin:2px 0;">Issued by: ${h.issuing_authority} · Region: ${h.region}</div>
        <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:4px;">${h.description}</p>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.loadAllMapLayersData = loadAllMapLayersData;
window.displayPFZsOnMap = displayPFZsOnMap;
window.displayRoutesOnRouteMap = displayRoutesOnRouteMap;
window.loadPfzListView = loadPfzListView;
window.renderMiniBuoys = renderMiniBuoys;
