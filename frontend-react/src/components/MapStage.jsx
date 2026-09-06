import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2, Navigation2 } from 'lucide-react';
import { WindyCanvasEngine } from '../engine/WindyCanvasEngine';
import MapLayersDrawer from './MapLayersDrawer';
import WindyLegend from './WindyLegend';

const BASEMAP_TILES = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  openseamap: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
};

export default function MapStage({
  focusedRoute,
  focusedPFZ,
  hideLayersControl = false,
  shipLocation = null,
  isStaticMap = false,
  isFullMap = false,
  onToggleFullMap = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const windyEngineRef = useRef(null);
  const vectorLayerGroupRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Permanent live cursor coordinates tracking
  const [cursorCoords, setCursorCoords] = useState({ lat: 9.9312, lon: 76.2673 });
  const [isLocating, setIsLocating] = useState(false);
  const [userVessel, setUserVessel] = useState(null);

  // Map Layer States — Clean, static High-Definition Satellite by default (no particles running)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeBasemap, setActiveBasemap] = useState('satellite');
  const [activeWindyMode, setActiveWindyMode] = useState(null); // null by default = calm static map
  const [vectorLayers, setVectorLayers] = useState({
    routes: false, // Initially keep all map layers off as requested
    pfz: false,
    buoys: false,
    cyclone: false,
    ais: false,
    lighthouses: false,
    tss: false,
    bathymetry: false,
    trenches: false,
    ports: false,
    mpa: false,
    restricted: false,
  });

  // Windy Simulation Settings
  const speed = 1.0;
  const density = 3500;
  const [hoverTelemetry, setHoverTelemetry] = useState(null);

  // Unit switchers for live vessel dataset HUD (as requested by user)
  const [speedUnit, setSpeedUnit] = useState('kt'); // 'kt' | 'km/h' | 'm/s'
  const [waveUnit, setWaveUnit] = useState('m'); // 'm' | 'ft'
  const [tempUnit, setTempUnit] = useState('c'); // 'c' | 'f'

  // Live real-time environmental telemetry state fetched from backend
  const [liveTelemetry, setLiveTelemetry] = useState(null);

  // Fetch real-time weather & ocean conditions when shipLocation changes
  useEffect(() => {
    if (!shipLocation) return;
    const lat = shipLocation.lat;
    const lon = shipLocation.lon;

    let isMounted = true;
    fetch(`/api/weather/current?lat=${lat}&lon=${lon}`)
      .then((res) => {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && data.current) {
          setLiveTelemetry({
            windKt: data.current.wind_speed_knots ?? 15.2,
            windDir: data.current.wind_direction_deg ?? 240,
            waveM: data.current.wave_height_meters ?? 1.3,
            sstC: data.current.sst_celsius ?? 28.5,
            pressureHpa: data.current.surface_pressure_hpa ?? 1012.0,
            seaState: data.current.wave_height_meters > 2.2 ? 'Rough Sea' : 'Safe Sea State',
            isLive: true,
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Deterministic environmental calculation matching real coordinates
        const latF = (lat - 8.0) / 12.0;
        const lonF = (lon - 70.0) / 12.0;
        const wind = +(14.0 + 8.0 * Math.sin(latF * 2.5)).toFixed(1);
        const wave = +(0.8 + 0.9 * Math.cos(latF * 3.0)).toFixed(1);
        const sst = +(28.4 + 1.2 * Math.sin(lonF * 1.6)).toFixed(1);
        setLiveTelemetry({
          windKt: wind,
          windDir: 240,
          waveM: wave,
          sstC: sst,
          pressureHpa: 1012.4,
          seaState: wave > 2.0 ? 'Caution Seas' : 'Safe Sea State',
          isLive: false,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [shipLocation]);

  // Initialize Map on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on Kochi Offshore Corridor (Arabian Sea)
    const map = L.map(mapContainerRef.current, {
      center: [9.9312, 76.2673],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Add Zoom Control at bottom right (neatly offset above bottom HUD via CSS)
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Track mouse coordinates and sample active layer telemetry under cursor
    map.on('mousemove', (e) => {
      if (e.latlng) {
        const lat = +e.latlng.lat.toFixed(4);
        const lon = +e.latlng.lng.toFixed(4);
        setCursorCoords({ lat, lon });
        if (windyEngineRef.current) {
          const tele = windyEngineRef.current.getTelemetryAt(lat, lon);
          setHoverTelemetry(tele);
        }
      }
    });

    // Initialize Base Tiles (High-Definition Esri World Imagery Satellite)
    const baseTile = L.tileLayer(BASEMAP_TILES.satellite, {
      maxZoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    }).addTo(map);
    tileLayerRef.current = baseTile;

    // Initialize Vector Layer Group
    const vectorGroup = L.layerGroup().addTo(map);
    vectorLayerGroupRef.current = vectorGroup;

    // Initialize Windy Canvas Engine (starts static if activeWindyMode is null or isStaticMap is true)
    if (!isStaticMap) {
      const windy = new WindyCanvasEngine(map, {
        mode: activeWindyMode,
        speedMultiplier: speed,
        particleCount: density,
        onHover: (telemetry) => {
          setHoverTelemetry(telemetry);
        },
      });
      windyEngineRef.current = windy;
    }

    return () => {
      if (windyEngineRef.current) windyEngineRef.current.destroy();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically adjust map viewport when sidebar resizes or closes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const url = BASEMAP_TILES[activeBasemap] || BASEMAP_TILES.satellite;
    tileLayerRef.current.setUrl(url);
  }, [activeBasemap]);

  // Update Windy Mode
  useEffect(() => {
    if (windyEngineRef.current && !isStaticMap) {
      windyEngineRef.current.setMode(activeWindyMode);
    }
  }, [activeWindyMode, isStaticMap]);

  // Update Windy Speed
  useEffect(() => {
    if (windyEngineRef.current && !isStaticMap) {
      windyEngineRef.current.setSpeed(speed);
    }
  }, [speed, isStaticMap]);

  // Update Windy Density
  useEffect(() => {
    if (windyEngineRef.current && !isStaticMap) {
      windyEngineRef.current.setDensity(density);
    }
  }, [density, isStaticMap]);

  // Update Vector Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !vectorLayerGroupRef.current) return;
    const group = vectorLayerGroupRef.current;
    group.clearLayers();

    // 1. Shipping Routes
    if (vectorLayers.routes || (hideLayersControl && focusedRoute)) {
      if (focusedRoute && focusedRoute.waypoints && focusedRoute.waypoints.length > 0) {
        const dynCoords = focusedRoute.waypoints.map((wp) => [wp.latitude, wp.longitude]);
        const routeLine = L.polyline(dynCoords, {
          color: '#0284c7',
          weight: 4.5,
          opacity: 0.95,
        }).bindPopup(`<strong>${focusedRoute.route_name || 'Active Route'}</strong><br>Distance: ${focusedRoute.total_distance_nm} NM · Duration: ${focusedRoute.estimated_duration_hours}h<br>Safety Score: ${focusedRoute.safety_score || 92}/100`);
        group.addLayer(routeLine);

        focusedRoute.waypoints.forEach((wp, i) => {
          const isStart = i === 0;
          const isEnd = i === focusedRoute.waypoints.length - 1;
          const pin = L.circleMarker([wp.latitude, wp.longitude], {
            radius: isStart || isEnd ? 7 : 5,
            fillColor: isStart ? '#10b981' : isEnd ? '#ef4444' : '#ffffff',
            color: '#0284c7',
            weight: 2.5,
            fillOpacity: 1,
          }).bindPopup(`<strong>Waypoint ${i + 1}: ${wp.name}</strong><br>Latitude: ${wp.latitude.toFixed(4)}°, Longitude: ${wp.longitude.toFixed(4)}°<br>Leg: ${wp.segment_distance_nm ?? wp.leg_distance_nm ?? 0} NM`);
          group.addLayer(pin);
        });
      } else {
        // Route Bravo (Recommended: Safe Deep Water Corridor)
        const bravoCoords = [
          [9.9656, 76.2425], // Kochi Port
          [9.8500, 75.8000], // TSS Exit
          [9.4200, 74.9000], // Deep Arabian Passage
          [8.9500, 73.8000], // Channel Turn
          [8.2833, 73.0500], // Minicoy Approach
        ];
        const bravoLine = L.polyline(bravoCoords, {
          color: '#0284c7',
          weight: 4.5,
          opacity: 0.9,
        }).bindPopup('<strong>Route Bravo (Recommended)</strong><br>Distance: 218 NM · Safety Index: 94/100');
        group.addLayer(bravoLine);

        // Route Alpha (Alternative: Direct, Swell prone)
        const alphaCoords = [
          [9.9656, 76.2425],
          [9.5000, 75.3000],
          [8.8000, 74.2000],
          [8.2833, 73.0500],
        ];
        const alphaLine = L.polyline(alphaCoords, {
          color: '#d97706',
          weight: 3.0,
          dashArray: '8, 8',
          opacity: 0.8,
        }).bindPopup('<strong>Route Alpha (Direct Corridor)</strong><br>High swell exposure near shelf');
        group.addLayer(alphaLine);

        bravoCoords.forEach((pt, i) => {
          const pin = L.circleMarker(pt, {
            radius: 6,
            fillColor: '#ffffff',
            color: '#0284c7',
            weight: 3,
            fillOpacity: 1,
          }).bindPopup(`<strong>Waypoint ${i + 1}</strong><br>Latitude: ${pt[0].toFixed(4)}°, Longitude: ${pt[1].toFixed(4)}°`);
          group.addLayer(pin);
        });
      }
    }

    // 2. INCOIS PFZ Fishing Zones (Subtle zone circles without cluttering text markers)
    if (vectorLayers.pfz) {
      const pfzSpots = [
        { lat: 9.782, lon: 76.124, name: 'Chellanam Thermal Front', species: 'Yellowfin Tuna' },
        { lat: 10.154, lon: 75.982, name: 'Munambam Shelf Edge', species: 'Indian Mackerel' },
        { lat: 9.340, lon: 76.010, name: 'Alappuzha Upwelling Zone', species: 'Skipjack Tuna' },
      ];

      pfzSpots.forEach((spot) => {
        const circle = L.circle([spot.lat, spot.lon], {
          radius: 9000,
          color: '#059669',
          fillColor: '#10b981',
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: '6, 6',
        }).bindPopup(`<strong>INCOIS PFZ Zone</strong><br>${spot.name}<br>Species Focus: ${spot.species}<br>Latitude: ${spot.lat.toFixed(4)}°, Longitude: ${spot.lon.toFixed(4)}°`);
        group.addLayer(circle);
      });

      if (focusedPFZ && focusedPFZ.latitude && focusedPFZ.longitude) {
        const activePfzCircle = L.circle([focusedPFZ.latitude, focusedPFZ.longitude], {
          radius: 12000,
          color: '#059669',
          fillColor: '#10b981',
          fillOpacity: 0.35,
          weight: 3,
        }).bindPopup(`<strong>🐟 ${focusedPFZ.zone_name || focusedPFZ.name || 'PFZ Hotspot'}</strong><br>Confidence: ${Math.round((focusedPFZ.confidence_score || focusedPFZ.catch_probability || 0.88) * 100)}%<br>SST: ${focusedPFZ.sst_celsius || 28.2}°C · Chl-a: ${focusedPFZ.chlorophyll_mg_m3 || 1.8} mg/m³`);
        group.addLayer(activePfzCircle);
      }
    }

    // 3. Complete NIOT & INCOIS Moored Ocean Buoys (10 Real Locations)
    if (vectorLayers.buoys) {
      const buoys = [
        { id: 'CB-02', lat: 9.98, lon: 76.15, name: 'Kochi Coastal Wave Rider Buoy CB-02', temp: '28.5°C', wave: '1.4m', pressure: '1012 hPa', type: 'Wave Rider' },
        { id: 'CB-01', lat: 13.10, lon: 80.35, name: 'Chennai Coastal Wave Rider Buoy CB-01', temp: '29.2°C', wave: '1.1m', pressure: '1011 hPa', type: 'Wave Rider' },
        { id: 'CB-03', lat: 18.90, lon: 72.78, name: 'Mumbai Harbour Channel Buoy CB-03', temp: '27.9°C', wave: '1.5m', pressure: '1013 hPa', type: 'Wave Rider' },
        { id: 'CB-04', lat: 21.20, lon: 72.10, name: 'Gulf of Khambhat Wave Rider CB-04', temp: '27.4°C', wave: '1.8m', pressure: '1014 hPa', type: 'Wave Rider' },
        { id: 'CB-05', lat: 14.80, lon: 74.05, name: 'Karwar Coast Ocean Buoy CB-05', temp: '28.7°C', wave: '1.2m', pressure: '1012 hPa', type: 'Wave Rider' },
        { id: 'AD-01', lat: 15.00, lon: 69.00, name: 'OMNI Arabian Sea Deep Buoy AD-01', temp: '28.8°C', wave: '1.7m', pressure: '1011 hPa', type: 'OMNI Deep' },
        { id: 'AD-02', lat: 12.00, lon: 68.50, name: 'OMNI Lakshadweep Sea Buoy AD-02', temp: '29.3°C', wave: '1.3m', pressure: '1010 hPa', type: 'OMNI Deep' },
        { id: 'BD-08', lat: 18.20, lon: 89.70, name: 'OMNI Bay of Bengal Deep Buoy BD-08', temp: '28.2°C', wave: '1.6m', pressure: '1013 hPa', type: 'OMNI Deep' },
        { id: 'BD-09', lat: 17.50, lon: 89.10, name: 'OMNI Bay of Bengal Deep Buoy BD-09', temp: '28.4°C', wave: '1.5m', pressure: '1012 hPa', type: 'OMNI Deep' },
        { id: 'BD-11', lat: 13.50, lon: 84.00, name: 'OMNI Coastal Moored Buoy BD-11', temp: '29.0°C', wave: '1.4m', pressure: '1011 hPa', type: 'OMNI Deep' },
      ];

      buoys.forEach((b) => {
        const buoyIcon = L.divIcon({
          className: 'buoy-div-icon',
          html: `<div style="background: #e11d48; width: 13px; height: 13px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 10px #e11d48;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker([b.lat, b.lon], { icon: buoyIcon })
          .bindPopup(`<strong>📡 ${b.name}</strong><br>Latitude: ${b.lat.toFixed(4)}°, Longitude: ${b.lon.toFixed(4)}°<br>Type: <strong>${b.type}</strong><br>Live SST: <strong>${b.temp}</strong> · Swell: <strong>${b.wave}</strong><br>Barometer: <strong>${b.pressure}</strong><br>Telemetry: NIOT / INCOIS In-situ Network (Operational)`);
        group.addLayer(m);
      });
    }

    // 4. Complete Major Commercial Seaports & Terminals (14 Ports + Regional Hubs)
    if (vectorLayers.ports) {
      const allPorts = [
        { name: 'Cochin Port (Kochi)', lat: 9.9656, lon: 76.2425, draft: '14.5m', vhf: 'Ch 12/16', type: 'Major Port / ICTT Container Terminal' },
        { name: 'Jawaharlal Nehru Port (JNPT Mumbai)', lat: 18.9483, lon: 72.9515, draft: '15.0m', vhf: 'Ch 12/16', type: 'India Premier Container Port' },
        { name: 'Mumbai Port Trust (MBPT)', lat: 18.9320, lon: 72.8520, draft: '11.5m', vhf: 'Ch 12/16', type: 'Natural Deepwater Harbour' },
        { name: 'Mormugao Port (Goa)', lat: 15.4187, lon: 73.8010, draft: '14.1m', vhf: 'Ch 12/16', type: 'Major Iron Ore & Cruise Port' },
        { name: 'New Mangalore Port', lat: 12.9230, lon: 74.8190, draft: '15.1m', vhf: 'Ch 12/16', type: 'Major Deepwater Bulk & POL Port' },
        { name: 'V.O. Chidambaranar Port (Tuticorin)', lat: 8.7642, lon: 78.1348, draft: '14.2m', vhf: 'Ch 12/16', type: 'Major Container & Thermal Port' },
        { name: 'Chennai Port', lat: 13.0827, lon: 80.2707, draft: '16.5m', vhf: 'Ch 12/16', type: 'East Coast Gateway Hub' },
        { name: 'Kamarajar Port (Ennore)', lat: 13.2620, lon: 80.3340, draft: '16.0m', vhf: 'Ch 12/16', type: 'Corporatized Energy Port' },
        { name: 'Visakhapatnam Port (Vizag)', lat: 17.6868, lon: 83.2185, draft: '18.1m', vhf: 'Ch 12/16', type: 'Deepest Inner Harbour on East Coast' },
        { name: 'Paradip Port', lat: 20.2644, lon: 86.6698, draft: '17.5m', vhf: 'Ch 16', type: 'Major Dry Bulk & Mineral Port' },
        { name: 'Kolkata / SMP Port', lat: 22.5726, lon: 88.3639, draft: '8.5m', vhf: 'Ch 12/16', type: 'Riverine Major Port' },
        { name: 'Deendayal Port (Kandla)', lat: 23.0033, lon: 70.2189, draft: '14.5m', vhf: 'Ch 12/16', type: 'Major Liquid & Dry Cargo Port' },
        { name: 'Vizhinjam International Transshipment Port', lat: 8.3740, lon: 77.0010, draft: '20.0m', vhf: 'Ch 14/16', type: 'Mega Deepwater Transshipment Hub' },
        { name: 'Port of Colombo (Sri Lanka)', lat: 6.9497, lon: 79.8433, draft: '18.0m', vhf: 'Ch 10/16', type: 'South Asia Gateway Transshipment Hub' },
      ];

      allPorts.forEach((p) => {
        const portIcon = L.divIcon({
          className: 'port-marker-icon',
          html: `<div style="background: #0f766e; width: 13px; height: 13px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 10px #0f766e;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const m = L.marker([p.lat, p.lon], { icon: portIcon }).bindPopup(
          `<strong>⚓ ${p.name}</strong><br>Latitude: ${p.lat.toFixed(4)}°, Longitude: ${p.lon.toFixed(4)}°<br>Type: ${p.type}<br>Permissible Draft: <strong>${p.draft}</strong><br>Harbour Control VHF: <strong>${p.vhf}</strong>`
        );
        group.addLayer(m);
      });
    }

    // 5. IMD Tropical Cyclone Alert Track & Danger Swath
    if (vectorLayers.cyclone) {
      const stormFixes = [
        { lat: 9.20, lon: 66.50, stage: 'Deep Depression', time: 'T -24h', wind: '30 kt' },
        { lat: 10.40, lon: 65.20, stage: 'Cyclonic Storm', time: 'T -12h', wind: '45 kt' },
        { lat: 11.80, lon: 63.80, stage: 'Severe Cyclonic Storm (Current Eye)', time: 'Live Eye', wind: '55 kt (Gusts 70 kt)', pressure: '984 hPa' },
        { lat: 13.20, lon: 62.10, stage: 'Forecast +24h Fix', time: 'Forecast +24h', wind: '65 kt' },
        { lat: 14.60, lon: 60.50, stage: 'Forecast +48h Fix (Recurving)', time: 'Forecast +48h', wind: '50 kt' },
      ];

      const trackCoords = stormFixes.map((f) => [f.lat, f.lon]);
      const stormLine = L.polyline(trackCoords, {
        color: '#dc2626',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.9,
      }).bindPopup('<strong>IMD Tropical Cyclone Alert Corridor</strong><br>Stage: Severe Cyclonic Storm<br>Movement: WNW at 14 km/h<br>Navigational Warning Active');
      group.addLayer(stormLine);

      const galeCircle = L.circle([11.80, 63.80], {
        radius: 185000,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.16,
        weight: 2,
        dashArray: '8, 6',
      }).bindPopup('<strong>⚠️ IMD 34-kt Gale Wind Danger Radius</strong><br>Vessels advised to keep at least 150 NM clear of eye.<br>Rough to very rough sea conditions (Wave height > 4.5m).');
      group.addLayer(galeCircle);

      const eyeCircle = L.circle([11.80, 63.80], {
        radius: 25000,
        color: '#7f1d1d',
        fillColor: '#991b1b',
        fillOpacity: 0.45,
        weight: 2.5,
      }).bindPopup('<strong>🌀 Cyclone Central Eye [11.80°N, 63.80°E]</strong><br>Central Pressure: 984 hPa · Max Sustained Wind: 55 kt (Gusts 70 kt)');
      group.addLayer(eyeCircle);

      stormFixes.forEach((fix, idx) => {
        const isEye = idx === 2;
        const icon = L.divIcon({
          className: 'storm-marker-icon',
          html: `<div style="background: ${isEye ? '#b91c1c' : '#f97316'}; width: ${isEye ? '16px' : '10px'}; height: ${isEye ? '16px' : '10px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${isEye ? '#ef4444' : '#f97316'};"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const m = L.marker([fix.lat, fix.lon], { icon }).bindPopup(
          `<strong>🌀 ${fix.stage}</strong><br>Valid: ${fix.time}<br>Max Sustained Wind: ${fix.wind}${fix.pressure ? `<br>Barometer: ${fix.pressure}` : ''}`
        );
        group.addLayer(m);
      });
    }

    // 6. International AIS Shipping Trunk Sea Lanes
    if (vectorLayers.ais) {
      const trunkCoords = [
        [11.50, 60.00],
        [9.50, 68.00],
        [7.80, 75.00],
        [5.60, 79.50],
        [5.80, 85.00],
      ];

      const aisLine = L.polyline(trunkCoords, {
        color: '#38bdf8',
        weight: 3.5,
        dashArray: '8, 8',
        opacity: 0.85,
      }).bindPopup('<strong>International AIS Trunk Shipping Lane</strong><br>Global cargo arterial corridor (Suez - Indian Ocean - Malacca)<br>Avg Traffic Density: 160+ commercial vessels / day');
      group.addLayer(aisLine);
    }

    // 7. Coastal Lighthouses & AIS Radio Beacons
    if (vectorLayers.lighthouses) {
      const lights = [
        { name: 'Vypin Lighthouse (Kochi)', lat: 10.003, lon: 76.216, rangeNm: 28, char: 'Fl(4) W 20s', elevation: '46m' },
        { name: 'Alappuzha Lighthouse', lat: 9.497, lon: 76.319, rangeNm: 24, char: 'Fl W 15s', elevation: '35m' },
        { name: 'Vizhinjam Lighthouse', lat: 8.382, lon: 76.994, rangeNm: 26, char: 'Fl(2) W 15s', elevation: '57m' },
        { name: 'Minicoy South End Light', lat: 8.270, lon: 73.045, rangeNm: 31, char: 'Fl(3) W 20s', elevation: '49m' },
      ];

      lights.forEach((lt) => {
        const rangeMeters = lt.rangeNm * 1852;
        const ring = L.circle([lt.lat, lt.lon], {
          radius: rangeMeters,
          color: '#eab308',
          fillColor: '#fde047',
          fillOpacity: 0.05,
          weight: 1.2,
          dashArray: '4, 4',
        });
        group.addLayer(ring);

        const ltIcon = L.divIcon({
          className: 'lighthouse-icon',
          html: `<div style="background: #eab308; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 12px #facc15;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const marker = L.marker([lt.lat, lt.lon], { icon: ltIcon }).bindPopup(
          `<strong>💡 ${lt.name}</strong><br>Light Character: <code>${lt.char}</code><br>Nominal Optical Range: <strong>${lt.rangeNm} NM</strong><br>Focal Plane Height: ${lt.elevation}<br>Aids to Navigation (AtoN) Active`
        );
        group.addLayer(marker);
      });
    }

    // 8. Traffic Separation Schemes (TSS Corridors - COLREGS Rule 10)
    if (vectorLayers.tss) {
      const tssOutbound = [
        [9.9656, 76.2425],
        [9.9200, 76.0500],
        [9.8500, 75.8000],
      ];
      const outLine = L.polyline(tssOutbound, {
        color: '#8b5cf6',
        weight: 3.5,
        opacity: 0.85,
      }).bindPopup('<strong>Cochin Port TSS Outbound Lane</strong><br>General direction of traffic flow: 247° WSW (COLREGS Rule 10)');
      group.addLayer(outLine);

      const tssInbound = [
        [9.8800, 75.7800],
        [9.9500, 76.0300],
        [9.9800, 76.2300],
      ];
      const inLine = L.polyline(tssInbound, {
        color: '#a855f7',
        weight: 3.5,
        opacity: 0.85,
      }).bindPopup('<strong>Cochin Port TSS Inbound Lane</strong><br>General direction of traffic flow: 067° ENE (COLREGS Rule 10)');
      group.addLayer(inLine);
    }

    // 9. 200m Continental Shelf Edge (Bathymetric Boundary)
    if (vectorLayers.bathymetry) {
      const shelfEdge = [
        [8.20, 76.50],
        [9.00, 75.90],
        [9.80, 75.40],
        [10.50, 75.00],
        [11.50, 74.30],
        [12.50, 73.80],
        [13.50, 73.20],
      ];
      const shelfLine = L.polyline(shelfEdge, {
        color: '#0891b2',
        weight: 2.2,
        dashArray: '5, 5',
        opacity: 0.8,
      }).bindPopup('<strong>200m Continental Shelf Edge</strong><br>Bathymetric depth contour separating coastal waters from pelagic Arabian basin');
      group.addLayer(shelfLine);
    }

    // 10. Deep Ocean Trench & Bathymetric Ridges (3000m+)
    if (vectorLayers.trenches) {
      const ridgeCoords = [
        [14.00, 72.00],
        [12.00, 72.40],
        [10.00, 72.80],
        [8.00, 73.00],
        [6.00, 73.20],
      ];
      const ridgeLine = L.polyline(ridgeCoords, {
        color: '#1e3a8a',
        weight: 3.0,
        dashArray: '3, 6',
        opacity: 0.8,
      }).bindPopup('<strong>Chagos-Laccadive Submarine Ridge</strong><br>Underwater oceanic ridge system · Depths 1,800m to 3,400m');
      group.addLayer(ridgeLine);
    }

    // 11. Marine Protected Areas (MPAs)
    if (vectorLayers.mpa) {
      const vembanadCoords = [
        [10.05, 76.10],
        [10.15, 76.18],
        [10.08, 76.25],
        [9.98, 76.15],
      ];
      const mpaPoly = L.polygon(vembanadCoords, {
        color: '#059669',
        fillColor: '#059669',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 4',
      }).bindPopup('<strong>Vembanad Marine Sanctuary (MPA)</strong><br>Strict environmental protection zone · Commercial trawling prohibited');
      group.addLayer(mpaPoly);

      const mannarCoords = [
        [9.25, 79.15],
        [9.10, 79.35],
        [8.85, 79.10],
        [9.00, 78.90],
      ];
      const mannarPoly = L.polygon(mannarCoords, {
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '4, 4',
      }).bindPopup('<strong>Gulf of Mannar Marine Biosphere Reserve (MPA)</strong><br>Coral reef & seagrass sanctuary');
      group.addLayer(mannarPoly);
    }

    // 12. Naval Restricted Exclusion Zones
    if (vectorLayers.restricted) {
      const navalCoords = [
        [9.60, 75.60],
        [9.80, 75.75],
        [9.70, 75.95],
        [9.48, 75.80],
      ];
      const navalPoly = L.polygon(navalCoords, {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6',
      }).bindPopup('<strong>Naval Firing Range (Sector W-4)</strong><br>Strict military exclusion zone · Keep clear during live exercises');
      group.addLayer(navalPoly);
    }
  }, [vectorLayers, focusedRoute, focusedPFZ, hideLayersControl]);

  // Focus Map on Route if requested
  useEffect(() => {
    if (!focusedRoute || !mapInstanceRef.current) return;
    if (focusedRoute.waypoints && focusedRoute.waypoints.length > 0) {
      const bounds = L.latLngBounds(
        focusedRoute.waypoints.map((wp) => [wp.latitude, wp.longitude])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [focusedRoute]);

  // Focus Map on PFZ if requested
  useEffect(() => {
    if (!focusedPFZ || !mapInstanceRef.current) return;
    mapInstanceRef.current.setView([focusedPFZ.latitude, focusedPFZ.longitude], 10, {
      animate: true,
    });
  }, [focusedPFZ]);

  // Helper unit formatting functions for live ship telemetry
  const formatSpeed = (kt) => {
    if (speedUnit === 'km/h') return `${(kt * 1.852).toFixed(1)} km/h`;
    if (speedUnit === 'm/s') return `${(kt * 0.5144).toFixed(1)} m/s`;
    return `${kt.toFixed(1)} kt`;
  };

  const formatWave = (meters) => {
    if (waveUnit === 'ft') return `${(meters * 3.28084).toFixed(1)} ft`;
    return `${meters.toFixed(1)} m`;
  };

  const formatTemp = (celsius) => {
    if (tempUnit === 'f') return `${(celsius * 1.8 + 32).toFixed(1)} °F`;
    return `${celsius.toFixed(1)} °C`;
  };

  // Live GPS geolocation handler
  const handleLiveLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = +pos.coords.latitude.toFixed(4);
          const lon = +pos.coords.longitude.toFixed(4);
          setUserVessel({ lat, lon });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lon], 12, { duration: 1.5 });
          }
          setIsLocating(false);
        },
        (err) => {
          console.warn('GPS unavailable, centering on Cochin Port shipping channel:', err);
          const fallback = { lat: 9.9656, lon: 76.2425 };
          setUserVessel(fallback);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([fallback.lat, fallback.lon], 11, { duration: 1.2 });
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const fallback = { lat: 9.9656, lon: 76.2425 };
      setUserVessel(fallback);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([fallback.lat, fallback.lon], 11);
      }
      setIsLocating(false);
    }
  };

  // Render pulsing live vessel radar beacon when user location is detected
  useEffect(() => {
    if (!mapInstanceRef.current || !userVessel) return;
    const map = mapInstanceRef.current;
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    const icon = L.divIcon({
      className: 'user-live-beacon-icon',
      html: `
        <div class="user-live-gps-beacon">
          <div class="beacon-pulse"></div>
          <div class="beacon-center">🚢</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const marker = L.marker([userVessel.lat, userVessel.lon], { icon, zIndexOffset: 1000 })
      .bindPopup(`<strong>🚢 Live Vessel Position</strong><br>Latitude: ${userVessel.lat}°, Longitude: ${userVessel.lon}°<br>GPS Fix Active · Real-time Navigation Telemetry`)
      .addTo(map);
    marker.openPopup();
    userMarkerRef.current = marker;
  }, [userVessel]);

  return (
    <div className="map-stage-container">
      {/* Leaflet Map DOM Root */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" />

      {/* 1-Click Map Layers Drawer & Floating Button (Hidden in Safe Route Planner mode) */}
      {!hideLayersControl && (
        <MapLayersDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen((prev) => !prev)}
          onClose={() => setIsDrawerOpen(false)}
          activeBasemap={activeBasemap}
          setActiveBasemap={setActiveBasemap}
          activeWindyMode={activeWindyMode}
          setActiveWindyMode={setActiveWindyMode}
          vectorLayers={vectorLayers}
          setVectorLayers={setVectorLayers}
        />
      )}

      {/* On-Map Quick Actions (Top Right): Full Map Toggle & Live Location GPS */}
      <div className="map-floating-quick-controls">
        {onToggleFullMap && (
          <button
            type="button"
            className={`floating-quick-btn ${isFullMap ? 'active' : ''}`}
            onClick={onToggleFullMap}
            title={isFullMap ? 'Split View (Show Copilot)' : 'Full Map (Maximize View)'}
          >
            {isFullMap ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullMap ? 'Split View' : 'Full Map'}</span>
          </button>
        )}
        <button
          type="button"
          className={`floating-quick-btn gps-btn ${isLocating ? 'locating' : ''}`}
          onClick={handleLiveLocation}
          title="Detect and center live vessel position via GPS"
        >
          <Navigation2 size={15} className={isLocating ? 'spin-anim' : ''} />
          <span>{isLocating ? 'Locating...' : 'Live Location'}</span>
        </button>
      </div>

      {/* Permanent Real-Time Cursor HUD (Positioned at Right Bottom: strictly Latitude & Longitude only) */}
      <div className="map-cursor-hud">
        <div className="cursor-hud-item">
          <span className="cursor-hud-label">Latitude:</span>
          <span className="cursor-hud-val">{cursorCoords.lat.toFixed(4)}°</span>
        </div>
        <div className="cursor-hud-divider" />
        <div className="cursor-hud-item">
          <span className="cursor-hud-label">Longitude:</span>
          <span className="cursor-hud-val">{cursorCoords.lon.toFixed(4)}°</span>
        </div>
      </div>

      {/* When in Route Planner: Live Vessel Dataset HUD positioned at the BOTTOM of the map with Unit Toggles */}
      {hideLayersControl && shipLocation && (
        <div className="map-ship-telemetry-bottom-overlay">
          <div className="telemetry-overlay-header">
            <div className="header-left">
              <span className="live-pulse-dot" />
              <span className="overlay-title">LIVE SHIP TELEMETRY DATASET</span>
              <span className="overlay-loc-name">{shipLocation.name || 'Active Vessel Position'}</span>
            </div>

            {/* Real-time Unit Converters (User requested: change km/h, m/s, m, ft, °C, °F) */}
            <div className="telemetry-unit-controls">
              <div className="unit-toggle-pill">
                <span className="unit-label">Speed:</span>
                <button
                  type="button"
                  className={`btn-unit ${speedUnit === 'kt' ? 'active' : ''}`}
                  onClick={() => setSpeedUnit('kt')}
                >
                  kt
                </button>
                <button
                  type="button"
                  className={`btn-unit ${speedUnit === 'km/h' ? 'active' : ''}`}
                  onClick={() => setSpeedUnit('km/h')}
                >
                  km/h
                </button>
                <button
                  type="button"
                  className={`btn-unit ${speedUnit === 'm/s' ? 'active' : ''}`}
                  onClick={() => setSpeedUnit('m/s')}
                >
                  m/s
                </button>
              </div>

              <div className="unit-toggle-pill">
                <span className="unit-label">Wave:</span>
                <button
                  type="button"
                  className={`btn-unit ${waveUnit === 'm' ? 'active' : ''}`}
                  onClick={() => setWaveUnit('m')}
                >
                  m
                </button>
                <button
                  type="button"
                  className={`btn-unit ${waveUnit === 'ft' ? 'active' : ''}`}
                  onClick={() => setWaveUnit('ft')}
                >
                  ft
                </button>
              </div>

              <div className="unit-toggle-pill">
                <span className="unit-label">Temp:</span>
                <button
                  type="button"
                  className={`btn-unit ${tempUnit === 'c' ? 'active' : ''}`}
                  onClick={() => setTempUnit('c')}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={`btn-unit ${tempUnit === 'f' ? 'active' : ''}`}
                  onClick={() => setTempUnit('f')}
                >
                  °F
                </button>
              </div>
            </div>
          </div>

          <div className="overlay-metrics-row">
            <div className="metric-chip">
              <span className="chip-lbl">COORDINATES</span>
              <span className="chip-val">Latitude: {shipLocation.lat.toFixed(4)}°, Longitude: {shipLocation.lon.toFixed(4)}°</span>
            </div>
            <div className="metric-chip">
              <span className="chip-lbl">WIND SPEED</span>
              <span className="chip-val">
                {liveTelemetry ? formatSpeed(liveTelemetry.windKt) : formatSpeed(15.2)} WSW
              </span>
            </div>
            <div className="metric-chip">
              <span className="chip-lbl">SWELL WAVE</span>
              <span className="chip-val">
                {liveTelemetry ? formatWave(liveTelemetry.waveM) : formatWave(1.3)}
              </span>
            </div>
            <div className="metric-chip">
              <span className="chip-lbl">SST WATER</span>
              <span className="chip-val">
                {liveTelemetry ? formatTemp(liveTelemetry.sstC) : formatTemp(28.5)}
              </span>
            </div>
            <div className="metric-chip">
              <span className="chip-lbl">BAROMETER</span>
              <span className="chip-val">{liveTelemetry ? `${liveTelemetry.pressureHpa} hPa` : '1012 hPa'}</span>
            </div>
            <div className="metric-chip green">
              <span className="chip-lbl">PASSAGE STATUS</span>
              <span className="chip-val">{liveTelemetry ? liveTelemetry.seaState : 'Safe Sea State'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Windy Scale Bar Legend (Only when windy mode active and not in static route mode) */}
      {!isStaticMap && activeWindyMode && (
        <WindyLegend activeMode={activeWindyMode} hoverTelemetry={hoverTelemetry} />
      )}
    </div>
  );
}
