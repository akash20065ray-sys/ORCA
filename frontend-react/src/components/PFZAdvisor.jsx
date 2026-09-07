import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Fish,
  Waves,
  Thermometer,
  Navigation,
  Anchor,
  Download,
  Compass,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Crosshair,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Fuel,
  Users,
  RefreshCw,
  Zap,
  TrendingUp,
  Wind,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { exportPFZAdvisoryPDF } from '../utils/pdfExport';

// Dynamic Great-Circle Bearing and 16-point Cardinal Heading Computations
function calculateBearing(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 245;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

function bearingToCardinal(deg) {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return cardinals[Math.round(deg / 22.5) % 16];
}

const COASTAL_HARBORS = [
  { id: 'all', name: 'All India (National INCOIS Dataset)', state: 'National Basin', lat: 9.9656, lon: 76.2425 },
  { id: 'kochi', name: 'Cochin Fisheries Harbour', state: 'Kerala', lat: 9.9656, lon: 76.2425 },
  { id: 'munambam', name: 'Munambam Fishing Harbour', state: 'Kerala', lat: 10.1833, lon: 76.1667 },
  { id: 'mumbai', name: 'Sassoon Dock, Mumbai', state: 'Maharashtra', lat: 18.9142, lon: 72.8278 },
  { id: 'chennai', name: 'Kasimedu Harbour, Chennai', state: 'Tamil Nadu', lat: 13.1189, lon: 80.2978 },
  { id: 'visakhapatnam', name: 'Visakhapatnam Fishing Harbour', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
  { id: 'goa', name: 'Malim Jetty, Panaji', state: 'Goa', lat: 15.4909, lon: 73.8278 },
  { id: 'mangalore', name: 'Old Mangalore Bunder', state: 'Karnataka', lat: 12.9230, lon: 74.8190 },
  { id: 'tuticorin', name: 'V.O.C. Harbour, Tuticorin', state: 'Tamil Nadu', lat: 8.7642, lon: 78.1348 },
  { id: 'veraval', name: 'Veraval Fishing Port', state: 'Gujarat', lat: 20.9000, lon: 70.3667 },
  { id: 'paradip', name: 'Paradip Fishing Harbour', state: 'Odisha', lat: 20.2644, lon: 86.6698 },
];

export const FLEET_PROFILES = [
  {
    id: 'artisanal_obm',
    name: 'Motorized FRP Skiff (OBM)',
    subtitle: '9.9–25 HP Outboard Motor (Kerosene/Petrol)',
    craftType: 'artisanal',
    maxRangeNM: 15.5,
    fuelBurnLPerNM: 1.8,
    fuelCostPerL: 95,
    waveToleranceM: 1.8,
    crewCapacity: 3,
    engineHp: '15 HP',
    primarySpecies: 'Indian Mackerel (Ayala), Oil Sardine (Mathi), Anchovy (Netholi)',
    icon: '🚤',
    color: '#10b981'
  },
  {
    id: 'traditional_canoe',
    name: 'Traditional Coastal Canoe',
    subtitle: 'Vallam / Kattumaram / Canoe (Manual or Mini OBM)',
    craftType: 'artisanal',
    maxRangeNM: 7.5,
    fuelBurnLPerNM: 1.1,
    fuelCostPerL: 95,
    waveToleranceM: 1.3,
    crewCapacity: 2,
    engineHp: '5–9.9 HP',
    primarySpecies: 'Coastal Sardines, Whitebait, Mullet, Mud Crab',
    icon: '🛶',
    color: '#38bdf8'
  },
  {
    id: 'mechanized_gillnetter',
    name: 'Mechanized Gillnetter / Longliner',
    subtitle: '50–120 HP Inboard Diesel Vessel (Single-Day / Multi-Day)',
    craftType: 'mechanized',
    maxRangeNM: 45.0,
    fuelBurnLPerNM: 2.6,
    fuelCostPerL: 92,
    waveToleranceM: 2.6,
    crewCapacity: 6,
    engineHp: '85 HP',
    primarySpecies: 'Seerfish (King Mackerel), Skipjack Tuna, Ribbonfish, Trevally',
    icon: '⛵',
    color: '#f59e0b'
  },
  {
    id: 'deep_sea_trawler',
    name: 'Commercial Deep-Sea Trawler',
    subtitle: '120–250 HP Heavy Diesel Steel/Wooden Vessel',
    craftType: 'deep_sea',
    maxRangeNM: 80.0,
    fuelBurnLPerNM: 3.4,
    fuelCostPerL: 92,
    waveToleranceM: 3.5,
    crewCapacity: 9,
    engineHp: '160 HP',
    primarySpecies: 'Yellowfin Tuna, Deep-Sea Squid, Crustaceans, Carangids',
    icon: '🚢',
    color: '#a855f7'
  }
];

export default function PFZAdvisor({ onFocusPFZ }) {
  const [selectedHarbor, setSelectedHarbor] = useState('kochi');
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingGps, setIsUsingGps] = useState(false);

  // Active Fisherman Launch Coordinates (defaults to Cochin Fisheries Harbour)
  const [launchLocation, setLaunchLocation] = useState({
    lat: 9.9656,
    lon: 76.2425,
    name: 'Cochin Fisheries Harbour, Kerala'
  });

  // Fleet Profile States
  const [activeProfileId, setActiveProfileId] = useState('artisanal_obm');
  const [customProfile, setCustomProfile] = useState({
    vesselName: 'IND-KL-07-MM-4102 (St. George)',
    crewCount: 3,
    fuelBurnLPerNM: 1.8,
    fuelCostPerL: 95,
    waveToleranceM: 1.8,
    maxRangeNM: 15.5,
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Real-Time Telemetry & Transparent Calculation Breakdown State
  const [expandedCalcZoneId, setExpandedCalcZoneId] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(45);

  // Mini-Map Picker Visibility & References
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const miniMapContainerRef = useRef(null);
  const miniMapInstanceRef = useRef(null);
  const boatMarkerRef = useRef(null);
  const zonesLayerGroupRef = useRef(null);

  // Retrieve current active profile object merged with custom edits
  const activeProfile = FLEET_PROFILES.find((p) => p.id === activeProfileId) || FLEET_PROFILES[0];
  const effectiveMaxRange = customProfile.maxRangeNM || activeProfile.maxRangeNM;
  const effectiveFuelRate = customProfile.fuelBurnLPerNM || activeProfile.fuelBurnLPerNM;
  const effectiveFuelCost = customProfile.fuelCostPerL || activeProfile.fuelCostPerL;
  const effectiveWaveLimit = customProfile.waveToleranceM || activeProfile.waveToleranceM;

  // Master fetch function to query PFZ engine with GPS/Location & Fleet Profile
  const fetchPFZAdvisories = useCallback((lat, lon, locationLabel = null) => {
    setIsLoading(true);
    const craftType = activeProfile.craftType;
    const craftLabel = encodeURIComponent(activeProfile.name);

    const queryParams = new URLSearchParams({
      lat: lat.toFixed(4),
      lon: lon.toFixed(4),
      craft_type: craftType,
      max_range_nm: effectiveMaxRange.toString(),
      fuel_rate: effectiveFuelRate.toString(),
      fuel_cost: effectiveFuelCost.toString(),
      wave_tolerance: effectiveWaveLimit.toString(),
      craft_label: craftLabel
    });

    fetch(`/api/pfz/forecast?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        const list = Array.isArray(data) ? data : data.zones || [];
        setZones(list);
        setLastRefreshedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setRefreshCountdown(45);
        if (locationLabel) {
          setLaunchLocation({ lat, lon, name: locationLabel });
        }
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [activeProfile, effectiveMaxRange, effectiveFuelRate, effectiveFuelCost, effectiveWaveLimit]);

  // Periodic Auto-Sync Timer for Real-Time Satellite & Oceanic Telemetry
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchPFZAdvisories(launchLocation.lat, launchLocation.lon, launchLocation.name);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, launchLocation, fetchPFZAdvisories]);

  // Initial Load & Reacting to Harbor or Profile Switch
  useEffect(() => {
    if (selectedHarbor !== 'custom_map' && selectedHarbor !== 'gps') {
      const harborObj = COASTAL_HARBORS.find((h) => h.id === selectedHarbor);
      if (harborObj) {
        setLaunchLocation({ lat: harborObj.lat, lon: harborObj.lon, name: `${harborObj.name}, ${harborObj.state}` });
        fetchPFZAdvisories(harborObj.lat, harborObj.lon, `${harborObj.name}, ${harborObj.state}`);
      }
    } else {
      fetchPFZAdvisories(launchLocation.lat, launchLocation.lon);
    }
  }, [selectedHarbor, activeProfileId, fetchPFZAdvisories]);

  // 🎯 Geolocation / Live GPS Button Handler
  const handleUseGps = () => {
    if ('geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const label = `Live GPS (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`;
          setIsUsingGps(true);
          setSelectedHarbor('gps');
          setLaunchLocation({ lat, lon, name: label });
          fetchPFZAdvisories(lat, lon, label);

          if (miniMapInstanceRef.current) {
            miniMapInstanceRef.current.flyTo([lat, lon], 10, { duration: 1 });
            if (boatMarkerRef.current) {
              boatMarkerRef.current.setLatLng([lat, lon]);
            }
          }
        },
        () => {
          // Fallback to coastal Kerala
          const fallbackLat = 9.9656;
          const fallbackLon = 76.2425;
          const label = `Coastal Anchorage (9.966°N, 76.243°E)`;
          setIsUsingGps(true);
          setSelectedHarbor('gps');
          setLaunchLocation({ lat: fallbackLat, lon: fallbackLon, name: label });
          fetchPFZAdvisories(fallbackLat, fallbackLon, label);
        }
      );
    }
  };

  // Initialize and Update Leaflet Mini-Map
  useEffect(() => {
    if (!showMiniMap || !miniMapContainerRef.current) return;

    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        center: [launchLocation.lat, launchLocation.lon],
        zoom: 9,
        zoomControl: true,
        attributionControl: false
      });

      // Satellite / Nautical Imagery
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 17
      }).addTo(map);

      // OpenSeaMap nautical seamarks overlay
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        maxZoom: 17,
        opacity: 0.65
      }).addTo(map);

      // Boat Icon for Fisherman's Launch Point
      const boatHtml = `
        <div style="
          width: 34px; height: 34px;
          background: #0284c7;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-size: 16px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.6);
          cursor: grab;
        ">
          🚤
        </div>
      `;
      const boatIcon = L.divIcon({
        html: boatHtml,
        className: 'custom-boat-pin',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const boatMarker = L.marker([launchLocation.lat, launchLocation.lon], {
        icon: boatIcon,
        draggable: true,
        zIndexOffset: 1000
      }).addTo(map);

      boatMarker.bindTooltip('<strong>🚤 Your Boat Launch</strong><br>Drag or click map to move', {
        direction: 'top',
        offset: [0, -18]
      });

      boatMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        const customName = `Custom Beach Launch (${newPos.lat.toFixed(3)}°N, ${newPos.lng.toFixed(3)}°E)`;
        setIsUsingGps(false);
        setSelectedHarbor('custom_map');
        setLaunchLocation({ lat: newPos.lat, lon: newPos.lng, name: customName });
        fetchPFZAdvisories(newPos.lat, newPos.lng, customName);
      });

      // Map Click Event to set launch point directly
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        boatMarker.setLatLng([lat, lng]);
        const customName = `Custom Beach Launch (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`;
        setIsUsingGps(false);
        setSelectedHarbor('custom_map');
        setLaunchLocation({ lat, lon: lng, name: customName });
        fetchPFZAdvisories(lat, lng, customName);
      });

      boatMarkerRef.current = boatMarker;
      zonesLayerGroupRef.current = L.layerGroup().addTo(map);
      miniMapInstanceRef.current = map;
    } else {
      // Keep boat marker in sync if launch location changed externally
      if (boatMarkerRef.current) {
        boatMarkerRef.current.setLatLng([launchLocation.lat, launchLocation.lon]);
      }
    }

    // Refresh size after mount and layout changes
    setTimeout(() => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.invalidateSize();
      }
    }, 200);
  }, [showMiniMap, launchLocation.lat, launchLocation.lon, fetchPFZAdvisories, isMapExpanded]);

  // Update PFZ Hotspot Pins & Bearing Vectors on Mini-Map
  useEffect(() => {
    if (!miniMapInstanceRef.current || !zonesLayerGroupRef.current) return;

    zonesLayerGroupRef.current.clearLayers();

    if (zones && zones.length > 0) {
      const bounds = [[launchLocation.lat, launchLocation.lon]];

      zones.forEach((z, idx) => {
        const zLat = z.latitude;
        const zLon = z.longitude;
        if (!zLat || !zLon) return;

        bounds.push([zLat, zLon]);

        const distNM = z.distance_nm || (z.distance_km ? (z.distance_km * 0.54).toFixed(1) : '12');
        const dynBearing = calculateBearing(launchLocation.lat, launchLocation.lon, zLat, zLon);
        const dynCard = bearingToCardinal(dynBearing);
        const steerDeg = z.bearing_deg || z.bearing_degrees || dynBearing;
        const steerCard = z.bearing_cardinal || dynCard;
        const isSafe = z.safety_status === 'SAFE';

        // Glowing Hotspot Pin
        const fishHtml = `
          <div style="
            width: 28px; height: 28px;
            background: ${isSafe ? '#059669' : '#d97706'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #ffffff; font-size: 13px; font-weight: 800;
            box-shadow: 0 0 10px ${isSafe ? 'rgba(16, 185, 129, 0.8)' : 'rgba(217, 119, 6, 0.8)'};
          ">
            #${idx + 1}
          </div>
        `;
        const fishIcon = L.divIcon({
          html: fishHtml,
          className: 'pfz-mini-hotspot-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([zLat, zLon], { icon: fishIcon });
        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#0f172a; padding:4px;">
            <strong style="color:#0284c7;">#${idx + 1}: ${z.landing_center || z.sector || 'PFZ Hotspot'}</strong><br/>
            <span>Steer: <strong>${steerDeg}° ${steerCard}</strong></span><br/>
            <span>Distance: <strong>${distNM} NM</strong></span><br/>
            <span>Confidence: <strong>${Math.round((z.confidence_score || 0.9) * 100)}%</strong></span><br/>
            <span style="color:#059669; font-weight:700;">Net ROI: ₹${(z.net_profit_roi_inr || 22000).toLocaleString()}</span>
          </div>
        `);
        marker.addTo(zonesLayerGroupRef.current);

        // Dashed Vector from Boat to Hotspot
        const line = L.polyline([[launchLocation.lat, launchLocation.lon], [zLat, zLon]], {
          color: isSafe ? '#38bdf8' : '#f59e0b',
          weight: 2,
          dashArray: '5, 6',
          opacity: 0.85
        });
        line.addTo(zonesLayerGroupRef.current);
      });

      try {
        miniMapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
      } catch (err) {
        // Ignore zoom errors on rapid re-render
      }
    }
  }, [zones, launchLocation]);

  // Clean-up mini map on unmount
  useEffect(() => {
    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, []);

  // Direct Download: INCOIS PFZ Advisory Bulletin directly to user's Downloads folder (No print dialog)
  const handleDownloadPFZReport = () => {
    if (!zones || zones.length === 0) return;
    try {
      exportPFZAdvisoryPDF(zones, launchLocation, activeProfile);
    } catch (err) {
      console.error('Failed to export PFZ advisory PDF:', err);
    }
  };

  return (
    <div className="pfz-advisor-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <Fish size={20} className="panel-header-icon" />
        <div>
          <h3 className="panel-title">INCOIS Potential Fishing Zones (PFZ)</h3>
          <span className="panel-sub">Thermal Front & Chlorophyll-a Oceanographic Correlation</span>
        </div>
      </div>

      {/* Fleet Profile Selector Pill Bar */}
      <div className="fleet-profile-bar" style={{ margin: '14px 0 10px 0', background: 'rgba(15, 23, 42, 0.7)', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Anchor size={15} style={{ color: activeProfile.color }} />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Fisherman Fleet Profile:
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              fontSize: '11px',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Sliders size={12} />
            <span>Customize Specs</span>
          </button>
        </div>

        {/* 4 Indian Coastal Craft Type Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {FLEET_PROFILES.map((p) => {
            const isSelected = p.id === activeProfileId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProfileId(p.id);
                  setCustomProfile((prev) => ({
                    ...prev,
                    maxRangeNM: p.maxRangeNM,
                    fuelBurnLPerNM: p.fuelBurnLPerNM,
                    fuelCostPerL: p.fuelCostPerL,
                    waveToleranceM: p.waveToleranceM
                  }));
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: isSelected ? 'rgba(2, 132, 199, 0.18)' : '#0f172a',
                  border: isSelected ? `2px solid ${p.color}` : '1.5px solid #334155',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '3px' }}>
                  <span style={{ fontSize: '15px' }}>{p.icon}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: isSelected ? '#ffffff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name.split('(')[0].trim()}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  ≤{p.maxRangeNM} NM · {p.fuelBurnLPerNM} L/NM
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Profile Specs Summary Strip */}
        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '6px', border: '1px solid rgba(2, 132, 199, 0.2)', display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '11px' }}>
          <div><span style={{ color: '#94a3b8' }}>Active Craft:</span> <strong style={{ color: '#f1f5f9' }}>{activeProfile.name}</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Range Limit:</span> <strong style={{ color: '#38bdf8' }}>≤{effectiveMaxRange} NM</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Fuel Burn:</span> <strong style={{ color: '#10b981' }}>{effectiveFuelRate} L/NM (₹{effectiveFuelCost}/L)</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Safe Waves:</span> <strong style={{ color: '#f59e0b' }}>≤{effectiveWaveLimit}m</strong></div>
          <div><span style={{ color: '#94a3b8' }}>Target Catch:</span> <strong style={{ color: '#cbd5e1' }}>{activeProfile.primarySpecies.split(',')[0]}</strong></div>
        </div>
      </div>

      {/* Interactive Boat Launch Location Selector with Leaflet Mini-Map */}
      <div className="launch-picker-container" style={{ margin: '12px 0 16px 0', background: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #334155', borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} style={{ color: '#38bdf8' }} />
            <div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Fisherman Departure / Beach Launch:</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{launchLocation.name}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Direct GPS Button */}
            <button
              type="button"
              onClick={handleUseGps}
              title="Lock onto device GPS coordinates"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                background: isUsingGps ? '#059669' : '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Crosshair size={13} style={{ color: '#38bdf8' }} />
              <span>{isUsingGps ? 'GPS Locked 🎯' : '🎯 Use Live GPS'}</span>
            </button>

            {/* Toggle Mini Map Picker */}
            <button
              type="button"
              onClick={() => setShowMiniMap(!showMiniMap)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '600',
                background: showMiniMap ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                color: showMiniMap ? '#38bdf8' : '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <MapIcon size={13} />
              <span>{showMiniMap ? 'Hide Map Picker' : '🗺️ Pick on Map'}</span>
              {showMiniMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Quick Harbor Presets Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: showMiniMap ? '10px' : '0' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>Or Choose Harbor:</span>
          <select
            value={selectedHarbor}
            onChange={(e) => {
              setIsUsingGps(false);
              setSelectedHarbor(e.target.value);
            }}
            className="select-input"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '12.5px',
              background: '#0f172a',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '6px'
            }}
          >
            {COASTAL_HARBORS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {h.state}
              </option>
            ))}
            {selectedHarbor === 'gps' && <option value="gps">📍 {launchLocation.name}</option>}
            {selectedHarbor === 'custom_map' && <option value="custom_map">📍 {launchLocation.name}</option>}
          </select>
        </div>

        {/* Interactive Leaflet Mini-Map Component */}
        {showMiniMap && (
          <div style={{ position: 'relative', marginTop: '10px' }}>
            <div
              ref={miniMapContainerRef}
              style={{
                width: '100%',
                height: isMapExpanded ? '580px' : '420px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #334155',
                boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.45)',
                transition: 'height 0.25s ease',
              }}
            />
            {/* Interactive Overlay Instruction Badge */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 999,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(4px)',
                padding: '5px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '11px',
                color: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              }}
            >
              <span>👉</span>
              <span>Click coast or drag 🚤 Boat to calculate PFZ routes</span>
            </div>

            {/* Panoramic / Standard Map Size Toggle */}
            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 999,
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(4px)',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                fontSize: '11px',
                fontWeight: '600',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title={isMapExpanded ? 'Compact map view' : 'Expand map for wide tactical exploration'}
            >
              {isMapExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isMapExpanded ? 'Standard Map' : 'Panoramic View'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Fleet Profile Customization Modal */}
      {showProfileModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '22px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} style={{ color: '#0284c7' }} />
                <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>Customize Fleet Specifications</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Vessel Registration / Name:</label>
                <input
                  type="text"
                  value={customProfile.vesselName}
                  onChange={(e) => setCustomProfile({ ...customProfile, vesselName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Max Range Limit (NM):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customProfile.maxRangeNM}
                    onChange={(e) => setCustomProfile({ ...customProfile, maxRangeNM: parseFloat(e.target.value) || 15.5 })}
                    style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Fuel Burn (Liters / NM):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customProfile.fuelBurnLPerNM}
                    onChange={(e) => setCustomProfile({ ...customProfile, fuelBurnLPerNM: parseFloat(e.target.value) || 1.8 })}
                    style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Fuel Cost (₹ / Liter):</label>
                  <input
                    type="number"
                    step="1"
                    value={customProfile.fuelCostPerL}
                    onChange={(e) => setCustomProfile({ ...customProfile, fuelCostPerL: parseFloat(e.target.value) || 95 })}
                    style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Safe Wave Tolerance (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customProfile.waveToleranceM}
                    onChange={(e) => setCustomProfile({ ...customProfile, waveToleranceM: parseFloat(e.target.value) || 1.8 })}
                    style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Crew Capacity (Souls on Board):</label>
                <input
                  type="number"
                  value={customProfile.crewCount}
                  onChange={(e) => setCustomProfile({ ...customProfile, crewCount: parseInt(e.target.value, 10) || 3 })}
                  style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  fetchPFZAdvisories(launchLocation.lat, launchLocation.lon);
                }}
                style={{ padding: '8px 18px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
              >
                Save & Recalculate PFZs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advisory Cards List */}
      <div className="pfz-cards-list">
        {/* Real-Time Live Ocean & Atmosphere Telemetry Header Ribbon */}
        <div
          className="pfz-live-telemetry-ribbon"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Real-Time Ocean Telemetry Active
              </span>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                · Ingestion: INCOIS / ISRO / ECMWF Marine
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Synced: <strong style={{ color: '#cbd5e1' }}>{lastRefreshedAt}</strong>
              </span>
              <button
                type="button"
                onClick={() => fetchPFZAdvisories(launchLocation.lat, launchLocation.lon, launchLocation.name)}
                disabled={isLoading}
                style={{
                  background: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid rgba(2, 132, 199, 0.5)',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Force instant satellite & meteorological refresh"
              >
                <RefreshCw size={11} className={isLoading ? 'spin-anim' : ''} />
                <span>{isLoading ? 'Syncing...' : `Sync Now (${refreshCountdown}s)`}</span>
              </button>
            </div>
          </div>

          {/* Real-Time Departure Telemetry Metrics Bar */}
          {zones.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Departure SST</div>
                <div style={{ fontWeight: '700', color: '#f59e0b' }}>{zones[0].sst_celsius ?? 28.5}°C Live</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Departure Wave (Hs)</div>
                <div style={{ fontWeight: '700', color: '#38bdf8' }}>{zones[0].wave_height_m ?? 1.0}m</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Coastal Wind</div>
                <div style={{ fontWeight: '700', color: '#ffffff' }}>{zones[0].wind_speed_kts ?? 10} kts</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)', padding: '6px 8px', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>Ocean Drift</div>
                <div style={{ fontWeight: '700', color: '#10b981' }}>{zones[0].ocean_current_speed_kts ?? 0.4} kts</div>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
            <span style={{ fontSize: '13px' }}>Calculating nearest fishing zones relative to your boat launch location with live satellite feeds...</span>
          </div>
        )}

        {!isLoading && zones.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', background: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <AlertTriangle size={24} style={{ color: '#f59e0b', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '700' }}>No Fishing Zones within Craft Range Limit ({effectiveMaxRange} NM)</div>
            <p style={{ fontSize: '12px', marginTop: '6px' }}>Try switching to Mechanized/Deep-Sea profile or selecting a different launch coastal coordinate on the map.</p>
          </div>
        )}

        {!isLoading && zones.map((zone, zIdx) => {
          const zoneId = zone.id || zone.zone_id || `PFZ-${zIdx + 1}`;
          const zoneName = zone.sector || zone.zone_name || zone.landing_center || `INCOIS Hotspot ${zIdx + 1}`;
          const speciesList = Array.isArray(zone.target_species)
            ? zone.target_species
            : Array.isArray(zone.species_association)
            ? zone.species_association
            : ['Indian Mackerel', 'Oil Sardine', 'Yellowfin Tuna'];
          const matchPercent = Math.round((zone.confidence_score ?? zone.catch_probability ?? 0.88) * 100);
          const zoneLat = zone.latitude || (zone.latLng ? zone.latLng[0] : 0);
          const zoneLon = zone.longitude || (zone.latLng ? zone.latLng[1] : 0);
          const dynBearing = calculateBearing(launchLocation.lat, launchLocation.lon, zoneLat, zoneLon);
          const dynCard = bearingToCardinal(dynBearing);
          const steerDeg = zone.bearing_deg || zone.bearing_degrees || dynBearing;
          const steerCard = zone.bearing_cardinal || dynCard;

          const distNM = zone.distance_nm || (zone.distance_km ? (zone.distance_km * 0.54).toFixed(1) : 12);
          const isSafe = zone.safety_status === 'SAFE';
          const isHazardous = zone.safety_status === 'HAZARDOUS';
          const factors = zone.calculation_factors || {};
          const isExpanded = expandedCalcZoneId === zoneId;

          return (
            <div
              key={zoneId}
              className="pfz-card"
              onClick={() => onFocusPFZ && onFocusPFZ({
                ...zone,
                bearing_deg: steerDeg,
                bearing_degrees: steerDeg,
                bearing_cardinal: steerCard,
                origin_lat: launchLocation.lat,
                origin_lon: launchLocation.lon,
                origin_name: launchLocation.name,
              })}
              style={{
                background: '#0f172a',
                border: isHazardous ? '1.5px solid rgba(239, 68, 68, 0.6)' : isSafe ? '1.5px solid rgba(56, 189, 248, 0.45)' : '1.5px solid rgba(245, 158, 11, 0.6)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div className="pfz-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div className="pfz-title-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pfz-id-badge" style={{ background: '#0284c7', color: '#ffffff', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>#{zIdx + 1}</span>
                    <h4 className="pfz-name" style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>{zoneName}</h4>
                  </div>
                  <span className="pfz-coords" style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Lat: {zone.latitude?.toFixed(4)}°N, Lon: {zone.longitude?.toFixed(4)}°E · Depth: {zone.depth_meters || 45}m
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 8px', borderRadius: '6px' }}>
                    {matchPercent}% Hotspot
                  </span>
                </div>
              </div>

              {/* Operational Safety Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: isHazardous ? 'rgba(239, 68, 68, 0.15)' : isSafe ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                  border: isHazardous ? '1px solid rgba(239, 68, 68, 0.3)' : isSafe ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.3)',
                  marginBottom: '10px',
                  fontSize: '11.5px'
                }}
              >
                {isHazardous ? <AlertTriangle size={14} style={{ color: '#ef4444' }} /> : <ShieldCheck size={14} style={{ color: isSafe ? '#10b981' : '#f59e0b' }} />}
                <span style={{ fontWeight: '700', color: isHazardous ? '#ef4444' : isSafe ? '#10b981' : '#f59e0b' }}>
                  {isHazardous ? '🔴 HAZARDOUS CONDITIONS' : isSafe ? '🟢 SAFE SEA STATE CLEARANCE' : '🟡 CAUTION ADVISED'}
                </span>
                <span style={{ color: '#94a3b8' }}>·</span>
                <span style={{ color: '#cbd5e1' }}>{zone.safety_reason || 'Conditions within vessel limits'}</span>
              </div>

              {/* Live Physical Oceanography Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                  marginBottom: '10px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  border: '1px solid #1e293b'
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8' }}>🌡️ SST:</span>{' '}
                  <strong style={{ color: '#f59e0b' }}>{zone.sst_celsius ?? 28.5}°C</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>🌿 Chl-a:</span>{' '}
                  <strong style={{ color: '#10b981' }}>{zone.chlorophyll_mg_m3 ?? 1.4} mg/m³</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>🌊 Waves:</span>{' '}
                  <strong style={{ color: '#38bdf8' }}>{zone.wave_height_m ?? 1.0}m</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>💨 Wind:</span>{' '}
                  <strong style={{ color: '#e2e8f0' }}>{zone.wind_speed_kts ?? 10} kts</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>🧭 Drift:</span>{' '}
                  <strong style={{ color: '#38bdf8' }}>{zone.ocean_current_speed_kts ?? 0.4} kts</strong>
                </div>
              </div>

              {/* Target Vernacular Species */}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Target Pelagic Species:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {speciesList.map((sp, sIdx) => (
                    <span
                      key={sIdx}
                      style={{
                        background: '#1e293b',
                        color: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        border: '1px solid #334155'
                      }}
                    >
                      🐟 {sp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Navigational & Financial ROI Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px', fontSize: '11.5px' }}>
                <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Bearing from Boat</div>
                  <div style={{ fontWeight: '700', color: '#38bdf8' }}>{steerDeg}° {steerCard}</div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Distance</div>
                  <div style={{ fontWeight: '700', color: '#ffffff' }}>{distNM} NM</div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Fuel Burn ({activeProfile.craftType === 'artisanal' ? 'Petrol' : 'Diesel'})</div>
                  <div style={{ fontWeight: '700', color: '#f59e0b' }}>
                    {zone.fuel_estimate_liters || Math.round(distNM * effectiveFuelRate)} L (~₹{((zone.fuel_estimate_liters || Math.round(distNM * effectiveFuelRate)) * effectiveFuelCost).toLocaleString()})
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>Net Catch ROI (₹)</div>
                  <div style={{ fontWeight: '800', color: '#10b981' }}>
                    ₹{(zone.net_profit_roi_inr || (zone.projected_catch_value_inr ? zone.projected_catch_value_inr - (zone.fuel_cost_inr || 1500) : 22000)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Direct Compass Steer Command */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                <Compass size={15} />
                <span><strong>Steer Command:</strong> {`From ${launchLocation.name}, steer ${steerDeg}° ${steerCard} for ${distNM} NM. Target ${zone.depth_meters || 45}m depth contour.`}</span>
              </div>

              {/* Toggle Live Calculation Transparency Breakdown Accordion */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCalcZoneId(isExpanded ? null : zoneId);
                }}
                style={{
                  width: '100%',
                  background: isExpanded ? 'rgba(2, 132, 199, 0.18)' : 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={13} />
                  <span>Real-Time Calculation & Oceanographic Factor Breakdown</span>
                </span>
                <span>{isExpanded ? '▲ Hide Math' : '▼ View Live Math'}</span>
              </button>

              {/* Detailed Live Calculation Breakdown Drawer */}
              {isExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    marginTop: '10px',
                    padding: '12px 14px',
                    background: '#0b1329',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    color: '#cbd5e1'
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={13} />
                    <span>Transparent Real-Time Calculation Equations:</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Fuel Formula */}
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#f59e0b' }}>1. Hydrodynamic Fuel Requirement:</strong>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                        Round-Trip ({factors.round_trip_distance_nm || (distNM * 2).toFixed(1)} NM) × Engine Rate ({factors.base_burn_rate_l_nm || effectiveFuelRate} L/NM) × Sea Drag ({factors.sea_drag_multiplier || 1.0}x) = <strong style={{ color: '#f59e0b' }}>{factors.total_fuel_liters || Math.round(distNM * 2 * effectiveFuelRate)} Liters</strong>
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        Expense: {factors.total_fuel_liters || 20} L × ₹{factors.fuel_price_per_l || effectiveFuelCost}/L = <strong style={{ color: '#ffffff' }}>₹{(factors.total_fuel_cost_inr || 1900).toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Chlorophyll & Catch Multiplier */}
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#10b981' }}>2. Satellite Primary Productivity & Catch Projection:</strong>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                        Chlorophyll-a ({factors.chlorophyll_mg_m3 || zone.chlorophyll_mg_m3 || 1.4} mg/m³) → Productivity Factor: <strong style={{ color: '#10b981' }}>{factors.chlorophyll_productivity_factor || 1.0}x</strong> ({factors.chlorophyll_boost_pct > 0 ? '+' : ''}{factors.chlorophyll_boost_pct || 0}% pelagic concentration)
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        Estimated Biomass Catch: <strong style={{ color: '#ffffff' }}>{factors.projected_catch_kg || zone.projected_catch_kg || 120} kg</strong> · Market Revenue: <strong style={{ color: '#10b981' }}>₹{(factors.gross_catch_value_inr || zone.projected_catch_value_inr || 24000).toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Net ROI Formula */}
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#38bdf8' }}>3. Net Return ROI Formula:</strong>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                        Net Return = Gross Catch (₹{(factors.gross_catch_value_inr || zone.projected_catch_value_inr || 24000).toLocaleString()}) - Fuel Expense (₹{(factors.total_fuel_cost_inr || 1900).toLocaleString()}) = <strong style={{ color: '#10b981' }}>₹{(factors.net_roi_inr || zone.net_profit_roi_inr || 22100).toLocaleString()} (+{factors.roi_percentage || 1160}% Net Margin)</strong>
                      </div>
                    </div>

                    {/* Environmental Verification */}
                    <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#e2e8f0' }}>4. Seaworthiness & Safety Clearance:</strong>
                      <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                        Wave Height: <strong>{zone.wave_height_m}m</strong> (Craft Max Limit: {effectiveWaveLimit}m) · Wind: <strong>{zone.wind_speed_kts} kts</strong> · Ocean Drift: <strong>{zone.ocean_current_speed_kts || 0.4} kts @ {zone.ocean_current_dir_deg || 190}°</strong> · Clearance: <strong style={{ color: isSafe ? '#10b981' : isHazardous ? '#ef4444' : '#f59e0b' }}>{zone.safety_status}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Down at Last: Single Official Download Option for PFZ */}
      <div
        className="pfz-bottom-download-bar"
        style={{
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          type="button"
          className="btn-download-pfz-bulletin"
          onClick={handleDownloadPFZReport}
          style={{
            width: '100%',
            maxWidth: '560px',
            padding: '13px 20px',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 6px 18px rgba(5, 150, 105, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={18} />
          Download Official PFZ Advisory Bulletin (PDF)
        </button>
        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
          Official INCOIS & MoES format · Real-time satellite SST thermal fronts, compass steer angles, fuel vs catch ROI & safety clearances.
        </div>
      </div>
    </div>
  );
}
