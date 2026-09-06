import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MapStage from './components/MapStage';
import AskOrcaChat from './components/AskOrcaChat';
import RoutePlanner from './components/RoutePlanner';
import PFZAdvisor from './components/PFZAdvisor';
import WeatherDashboard from './components/WeatherDashboard';
import SafetyAlerts from './components/SafetyAlerts';
import EmergencyModal from './components/EmergencyModal';
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
} from 'lucide-react';

export default function App() {
  // Navigation: 'home' | 'chat' | 'routes' | 'pfz' | 'weather' | 'safety'
  const [activeTab, setActiveTab] = useState('home');
  const [isHomePanelOpen, setIsHomePanelOpen] = useState(true);

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

  // Map Focus Targets
  const [focusedRoute, setFocusedRoute] = useState(null);
  const [focusedPFZ, setFocusedPFZ] = useState(null);

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

  // Preset button cycler (Compact -> Standard -> Wide)
  const cycleDockWidthPresets = () => {
    if (dockWidth < 460) setDockWidth(580);
    else if (dockWidth < 650) setDockWidth(780);
    else setDockWidth(400);
  };

  return (
    <div className={`orca-app-root ${isDraggingResizer ? 'is-resizing' : ''}`}>
      {/* Top Header */}
      <Header
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenAlertsModal={() => handleSelectTab('safety')}
      />

      {/* Main Workspace Layout */}
      <main className="orca-main-layout">
        {/* Leftmost Vertical Navigation Rail */}
        <nav className="left-nav-rail">
          {/* 1. Home (Map on Left + ORCA AI on Right) */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleSelectTab('home')}
            title="Home (Map on Left + ORCA AI on Right Split View)"
          >
            <Map size={20} />
            <span className="rail-label">Home</span>
          </button>

          {/* 2. Ask ORCA (Full Dedicated AI Workspace) */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleSelectTab('chat')}
            title="Ask ORCA (Dedicated Full AI Chatbot & History)"
          >
            <Bot size={20} />
            <span className="rail-label">Ask ORCA</span>
          </button>

          {/* 3. Dynamic Route Planner */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => handleSelectTab('routes')}
            title="Dynamic Route Planner (Left Controls, Right Static Map)"
          >
            <Compass size={20} />
            <span className="rail-label">Routes</span>
          </button>

          {/* 4. INCOIS PFZ Fishery Advisor (Dedicated Full Page) */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'pfz' ? 'active' : ''}`}
            onClick={() => handleSelectTab('pfz')}
            title="INCOIS PFZ Fishery Advisor (Dedicated Dashboard)"
          >
            <Fish size={20} />
            <span className="rail-label">PFZ</span>
          </button>

          {/* 5. Marine Weather (Dedicated Full Page) */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => handleSelectTab('weather')}
            title="Marine Weather & Telemetry (Dedicated Dashboard)"
          >
            <CloudSun size={20} />
            <span className="rail-label">Weather</span>
          </button>

          {/* 6. Safety & Advisories (Dedicated Full Page) */}
          <button
            type="button"
            className={`rail-item ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => handleSelectTab('safety')}
            title="Safety Advisories & COLREGS Matrix (Dedicated Dashboard)"
          >
            <Shield size={20} />
            <span className="rail-label">Safety</span>
          </button>
        </nav>

        {/* 1. HOME TAB: Left Map Stage + Draggable Resizer + Right ORCA AI Copilot */}
        {activeTab === 'home' && (
          <>
            {/* Split View: Left Map Stage */}
            <section className="map-stage-column">
              <MapStage
                focusedRoute={focusedRoute}
                focusedPFZ={focusedPFZ}
                hideLayersControl={false}
                shipLocation={null}
                isStaticMap={false}
                isFullMap={!isHomePanelOpen}
                onToggleFullMap={handleToggleFullMap}
              />
            </section>

            {/* Split View: Right ORCA AI Dock & Draggable Resizer Gutter */}
            {isHomePanelOpen && (
              <>
                <div
                  className={`dock-resizer-gutter right-gutter ${isDraggingResizer ? 'dragging' : ''}`}
                  onMouseDown={handleStartResize}
                  onDoubleClick={() => setDockWidth(540)}
                  title="Drag cursor left or right to resize ORCA panel (Double-click to reset)"
                >
                  <div className="resizer-handle-line" />
                </div>

                <aside
                  className="right-tools-dock"
                  style={{ width: `${dockWidth}px` }}
                >
                  <div className="dock-size-toolbar">
                    <div className="dock-toolbar-left">
                      <span className="dock-badge-title">ORCA AI Marine Copilot</span>
                    </div>
                    <div className="dock-toolbar-right">
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
                    </div>
                  </div>

                  <div className="dock-content-scroll">
                    <AskOrcaChat onShowOnMap={handleShowOnMap} isDedicatedPage={false} />
                  </div>
                </aside>
              </>
            )}
          </>
        )}

        {/* 2. DYNAMIC ROUTE PLANNER: Left Route Controls + Right Static Map (User explicit instruction) */}
        {activeTab === 'routes' && (
          <>
            <aside className="left-tools-dock" style={{ width: '490px' }}>
              <div className="dock-size-toolbar">
                <div className="dock-toolbar-left">
                  <span className="dock-badge-title">Dynamic Route Engine</span>
                </div>
              </div>
              <div className="dock-content-scroll">
                <RoutePlanner
                  onFocusRoute={setFocusedRoute}
                  onUpdateShipLocation={setShipLocation}
                />
              </div>
            </aside>

            {/* Right Static Map (No animation in route planner as requested) */}
            <section className="map-stage-column">
              <MapStage
                focusedRoute={focusedRoute}
                focusedPFZ={null}
                hideLayersControl={true}
                shipLocation={shipLocation}
                isStaticMap={true}
              />
            </section>
          </>
        )}

        {/* 3. DEDICATED ASK ORCA FULL CHATBOT WORKSPACE (NO Map) */}
        {activeTab === 'chat' && (
          <section className="dedicated-chat-section">
            <AskOrcaChat onShowOnMap={handleShowOnMap} isDedicatedPage={true} />
          </section>
        )}

        {/* 4. DEDICATED INCOIS PFZ ADVISOR (NO Map as requested) */}
        {activeTab === 'pfz' && (
          <section className="dedicated-full-page">
            <PFZAdvisor onFocusPFZ={setFocusedPFZ} />
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

      {/* High-Priority GMDSS Emergency Mayday Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />
    </div>
  );
}
