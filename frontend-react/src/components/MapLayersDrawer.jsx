import React, { useEffect } from 'react';
import {
  Layers,
  X,
  Wind,
  Waves,
  Compass,
  Fish,
  Shield,
  Anchor,
  Check,
  Radio,
  Thermometer,
  Leaf,
  Navigation,
  AlertTriangle,
  Ship,
  Lightbulb,
} from 'lucide-react';

export default function MapLayersDrawer({
  isOpen,
  onToggle,
  onClose,
  activeBasemap,
  setActiveBasemap,
  activeWindyMode,
  setActiveWindyMode,
  vectorLayers,
  setVectorLayers,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleVector = (key) => {
    setVectorLayers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const countActiveLayers = () => {
    let count = 1; // Basemap
    if (activeWindyMode) count++;
    Object.values(vectorLayers).forEach((val) => {
      if (val) count++;
    });
    return count;
  };

  return (
    <>
      {/* 1-Click Floating Map Layers Button */}
      <button
        type="button"
        className={`floating-layers-btn ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title="1-Click Toggle Map Layers Drawer"
      >
        <Layers size={18} />
        <span className="btn-label">Map Layers</span>
        <span className="layer-count-badge">{countActiveLayers()}</span>
      </button>

      {/* Backdrop overlay for 1-click outside dismiss */}
      {isOpen && <div className="drawer-backdrop" onClick={onClose} />}

      {/* 1-Click Map Layers Drawer Panel */}
      <div className={`map-layers-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="header-title-wrap">
            <Layers size={20} className="title-icon" />
            <div>
              <h3 className="drawer-title">Map Layers & Telemetry Overlays</h3>
              <p className="drawer-subtitle">Configure oceanographic layers, sensors, and GIS boundaries</p>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            title="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Section 1: Basemaps (Featured Satellite) */}
          <div className="drawer-section">
            <div className="section-label">BASE CARTOGRAPHY (HD EARTH OBSERVATION)</div>
            <div className="basemap-grid">
              {[
                { id: 'satellite', name: 'Satellite HD', sub: 'High-res Earth observation (Default & Featured)' },
                { id: 'dark', name: 'Dark Navigation', sub: 'Night watch & high-contrast ECDIS' },
                { id: 'light', name: 'CartoDB Positron', sub: 'Clean high-contrast daylight marine' },
                { id: 'openseamap', name: 'OpenSeaMap', sub: 'Navigational seamarks & beacons' },
              ].map((bm) => (
                <div
                  key={bm.id}
                  className={`basemap-card ${activeBasemap === bm.id ? 'selected' : ''}`}
                  onClick={() => setActiveBasemap(bm.id)}
                >
                  <div className="card-check">
                    {activeBasemap === bm.id && <Check size={14} />}
                  </div>
                  <div className="card-info">
                    <span className="bm-name">{bm.name}</span>
                    <span className="bm-sub">{bm.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Windy Particle Flow Simulation */}
          <div className="drawer-section">
            <div className="section-label">WINDY 60 FPS METEOROLOGICAL ENGINE</div>
            <div className="windy-mode-grid">
              {[
                { id: 'wind', label: 'Wind Field', icon: Wind, desc: 'Real-time surface wind streamlines & Beaufort scale' },
                { id: 'waves', label: 'Swell Waves', icon: Waves, desc: 'Propagating oceanic swells & wavefront ripple crests' },
                { id: 'sst', label: 'SST Thermal Fronts', icon: Thermometer, desc: 'Sea surface temperature isotherms (ocean-only mask)' },
                { id: 'chlorophyll', label: 'Chlorophyll-a Biomass', icon: Leaf, desc: 'ISRO Oceansat-3 OCM primary productivity & eddies' },
                { id: 'currents', label: 'Surface Currents', icon: Compass, desc: 'Hydrodynamic drift & coastal boundary currents' },
              ].map((wm) => {
                const IconComponent = wm.icon;
                const isSelected = activeWindyMode === wm.id;
                return (
                  <div
                    key={wm.id}
                    className={`windy-mode-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActiveWindyMode(isSelected ? null : wm.id)}
                  >
                    <IconComponent size={18} className="mode-icon" />
                    <div className="mode-details">
                      <span className="mode-title">{wm.label}</span>
                      <span className="mode-desc">{wm.desc}</span>
                    </div>
                    <div className="mode-pill">{isSelected ? 'Active' : 'Off'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Expanded Marine & GIS Vector Layers */}
          <div className="drawer-section">
            <div className="section-label">EXPANDED NAUTICAL & GEOSPATIAL VECTORS</div>
            <div className="toggle-list">
              {[
                { key: 'routes', label: 'Optimized Shipping Corridors', sub: 'Route Bravo (Deep-Water Safe) & Alpha (Direct)', icon: Anchor, color: '#0284c7' },
                { key: 'pfz', label: 'INCOIS PFZ Fishing Zones', sub: 'Yellowfin Tuna, Skipjack & Mackerel hotspots', icon: Fish, color: '#059669' },
                { key: 'buoys', label: 'In-situ Moored Ocean Buoys', sub: 'NIOT / INCOIS buoys (CB-02, AD-06, BD-08, DS-04)', icon: Radio, color: '#e11d48' },
                { key: 'cyclone', label: 'IMD Tropical Cyclone Alert Track', sub: 'Severe storm alert corridor & 34kt gale wind radius', icon: AlertTriangle, color: '#dc2626' },
                { key: 'ais', label: 'International AIS Trunk Sea Lanes', sub: 'Arabian Sea to Malacca international cargo lanes', icon: Ship, color: '#3b82f6' },
                { key: 'lighthouses', label: 'Coastal Lighthouses & AIS Beacons', sub: 'Vypin, Alappuzha, Vizhinjam, Minicoy Lights with range rings', icon: Lightbulb, color: '#eab308' },
                { key: 'tss', label: 'Traffic Separation Schemes (TSS)', sub: 'IMO Cochin Port Inbound / Outbound shipping lanes', icon: Navigation, color: '#8b5cf6' },
                { key: 'bathymetry', label: '200m Continental Shelf Edge', sub: 'Bathymetric depth contour separating coastal waters', icon: Compass, color: '#0891b2' },
                { key: 'trenches', label: 'Deep Bathymetric Ridges (3000m+)', sub: 'Chagos-Laccadive Ridge & Arabian Abyssal Trench', icon: Compass, color: '#1e3a8a' },
                { key: 'ports', label: 'Commercial Seaports & Anchorages', sub: 'Kochi ICTT, New Mangalore, Vizhinjam Deep Seaport', icon: Anchor, color: '#0f766e' },
                { key: 'mpa', label: 'Marine Protected Areas (MPAs)', sub: 'Vembanad Sanctuary, Gulf of Mannar Biosphere', icon: Shield, color: '#10b981' },
                { key: 'restricted', label: 'Naval Firing Exclusion Corridors', sub: 'Restricted Sector W-4 military training zone', icon: Shield, color: '#ef4444' },
              ].map((layer) => {
                const isEnabled = vectorLayers[layer.key];
                return (
                  <div
                    key={layer.key}
                    className={`toggle-item ${isEnabled ? 'enabled' : ''}`}
                    onClick={() => toggleVector(layer.key)}
                  >
                    <div className="toggle-left">
                      <span className="layer-dot" style={{ backgroundColor: layer.color }} />
                      <div className="layer-text">
                        <span className="layer-name">{layer.label}</span>
                        <span className="layer-sub">{layer.sub}</span>
                      </div>
                    </div>
                    <div className={`switch-toggle ${isEnabled ? 'on' : 'off'}`}>
                      <span className="switch-handle" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="btn-drawer-secondary"
            onClick={() => {
              setActiveBasemap('satellite');
              setActiveWindyMode('wind');
              setVectorLayers({
                routes: true,
                pfz: true,
                buoys: true,
                cyclone: true,
                ais: true,
                lighthouses: true,
                tss: true,
                bathymetry: true,
                trenches: false,
                ports: true,
                mpa: true,
                restricted: true,
              });
            }}
          >
            Reset to Recommended
          </button>
          <button type="button" className="btn-drawer-primary" onClick={onClose}>
            Apply & Close
          </button>
        </div>
      </div>
    </>
  );
}
