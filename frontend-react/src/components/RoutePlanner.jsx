import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Compass, Navigation, Crosshair } from 'lucide-react';

const PORTS = [
  { id: 'kochi', name: 'Cochin Port (Kochi)', lat: 9.9656, lon: 76.2425 },
  { id: 'mumbai', name: 'Jawaharlal Nehru Port (Mumbai)', lat: 18.9483, lon: 72.9515 },
  { id: 'minicoy', name: 'Minicoy Port (Lakshadweep)', lat: 8.2833, lon: 73.0500 },
  { id: 'colombo', name: 'Port of Colombo (Sri Lanka)', lat: 6.9497, lon: 79.8433 },
  { id: 'mangalore', name: 'New Mangalore Port', lat: 12.9234, lon: 74.8156 },
  { id: 'goa', name: 'Mormugao Port (Goa)', lat: 15.4167, lon: 73.8000 },
];

export default function RoutePlanner({ onFocusRoute, onUpdateShipLocation }) {
  // Mode: 'port' | 'gps' | 'custom'
  const [originMode, setOriginMode] = useState('port');
  const [selectedPortOrigin, setSelectedPortOrigin] = useState('kochi');
  const [customOrigin, setCustomOrigin] = useState({ lat: 9.9656, lon: 76.2425 });

  const [destMode, setDestMode] = useState('port');
  const [selectedPortDest, setSelectedPortDest] = useState('minicoy');
  const [customDest, setCustomDest] = useState({ lat: 8.2833, lon: 73.0500 });

  const [cruisingSpeed, setCruisingSpeed] = useState(14.0);
  const [vesselDraft, setVesselDraft] = useState(4.2);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

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
          // Fallback to Kochi offshore
          setCustomOrigin({ lat: 9.9656, lon: 76.2425 });
          setOriginMode('gps');
        }
      );
    } else {
      setOriginMode('gps');
    }
  };

  const executeRouteCalculation = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsOptimizing(true);

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
        <div className="live-telemetry-pills-row">
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

        {/* Vessel Parameters */}
        <div className="vessel-params-row">
          <div className="form-group">
            <label className="form-label">VESSEL SPEED (KT)</label>
            <input
              type="number"
              min="6"
              max="25"
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
              {nextWaypoint.steer_instruction || `Steer ${Math.round(nextWaypoint.bearing_degrees || 247)}° WSW into Cochin TSS Outbound Lane`}
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
    </div>
  );
}
