import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MapStage from './components/MapStage';
import AskOrcaChat from './components/AskOrcaChat';
import RoutePlanner from './components/RoutePlanner';
import PFZAdvisor from './components/PFZAdvisor';
import WeatherDashboard from './components/WeatherDashboard';
import SafetyAlerts from './components/SafetyAlerts';
import EmergencyModal from './components/EmergencyModal';
import AlertNotificationModal from './components/AlertNotificationModal';
import {
  Map,
  Bot,
  Compass,
  Fish,
  CloudSun,
  Shield,
  X,
  Minimize2,
  Maximize2,
  WifiOff,
  Download,
} from 'lucide-react';
import { exportSOSReceiptPDF } from './utils/pdfExport';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { t, currentLang } = useLanguage();
  // Navigation: 'home' | 'chat' | 'routes' | 'pfz' | 'weather' | 'safety'
  const [activeTab, setActiveTab] = useState('home');
  const [isHomePanelOpen, setIsHomePanelOpen] = useState(true);

  // Mobile Viewport & Offline State Tracking
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [mobileHomeView, setMobileHomeView] = useState('map'); // 'map' | 'copilot'
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  // Smooth continuous draggable sliding dock width (for Home split view)
  const [dockWidth, setDockWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('orca_dock_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (val >= 320 && val <= 900) return val;
      }
    } catch {
      // ignore
    }
    return 540;
  });
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);

  // Live Ship Location (tracked for Route Planner live datasets)
  const [shipLocation, setShipLocation] = useState({
    lat: 9.9656,
    lon: 76.2425,
    name: 'Cochin Port (Kochi)',
  });

  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [emergencyReceipt, setEmergencyReceipt] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Map Focus Targets
  const [focusedRoute, setFocusedRoute] = useState(null);
  const [focusedPFZ, setFocusedPFZ] = useState(null);

  // Dynamic Map Action Synchronization (Real-time Chatbot -> Map Bridge)
  const [mapTargetLocation, setMapTargetLocation] = useState(null);
  const [externalWindyMode, setExternalWindyMode] = useState(undefined);
  const [externalVectorLayers, setExternalVectorLayers] = useState(undefined);

  // Map -> Chat Coordinate Context Bridge
  const [selectedMapTarget, setSelectedMapTarget] = useState(null);

  // Dynamic Route Engine Map Interactive Selection & Drag States
  const [routePickMode, setRoutePickMode] = useState(null); // 'origin' | 'destination' | null
  const [pickedRouteLocation, setPickedRouteLocation] = useState(null);
  const [draggedRouteEndpoint, setDraggedRouteEndpoint] = useState(null);
  const [routeEndpoints, setRouteEndpoints] = useState({
    origin: { lat: 9.9656, lon: 76.2425, name: 'Cochin Port (Kochi)' },
    destination: { lat: 6.9497, lon: 79.8433, name: 'Port of Colombo (Sri Lanka)' },
  });
  const [mobileRouteView, setMobileRouteView] = useState('panel'); // 'panel' | 'map'

  const handleStartRoutePick = (target) => {
    setRoutePickMode(target);
    if (isMobile) {
      setMobileRouteView('map');
    }
  };

  const handleCancelRoutePick = () => {
    setRoutePickMode(null);
  };

  const handleSelectRoutePoint = ({ lat, lon }) => {
    setPickedRouteLocation({ target: routePickMode, lat, lon, timestamp: Date.now() });
    setRoutePickMode(null);
    if (isMobile) {
      setMobileRouteView('panel');
    }
  };

  const handleDragRouteEndpoint = (endpoint, coords) => {
    setDraggedRouteEndpoint({ endpoint, ...coords, timestamp: Date.now() });
  };

  // Mobile resize & network listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectMapLocation = (coords) => {
    setSelectedMapTarget(coords);
    setIsHomePanelOpen(true);
    if (isMobile) {
      setMobileHomeView('copilot');
    }
  };

  // Save dock width
  useEffect(() => {
    try {
      localStorage.setItem('orca_dock_width', dockWidth.toString());
    } catch {
      // ignore
    }
  }, [dockWidth]);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setIsHomePanelOpen(true);
    }
  };

  const handleToggleFullMap = () => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setIsHomePanelOpen(false);
    } else {
      setIsHomePanelOpen((prev) => !prev);
    }
  };

  // Draggable Sliding Resizer Handler (Map is on left, ORCA is on right)
  const handleStartResize = (e) => {
    e.preventDefault();
    setIsDraggingResizer(true);
    const startX = e.clientX;
    const startWidth = dockWidth;

    const onMouseMove = (moveEvt) => {
      // Moving mouse to the left increases right dock width
      const delta = startX - moveEvt.clientX;
      const newWidth = Math.max(340, Math.min(window.innerWidth - 420, startWidth + delta));
      setDockWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingResizer(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleShowOnMap = (targetType) => {
    setActiveTab(targetType);
  };

  // Real-time Chatbot ➔ Map Bridge
  const handleMapAction = ({ type, data, mode, allZones }) => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setIsHomePanelOpen(true);
    }
    if (isMobile) {
      setMobileHomeView('map');
    }

    if (type === 'pfz' && data) {
      setFocusedPFZ({
        ...data,
        allZones: allZones || data.allZones || null,
      });
      setExternalVectorLayers((prev) => ({ ...(prev || {}), pfz: true }));
      const lat = data.latitude ?? data.lat;
      const lon = data.longitude ?? data.lon;
      if (lat && lon) {
        setMapTargetLocation({ lat, lon, zoom: 10, ts: Date.now() });
      }
    } else if (type === 'route' && data) {
      setFocusedRoute(data);
      setExternalVectorLayers((prev) => ({ ...(prev || {}), routes: true }));
      if (data.waypoints && data.waypoints.length > 0) {
        const mid = data.waypoints[Math.floor(data.waypoints.length / 2)];
        const lat = mid.latitude ?? mid.lat;
        const lon = mid.longitude ?? mid.lon;
        if (lat && lon) {
          setMapTargetLocation({ lat, lon, zoom: 7, ts: Date.now() });
        }
      }
    } else if (type === 'weather') {
      setExternalWindyMode(mode || 'wind');
    } else if (type === 'flyto' && data) {
      setMapTargetLocation({ ...data, ts: Date.now() });
    } else if (type === 'toggle_layers') {
      setExternalVectorLayers((prev) => {
        const nextState = !prev?.bathymetry;
        return {
          ...(prev || {}),
          bathymetry: nextState,
          buoys: nextState,
          ports: nextState,
          pfz: nextState,
        };
      });
    }
  };

  const handleFocusPFZ = (zone) => {
    setFocusedPFZ(zone);
    setActiveTab('home');
    setIsHomePanelOpen(true);
    if (isMobile) {
      setMobileHomeView('map');
    }
    setExternalVectorLayers((prev) => ({ ...(prev || {}), pfz: true }));
    const lat = zone.latitude ?? zone.lat;
    const lon = zone.longitude ?? zone.lon;
    if (lat && lon) {
      setMapTargetLocation({ lat, lon, zoom: 10, ts: Date.now() });
    }
  };

  // Preset button cycler (Compact -> Standard -> Wide)
  const cycleDockWidthPresets = () => {
    if (dockWidth < 460) setDockWidth(580);
    else if (dockWidth < 650) setDockWidth(780);
    else setDockWidth(400);
  };

  return (
    <div className={`orca-app-root ${isDraggingResizer ? 'is-resizing' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Top Header */}
      <Header
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenAlertsModal={() => setIsAlertModalOpen(true)}
      />

      {/* Offshore Marine Mode Banner (Appears when cellular/satellite connection drops) */}
      {isOffline && (
        <div className="orca-offline-status-banner">
          <WifiOff size={15} />
          <span>
            <strong>OFFLINE MARINE MODE:</strong> Cellular/Satellite signal unavailable. Operating on local onboard intelligence & emergency protocols.
          </span>
        </div>
      )}

      {/* Active Non-Blocking GMDSS Emergency Distress Beacon Bar */}
      {emergencyReceipt && (
        <div
          className="active-emergency-top-bar"
          style={{
            background: 'linear-gradient(90deg, #7f1d1d 0%, #b91c1c 50%, #991b1b 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: '700',
            borderBottom: '2px solid #ef4444',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
            zIndex: 1000,
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#fca5a5',
                boxShadow: '0 0 8px #ef4444',
                display: 'inline-block',
              }}
            />
            <span>
              🚨 <strong>MAYDAY BEACON ACTIVE:</strong> {emergencyReceipt.assigned_mrcc || 'ICG MRCC Kochi'} Dispatched (ETA: {emergencyReceipt.eta_minutes || 24} min) · Token: <code>{emergencyReceipt.dispatch_token}</code> · Standby VHF CH 16
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => exportSOSReceiptPDF(emergencyReceipt)}
              style={{
                background: '#047857',
                color: '#ffffff',
                border: '1px solid #34d399',
                padding: '4px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              title="Download official PDF distress dispatch record directly to Downloads"
            >
              <Download size={13} />
              <span>Download PDF Record</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '4px 9px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              Beacon Details
            </button>

            <button
              type="button"
              onClick={() => setEmergencyReceipt(null)}
              style={{
                background: 'transparent',
                color: '#fecaca',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline',
              }}
              title="End / deactivate emergency broadcast"
            >
              End Emergency
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <main className="orca-main-layout">
        {/* Leftmost Vertical Navigation Rail (Desktop Only) */}
        {!isMobile && (
          <nav className="left-nav-rail">
            <button
              type="button"
              className={`rail-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => handleSelectTab('home')}
              title={t('navHome', 'Home')}
            >
              <Map size={20} />
              <span className="rail-label">{t('navHome', 'Home')}</span>
            </button>

            <button
              type="button"
              className={`rail-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => handleSelectTab('chat')}
              title={t('navChat', 'Ask ORCA')}
            >
              <Bot size={20} />
              <span className="rail-label">{t('navChat', 'Ask ORCA')}</span>
            </button>

            <button
              type="button"
              className={`rail-item ${activeTab === 'routes' ? 'active' : ''}`}
              onClick={() => handleSelectTab('routes')}
              title={t('navRoutes', 'Routes')}
            >
              <Compass size={20} />
              <span className="rail-label">{t('navRoutes', 'Routes')}</span>
            </button>

            <button
              type="button"
              className={`rail-item ${activeTab === 'pfz' ? 'active' : ''}`}
              onClick={() => handleSelectTab('pfz')}
              title={t('navPFZ', 'PFZ')}
            >
              <Fish size={20} />
              <span className="rail-label">{t('navPFZ', 'PFZ')}</span>
            </button>

            <button
              type="button"
              className={`rail-item ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => handleSelectTab('weather')}
              title={t('navWeather', 'Weather')}
            >
              <CloudSun size={20} />
              <span className="rail-label">{t('navWeather', 'Weather')}</span>
            </button>

            <button
              type="button"
              className={`rail-item ${activeTab === 'safety' ? 'active' : ''}`}
              onClick={() => handleSelectTab('safety')}
              title={t('navSafety', 'Safety')}
            >
              <Shield size={20} />
              <span className="rail-label">{t('navSafety', 'Safety')}</span>
            </button>
          </nav>
        )}

        {/* 1. HOME TAB: Left Map Stage + Draggable Resizer + Right ORCA AI Copilot */}
        {activeTab === 'home' && (
          <>
            {/* Split View: Map Stage (Full on Mobile if mobileHomeView is 'map') */}
            {(!isMobile || mobileHomeView === 'map') && (
              <section className="map-stage-column">
                <MapStage
                  focusedRoute={focusedRoute}
                  focusedPFZ={focusedPFZ}
                  hideLayersControl={false}
                  shipLocation={null}
                  isStaticMap={false}
                  isFullMap={!isHomePanelOpen || isMobile}
                  onToggleFullMap={handleToggleFullMap}
                  mapTargetLocation={mapTargetLocation}
                  externalWindyMode={externalWindyMode}
                  externalVectorLayers={externalVectorLayers}
                  onSelectMapLocation={handleSelectMapLocation}
                />

                {/* Mobile Floating Action Button to Switch to Copilot */}
                {isMobile && (
                  <button
                    type="button"
                    className="mobile-floating-copilot-btn"
                    onClick={() => setMobileHomeView('copilot')}
                    title="Open ORCA AI Copilot"
                  >
                    <Bot size={19} />
                    <span>Ask ORCA AI</span>
                  </button>
                )}
              </section>
            )}

            {/* Split View: Right ORCA AI Dock (Desktop) or Full View (Mobile when mobileHomeView is 'copilot') */}
            {(!isMobile ? isHomePanelOpen : mobileHomeView === 'copilot') && (
              <>
                {!isMobile && (
                  <div
                    className={`dock-resizer-gutter right-gutter ${isDraggingResizer ? 'dragging' : ''}`}
                    onMouseDown={handleStartResize}
                    onDoubleClick={() => setDockWidth(540)}
                    title="Drag cursor left or right to resize ORCA panel (Double-click to reset)"
                  >
                    <div className="resizer-handle-line" />
                  </div>
                )}

                <aside
                  className={`right-tools-dock ${isMobile ? 'mobile-full-dock' : ''}`}
                  style={{ width: isMobile ? '100%' : `${dockWidth}px` }}
                >
                  <div className="dock-size-toolbar">
                    <div className="dock-toolbar-left">
                      <span className="dock-badge-title">{t('dockCopilot', 'ORCA AI Marine Copilot')}</span>
                    </div>
                    <div className="dock-toolbar-right">
                      {isMobile ? (
                        <button
                          type="button"
                          className="btn-dock-tool close mobile-back-btn"
                          onClick={() => setMobileHomeView('map')}
                          title="Back to Map View"
                        >
                          <Map size={14} />
                          <span>View Map</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-dock-tool"
                            onClick={cycleDockWidthPresets}
                            title={`Current width: ${dockWidth}px. Click to cycle presets.`}
                          >
                            {dockWidth > 650 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            <span className="tool-size-text">{dockWidth}px</span>
                          </button>
                          <button
                            type="button"
                            className="btn-dock-tool close"
                            onClick={() => setIsHomePanelOpen(false)}
                            title="Maximize Map (Hide dock)"
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="dock-content-scroll">
                    <AskOrcaChat
                      onShowOnMap={(targetType) => {
                        handleShowOnMap(targetType);
                        if (isMobile) setMobileHomeView('map');
                      }}
                      onMapAction={(action) => {
                        handleMapAction(action);
                        if (isMobile) setMobileHomeView('map');
                      }}
                      isDedicatedPage={false}
                      selectedMapTarget={selectedMapTarget}
                      onClearMapTarget={() => setSelectedMapTarget(null)}
                      shipLocation={shipLocation}
                      isMobile={isMobile}
                    />
                  </div>
                </aside>
              </>
            )}
          </>
        )}

        {/* 2. DYNAMIC ROUTE PLANNER: Responsive Layout with Interactive Map Endpoint Picker */}
        {activeTab === 'routes' && (
          <>
            {(!isMobile || mobileRouteView === 'panel') && (
              <aside className="left-tools-dock" style={{ width: isMobile ? '100%' : '490px' }}>
                <div className="dock-size-toolbar">
                  <div className="dock-toolbar-left">
                    <span className="dock-badge-title">Dynamic Route Engine</span>
                  </div>
                  {isMobile && (
                    <div className="dock-toolbar-right">
                      <button
                        type="button"
                        className="btn-dock-tool mobile-back-btn"
                        onClick={() => setMobileRouteView('map')}
                        title="View active route on map"
                      >
                        <Map size={14} />
                        <span>View Map</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="dock-content-scroll">
                  <RoutePlanner
                    onFocusRoute={(r) => {
                      setFocusedRoute(r);
                    }}
                    onUpdateShipLocation={setShipLocation}
                    pickingMode={routePickMode}
                    onStartPickOnMap={handleStartRoutePick}
                    pickedMapLocation={pickedRouteLocation}
                    draggedEndpoint={draggedRouteEndpoint}
                    onUpdateEndpoints={setRouteEndpoints}
                  />
                </div>
              </aside>
            )}

            {/* Map Column (Desktop always, Mobile when mobileRouteView === 'map') */}
            {(!isMobile || mobileRouteView === 'map') && (
              <section className="map-stage-column" style={isMobile ? { width: '100%', height: '100%', position: 'relative' } : {}}>
                {isMobile && (
                  <button
                    type="button"
                    className="mobile-back-floating-btn"
                    onClick={() => setMobileRouteView('panel')}
                  >
                    ← Back to Route Form
                  </button>
                )}
                <MapStage
                  focusedRoute={focusedRoute}
                  focusedPFZ={null}
                  hideLayersControl={true}
                  shipLocation={shipLocation}
                  isStaticMap={true}
                  mapTargetLocation={mapTargetLocation}
                  externalWindyMode={externalWindyMode}
                  externalVectorLayers={externalVectorLayers}
                  routePickMode={routePickMode}
                  onCancelRoutePick={handleCancelRoutePick}
                  onSelectRoutePoint={handleSelectRoutePoint}
                  routeOrigin={routeEndpoints.origin}
                  routeDestination={routeEndpoints.destination}
                  onDragRouteEndpoint={handleDragRouteEndpoint}
                />
              </section>
            )}
          </>
        )}

        {/* 3. DEDICATED ASK ORCA FULL CHATBOT WORKSPACE (NO Map) */}
        {activeTab === 'chat' && (
          <section className="dedicated-chat-section">
            <AskOrcaChat
              onShowOnMap={(targetType) => {
                handleShowOnMap(targetType);
                if (isMobile) setMobileHomeView('map');
              }}
              onMapAction={(action) => {
                handleMapAction(action);
                if (isMobile) setMobileHomeView('map');
              }}
              isDedicatedPage={true}
              selectedMapTarget={selectedMapTarget}
              onClearMapTarget={() => setSelectedMapTarget(null)}
              shipLocation={shipLocation}
              isMobile={isMobile}
            />
          </section>
        )}

        {/* 4. DEDICATED INCOIS PFZ ADVISOR (NO Map as requested) */}
        {activeTab === 'pfz' && (
          <section className="dedicated-full-page">
            <PFZAdvisor onFocusPFZ={handleFocusPFZ} />
          </section>
        )}

        {/* 5. DEDICATED MARINE WEATHER STATION (NO Map) */}
        {activeTab === 'weather' && (
          <section className="dedicated-full-page">
            <WeatherDashboard />
          </section>
        )}

        {/* 6. DEDICATED SAFETY & ADVISORIES MATRIX (NO Map) */}
        {activeTab === 'safety' && (
          <section className="dedicated-full-page">
            <SafetyAlerts />
          </section>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on screens < 768px) */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'home' && mobileHomeView === 'map' ? 'active' : ''}`}
            onClick={() => {
              handleSelectTab('home');
              setMobileHomeView('map');
            }}
          >
            <Map size={19} />
            <span>{t('dockMap', 'Map')}</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'chat' || (activeTab === 'home' && mobileHomeView === 'copilot') ? 'active' : ''}`}
            onClick={() => {
              if (activeTab === 'home') {
                setMobileHomeView('copilot');
              } else {
                handleSelectTab('chat');
              }
            }}
          >
            <Bot size={19} />
            <span>{t('navChat', 'Ask ORCA')}</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => handleSelectTab('routes')}
          >
            <Compass size={19} />
            <span>{t('navRoutes', 'Routes')}</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'pfz' ? 'active' : ''}`}
            onClick={() => handleSelectTab('pfz')}
          >
            <Fish size={19} />
            <span>{t('navPFZ', 'PFZ')}</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => handleSelectTab('weather')}
          >
            <CloudSun size={19} />
            <span>{t('navWeather', 'Weather')}</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => handleSelectTab('safety')}
          >
            <Shield size={19} />
            <span>{t('navSafety', 'Safety')}</span>
          </button>
        </nav>
      )}

      {/* High-Priority GMDSS Emergency Mayday Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onTransmitSuccess={(receipt) => {
          setEmergencyReceipt(receipt);
          setIsEmergencyOpen(false);
        }}
        existingReceipt={emergencyReceipt}
      />

      {/* Maritime Hazard & Port Signal Notification Tray */}
      <AlertNotificationModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onNavigateSafety={() => {
          setIsAlertModalOpen(false);
          handleSelectTab('safety');
        }}
        onViewOnMap={(lat, lon) => {
          setIsAlertModalOpen(false);
          handleSelectTab('home');
          if (lat && lon) {
            setMapTargetLocation({ lat, lon, zoom: 9, ts: Date.now() });
          }
        }}
      />
    </div>
  );
}
