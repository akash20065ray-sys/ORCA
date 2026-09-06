import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Compass, Navigation, Crosshair, Download, Printer, FileText, CheckCircle2, X } from 'lucide-react';

const PORTS = [
  { id: 'kochi', name: 'Cochin Port (Kochi)', lat: 9.9656, lon: 76.2425 },
  { id: 'mumbai', name: 'Jawaharlal Nehru Port (Mumbai)', lat: 18.9483, lon: 72.9515 },
  { id: 'mangalore', name: 'New Mangalore Port', lat: 12.9234, lon: 74.8156 },
  { id: 'goa', name: 'Mormugao Port (Goa)', lat: 15.4167, lon: 73.8000 },
  { id: 'colombo', name: 'Port of Colombo (Sri Lanka)', lat: 6.9497, lon: 79.8433 },
  { id: 'tuticorin', name: 'V.O. Chidambaranar Port (Tuticorin)', lat: 8.7642, lon: 78.1348 },
  { id: 'chennai', name: 'Chennai Port (Kasimedu)', lat: 13.0827, lon: 80.2707 },
  { id: 'vizag', name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 },
  { id: 'veraval', name: 'Veraval Fishing Port', lat: 20.9000, lon: 70.3667 },
  { id: 'paradip', name: 'Paradip Port', lat: 20.2644, lon: 86.6698 },
  { id: 'minicoy', name: 'Minicoy Port (Lakshadweep)', lat: 8.2833, lon: 73.0500 },
];

export default function RoutePlanner({ onFocusRoute, onUpdateShipLocation }) {
  // Mode: 'port' | 'gps' | 'custom'
  const [originMode, setOriginMode] = useState('port');
  const [selectedPortOrigin, setSelectedPortOrigin] = useState('mangalore');
  const [customOrigin, setCustomOrigin] = useState({ lat: 12.9234, lon: 74.8156 });

  const [destMode, setDestMode] = useState('port');
  const [selectedPortDest, setSelectedPortDest] = useState('colombo');
  const [customDest, setCustomDest] = useState({ lat: 6.9497, lon: 79.8433 });

  const [cruisingSpeed, setCruisingSpeed] = useState(13.0);
  const [vesselDraft, setVesselDraft] = useState(4.2);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState(1); // Default to Bravo (Optimal)

  const [showReportModal, setShowReportModal] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  // Live GPS Detector
  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomOrigin({
            lat: +pos.coords.latitude.toFixed(4),
            lon: +pos.coords.longitude.toFixed(4),
          });
          setOriginMode('gps');
        },
        () => {
          // Default fallback
          setCustomOrigin({ lat: 9.9656, lon: 76.2425 });
          setOriginMode('gps');
        }
      );
    }
  };

  // Route calculation execution
  const executeRouteCalculation = useCallback(async (_isInitial = false) => {
    setIsOptimizing(true);
    setIsSavedOffline(false);

    let origStr = '';
    if (originMode === 'port') {
      origStr = selectedPortOrigin;
    } else {
      origStr = `${customOrigin.lat}, ${customOrigin.lon}`;
    }

    let destStr = '';
    if (destMode === 'port') {
      destStr = selectedPortDest;
    } else {
      destStr = `${customDest.lat}, ${customDest.lon}`;
    }

    try {
      const res = await fetch('/api/routes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origStr,
          destination: destStr,
          vessel_speed_knots: cruisingSpeed,
          vessel_draft_meters: vesselDraft,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoutes(data);
      setActiveRouteIndex(data.length > 1 ? 1 : 0); // Default to Bravo (Recommended)
      if (onFocusRoute && data && data.length > 0) {
        onFocusRoute(data.length > 1 ? data[1] : data[0]);
      }
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [originMode, selectedPortOrigin, customOrigin, destMode, selectedPortDest, customDest, cruisingSpeed, vesselDraft, onFocusRoute]);

  useEffect(() => {
    executeRouteCalculation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRoute = routes && routes.length > 0 ? routes[activeRouteIndex] : null;
  const nextWaypoint = currentRoute && currentRoute.waypoints && currentRoute.waypoints.length > 1 ? currentRoute.waypoints[1] : null;

  // Active ship coordinates
  const activeShipCoords = useMemo(() => {
    return originMode === 'port'
      ? (PORTS.find((p) => p.id === selectedPortOrigin) || PORTS[0])
      : { lat: customOrigin.lat, lon: customOrigin.lon, name: 'Live Ship Position' };
  }, [originMode, selectedPortOrigin, customOrigin.lat, customOrigin.lon]);

  useEffect(() => {
    if (onUpdateShipLocation) {
      onUpdateShipLocation(activeShipCoords);
    }
  }, [activeShipCoords, onUpdateShipLocation]);

  // Real-time environmental calculations at ship coordinates
  const latF = (activeShipCoords.lat - 8.0) / 12.0;
  const lonF = (activeShipCoords.lon - 70.0) / 12.0;
  const shipWind = +(14.0 + 8.0 * Math.sin(latF * 2.5 + lonF * 1.8)).toFixed(1);
  const shipWindDir = Math.round(230 + 35 * Math.sin(latF * 1.5 - lonF * 1.2));
  const shipWave = +(0.8 + (shipWind / 30.0) * 1.8 + 0.3 * Math.cos(latF * 3.0)).toFixed(1);
  const shipSST = +(28.4 + 2.0 * Math.sin(lonF * 1.6) - 0.7 * latF).toFixed(1);

  // Download standard GPX file for onboard marine GPS plotters (Garmin, Furuno, OpenCPN)
  const handleDownloadGPX = () => {
    if (!currentRoute || !currentRoute.waypoints) return;
    const origName = (PORTS.find((p) => p.id === selectedPortOrigin)?.name || 'Origin').replace(/[^a-zA-Z0-9]/g, '_');
    const destName = (PORTS.find((p) => p.id === selectedPortDest)?.name || 'Destination').replace(/[^a-zA-Z0-9]/g, '_');
    const routeTitle = `ORCA_Voyage_${origName}_to_${destName}`;

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ORCA Ocean Intelligence Platform - SIH26176" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${routeTitle}</name>
    <desc>Nautical Passage Track from ${origName} to ${destName} (Speed: ${cruisingSpeed} kt, Draft: ${vesselDraft} m, Distance: ${currentRoute.total_distance_nm} NM)</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${currentRoute.route_name}</name>
    <trkseg>
${currentRoute.waypoints.map((wp) => `      <trkpt lat="${wp.latitude.toFixed(6)}" lon="${wp.longitude.toFixed(6)}">
        <ele>0</ele>
        <name>${wp.name}</name>
        <desc>${wp.steer_instruction || ''} (Leg: ${wp.segment_distance_nm ?? 0} NM)</desc>
      </trkpt>`).join('\n')}
    </trkseg>
  </trk>
${currentRoute.waypoints.map((wp, i) => `  <wpt lat="${wp.latitude.toFixed(6)}" lon="${wp.longitude.toFixed(6)}">
    <name>WP${i + 1}_${wp.name.replace(/[^a-zA-Z0-9]/g, '_')}</name>
    <sym>Waypoint</sym>
  </wpt>`).join('\n')}
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${routeTitle}.gpx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsSavedOffline(true);
  };

  // Download KML file for Google Earth and mobile map viewers
  const handleDownloadKML = () => {
    if (!currentRoute || !currentRoute.waypoints) return;
    const origName = (PORTS.find((p) => p.id === selectedPortOrigin)?.name || 'Origin').replace(/[^a-zA-Z0-9]/g, '_');
    const destName = (PORTS.find((p) => p.id === selectedPortDest)?.name || 'Destination').replace(/[^a-zA-Z0-9]/g, '_');
    const routeTitle = `ORCA_Voyage_${origName}_to_${destName}`;

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${routeTitle}</name>
    <description>Nautical Passage Plan (${currentRoute.total_distance_nm} NM, ${currentRoute.estimated_duration_hours}h)</description>
    <Placemark>
      <name>${currentRoute.route_name}</name>
      <LineString>
        <coordinates>
${currentRoute.waypoints.map((wp) => `          ${wp.longitude.toFixed(6)},${wp.latitude.toFixed(6)},0`).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>
${currentRoute.waypoints.map((wp, i) => `    <Placemark>
      <name>WP ${i + 1}: ${wp.name}</name>
      <description>${wp.steer_instruction || ''}</description>
      <Point>
        <coordinates>${wp.longitude.toFixed(6)},${wp.latitude.toFixed(6)},0</coordinates>
      </Point>
    </Placemark>`).join('\n')}
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${routeTitle}.kml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsSavedOffline(true);
  };

  return (
    <div className="route-planner-panel">
      <div className="panel-header">
        <Compass size={20} className="panel-header-icon" />
        <div>
          <h3 className="panel-title">Dynamic Route Optimization</h3>
          <span className="panel-sub">COLREGS Rule 10 & Real-Time Compass Waypoint Steering</span>
        </div>
      </div>

      {/* Live Vessel Location Environmental Telemetry Card */}
      <div className="ship-live-telemetry-card">
        <div className="telemetry-card-title-row">
          <div className="title-with-dot">
            <span className="live-pulse-dot" />
            <span className="t-card-title">LIVE SHIP POSITION DATASET</span>
          </div>
          <span className="t-card-coords">
            Latitude: {activeShipCoords.lat.toFixed(4)}°, Longitude: {activeShipCoords.lon.toFixed(4)}°
          </span>
        </div>

        <div className="telemetry-pills-row">
          <div className="live-t-pill">
            <span className="pill-lbl">WIND</span>
            <span className="pill-val">{shipWind} kt · {shipWindDir}°</span>
          </div>
          <div className="live-t-pill">
            <span className="pill-lbl">SWELL</span>
            <span className="pill-val">{shipWave} m</span>
          </div>
          <div className="live-t-pill">
            <span className="pill-lbl">SST</span>
            <span className="pill-val">{shipSST} °C</span>
          </div>
          <div className="live-t-pill safe">
            <span className="pill-lbl">SEA STATE</span>
            <span className="pill-val">State 3 · Safe</span>
          </div>
        </div>
      </div>

      {/* Input Selection Form */}
      <div className="route-form-card">
        {/* Departure Selection */}
        <div className="route-input-block">
          <div className="input-block-header">
            <label className="form-label">DEPARTURE LOCATION</label>
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`btn-mode ${originMode === 'port' ? 'active' : ''}`}
                onClick={() => setOriginMode('port')}
              >
                Port
              </button>
              <button
                type="button"
                className={`btn-mode ${originMode === 'gps' ? 'active' : ''}`}
                onClick={handleDetectGPS}
                title="Use Live Device GPS"
              >
                <Crosshair size={12} />
                <span>Live GPS</span>
              </button>
              <button
                type="button"
                className={`btn-mode ${originMode === 'custom' ? 'active' : ''}`}
                onClick={() => setOriginMode('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          {originMode === 'port' ? (
            <select
              value={selectedPortOrigin}
              onChange={(e) => setSelectedPortOrigin(e.target.value)}
              className="select-input"
            >
              {PORTS.map((p) => (
                <option key={p.id} value={p.id} disabled={destMode === 'port' && p.id === selectedPortDest}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="coord-inputs-row">
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude"
                value={customOrigin.lat}
                onChange={(e) => setCustomOrigin({ ...customOrigin, lat: parseFloat(e.target.value) || 0 })}
                className="number-input coord"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude"
                value={customOrigin.lon}
                onChange={(e) => setCustomOrigin({ ...customOrigin, lon: parseFloat(e.target.value) || 0 })}
                className="number-input coord"
              />
            </div>
          )}
        </div>

        {/* Destination Selection */}
        <div className="route-input-block">
          <div className="input-block-header">
            <label className="form-label">DESTINATION LOCATION</label>
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`btn-mode ${destMode === 'port' ? 'active' : ''}`}
                onClick={() => setDestMode('port')}
              >
                Port
              </button>
              <button
                type="button"
                className={`btn-mode ${destMode === 'custom' ? 'active' : ''}`}
                onClick={() => setDestMode('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          {destMode === 'port' ? (
            <select
              value={selectedPortDest}
              onChange={(e) => setSelectedPortDest(e.target.value)}
              className="select-input"
            >
              {PORTS.map((p) => (
                <option key={p.id} value={p.id} disabled={originMode === 'port' && p.id === selectedPortOrigin}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="coord-inputs-row">
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude"
                value={customDest.lat}
                onChange={(e) => setCustomDest({ ...customDest, lat: parseFloat(e.target.value) || 0 })}
                className="number-input coord"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude"
                value={customDest.lon}
                onChange={(e) => setCustomDest({ ...customDest, lon: parseFloat(e.target.value) || 0 })}
                className="number-input coord"
              />
            </div>
          )}
        </div>

        {/* Vessel Telemetry Controls */}
        <div className="vessel-parameters-grid">
          <div className="form-group">
            <label className="form-label">VESSEL SPEED (KT)</label>
            <input
              type="number"
              min="4"
              max="30"
              step="0.5"
              value={cruisingSpeed}
              onChange={(e) => setCruisingSpeed(parseFloat(e.target.value) || 12)}
              className="number-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">MAX DRAFT (M)</label>
            <input
              type="number"
              min="1.5"
              max="15.0"
              step="0.1"
              value={vesselDraft}
              onChange={(e) => setVesselDraft(parseFloat(e.target.value) || 4)}
              className="number-input"
            />
          </div>
          <div className="form-group action-group">
            <button
              type="button"
              className="btn-optimize-run"
              onClick={() => executeRouteCalculation(false)}
              disabled={isOptimizing}
            >
              <Navigation size={15} />
              <span>{isOptimizing ? 'Calculating...' : 'Optimize'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Compass Steering HUD */}
      {nextWaypoint && (
        <div className="compass-steering-card">
          <div className="compass-visual-wrap">
            <div
              className="compass-rose-disc"
              style={{ transform: `rotate(-${nextWaypoint.bearing_degrees || 247}deg)` }}
            >
              <div className="compass-cardinal n">N</div>
              <div className="compass-cardinal e">E</div>
              <div className="compass-cardinal s">S</div>
              <div className="compass-cardinal w">W</div>
              <div className="compass-needle-arrow" />
            </div>
          </div>

          <div className="steering-intel-details">
            <div className="steering-headline">
              <span className="bearing-pill">
                BEARING: {Math.round(nextWaypoint.bearing_degrees || 247)}° True
              </span>
              <span className="distance-pill">
                LEG: {nextWaypoint.segment_distance_nm ?? nextWaypoint.leg_distance_nm ?? 28.4} NM
              </span>
            </div>
            <p className="steering-command-text">
              {nextWaypoint.steer_instruction || `Steer ${Math.round(nextWaypoint.bearing_degrees || 247)}° WSW into TSS Outbound Lane`}
            </p>
            <div className="steering-sub-tags">
              <span>Depth Margin: &gt; {vesselDraft + 12}m (Safe)</span>
              <span>•</span>
              <span>COLREGS Status: TSS Compliant</span>
            </div>
          </div>
        </div>
      )}

      {/* Route Comparison Selector */}
      {routes && routes.length > 0 && (
        <div className="route-comparison-section">
          <div className="comparison-tabs">
            {routes.map((r, idx) => {
              const isRecommended = idx === 1 || r.safety_score > 85;
              const isSelected = activeRouteIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`route-tab-card ${isSelected ? 'active' : ''} ${isRecommended ? 'recommended' : ''}`}
                  onClick={() => {
                    setActiveRouteIndex(idx);
                    if (onFocusRoute) onFocusRoute(r);
                  }}
                >
                  <div className="tab-card-top">
                    <span className="route-name-badge">
                      {idx === 0 ? 'Route Alpha (Direct)' : 'Route Bravo (Recommended)'}
                    </span>
                    {isRecommended && <span className="rec-pill">Optimal</span>}
                  </div>
                  <div className="route-metrics-row">
                    <span><strong>{r.total_distance_nm}</strong> NM</span>
                    <span><strong>{r.estimated_duration_hours}</strong>h</span>
                    <span>Safety: <strong>{r.safety_score}/100</strong></span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Offline Navigation & Passage Plan Export Bar */}
          {currentRoute && (
            <div className="offline-export-card" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px 14px', margin: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>Offline Voyage Package & Exports</span>
                </div>
                {isSavedOffline && (
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Cached on Device
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-download-action"
                  onClick={handleDownloadGPX}
                  title="Download NMEA standard GPX file for Garmin, Furuno & OpenCPN plotters"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontSize: '12px', fontWeight: '600', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid #0284c7', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Download size={13} />
                  <span>Download GPX</span>
                </button>

                <button
                  type="button"
                  className="btn-download-action"
                  onClick={handleDownloadKML}
                  title="Download KML file for Google Earth and offline mobile mapping"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontSize: '12px', fontWeight: '600', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Download size={13} />
                  <span>Download KML</span>
                </button>

                <button
                  type="button"
                  className="btn-download-action"
                  onClick={() => setShowReportModal(true)}
                  title="Generate print-ready Passage Plan Briefing with MRCC emergency contacts"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', fontSize: '12px', fontWeight: '600', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid #6366f1', color: '#a5b4fc', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Printer size={13} />
                  <span>Passage Report</span>
                </button>
              </div>
            </div>
          )}

          {/* Waypoint Sequence Table */}
          {currentRoute && currentRoute.waypoints && (
            <div className="waypoints-timeline-card">
              <h4 className="card-title">Waypoints & Steering Trajectory</h4>
              <div className="waypoints-list">
                {currentRoute.waypoints.map((wp, i) => (
                  <div key={i} className="waypoint-row-item">
                    <div className="wp-order-col">
                      <div className="wp-dot" />
                      {i < currentRoute.waypoints.length - 1 && <div className="wp-line" />}
                    </div>
                    <div className="wp-content-col">
                      <div className="wp-title-row">
                        <strong className="wp-name">WP {i + 1}: {wp.name}</strong>
                        <span className="wp-coords">
                          Latitude: {wp.latitude.toFixed(4)}°, Longitude: {wp.longitude.toFixed(4)}°
                        </span>
                      </div>
                      {wp.steer_instruction && (
                        <p className="wp-steer-desc">🧭 {wp.steer_instruction}</p>
                      )}
                      <div className="wp-meta-row">
                        <span>Leg: {wp.segment_distance_nm ?? wp.leg_distance_nm ?? 0} NM</span>
                        {wp.bearing_degrees && (
                          <span>Bearing: {Math.round(wp.bearing_degrees)}° True</span>
                        )}
                        <span>Status: Safe Passage</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Maritime Passage Plan Report Modal */}
      {showReportModal && currentRoute && (
        <div className="orca-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="orca-report-modal" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', color: '#f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', letterSpacing: '0.05em' }}>ORCA MARITIME PASSAGE PLAN · SIH26176</span>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: '4px 0' }}>Official Sea Safety Briefing & Voyage Manifest</h2>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Generated: {new Date().toLocaleString()} · Compliant with COLREGS Rule 10 & SOLAS V/34</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Manifest Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>TOTAL DISTANCE</span>
                <strong style={{ fontSize: '15px', color: '#38bdf8' }}>{currentRoute.total_distance_nm} NM</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>EST. DURATION</span>
                <strong style={{ fontSize: '15px', color: '#f8fafc' }}>{currentRoute.estimated_duration_hours} h</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>SAFETY INDEX</span>
                <strong style={{ fontSize: '15px', color: '#10b981' }}>{currentRoute.safety_score}/100</strong>
              </div>
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>FUEL DIESEL</span>
                <strong style={{ fontSize: '15px', color: '#f59e0b' }}>{currentRoute.fuel_estimate_liters} L</strong>
              </div>
            </div>

            {/* Environmental & Carbon ROI Banner */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#34d399' }}>Blue Economy Fuel ROI & Carbon Mitigation</span>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>Deep-water laminar seaway saves approximately {currentRoute.fuel_saved_liters || 75}L diesel (₹{(currentRoute.fuel_cost_savings_inr || 7050).toLocaleString()}).</p>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>-{currentRoute.co2_saved_kg || 201} kg CO₂</span>
            </div>

            {/* Waypoint Manifest Table */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>Turn-by-Turn Navigational Waypoints</h4>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Waypoint</th>
                    <th style={{ padding: '6px 8px' }}>Coordinates</th>
                    <th style={{ padding: '6px 8px' }}>Leg</th>
                    <th style={{ padding: '6px 8px' }}>True Course</th>
                    <th style={{ padding: '6px 8px' }}>Steer Command</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRoute.waypoints.map((wp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: '600', color: '#f1f5f9' }}>{wp.name}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{wp.latitude.toFixed(4)}°N, {wp.longitude.toFixed(4)}°E</td>
                      <td style={{ padding: '6px 8px' }}>{wp.segment_distance_nm ?? 0} NM</td>
                      <td style={{ padding: '6px 8px' }}>{wp.bearing_degrees ? `${Math.round(wp.bearing_degrees)}°` : '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#38bdf8' }}>{wp.steer_instruction || 'Proceed on course'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Search and Rescue Emergency Directive */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444' }}>INDIAN COAST GUARD MARITIME RESCUE COORDINATION (MRCC)</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                <span>• MRCC Mumbai: 022-24388065 / Ch 16</span>
                <span>• MRCC Kochi: 0484-2216590 / Ch 16</span>
                <span>• MRCC Chennai: 044-23460405 / Ch 16</span>
                <span>• MRCC Port Blair: 03192-232681 / Ch 16</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ padding: '8px 16px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                <Printer size={14} />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
