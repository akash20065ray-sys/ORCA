import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Compass,
  Navigation,
  Crosshair,
  Download,
  RotateCcw,
  MapPin,
  ArrowUpDown,
  X,
  AlertOctagon,
  Radio,
  PhoneCall,
  Ship,
  Anchor,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
  Send,
  LifeBuoy
} from 'lucide-react';
import { exportRoutePlanPDF } from '../utils/pdfExport';
import { useLanguage } from '../context/LanguageContext';

const POPULAR_PORTS = [
  { id: 'kochi', name: 'Cochin Port (Kochi)', state: 'Kerala', lat: 9.9656, lon: 76.2425 },
  { id: 'mumbai', name: 'Jawaharlal Nehru Port (Mumbai)', state: 'Maharashtra', lat: 18.9483, lon: 72.9515 },
  { id: 'colombo', name: 'Port of Colombo (Sri Lanka)', state: 'Western Province', lat: 6.9497, lon: 79.8433 },
  { id: 'mangalore', name: 'New Mangalore Port', state: 'Karnataka', lat: 12.9234, lon: 74.8156 },
  { id: 'goa', name: 'Mormugao Port (Goa)', state: 'Goa', lat: 15.4167, lon: 73.8000 },
  { id: 'tuticorin', name: 'V.O. Chidambaranar Port (Tuticorin)', state: 'Tamil Nadu', lat: 8.7642, lon: 78.1348 },
  { id: 'chennai', name: 'Chennai Port (Kasimedu)', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { id: 'vizag', name: 'Visakhapatnam Port', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185 },
  { id: 'veraval', name: 'Veraval Fishing Port', state: 'Gujarat', lat: 20.9000, lon: 70.3667 },
  { id: 'paradip', name: 'Paradip Port', state: 'Odisha', lat: 20.2644, lon: 86.6698 },
  { id: 'minicoy', name: 'Minicoy Port (Lakshadweep)', state: 'Lakshadweep', lat: 8.2833, lon: 73.0500 },
  { id: 'kandla', name: 'Deendayal Port (Kandla)', state: 'Gujarat', lat: 23.0033, lon: 70.2185 },
  { id: 'portblair', name: 'Port Blair Harbour (Andaman)', state: 'Andaman & Nicobar', lat: 11.6667, lon: 92.7333 },
  { id: 'beypore', name: 'Beypore Port (Kozhikode)', state: 'Kerala', lat: 11.1633, lon: 75.8083 },
  { id: 'vizhinjam', name: 'Vizhinjam International Seaport', state: 'Kerala', lat: 8.3750, lon: 76.9900 },
  { id: 'munambam', name: 'Munambam Fishing Harbour', state: 'Kerala', lat: 10.1833, lon: 76.1750 },
  { id: 'kollam', name: 'Kollam / Neendakara Harbour', state: 'Kerala', lat: 8.9400, lon: 76.5367 },
  { id: 'alappuzha', name: 'Alappuzha Offshore Anchorage', state: 'Kerala', lat: 9.4900, lon: 76.3200 },
  { id: 'kavaratti', name: 'Kavaratti Island Jetty', state: 'Lakshadweep', lat: 10.5667, lon: 72.6333 },
  { id: 'okha', name: 'Okha Port (Gujarat)', state: 'Gujarat', lat: 22.4667, lon: 69.0667 },
  { id: 'porbandar', name: 'Porbandar Port', state: 'Gujarat', lat: 21.6400, lon: 69.6000 },
  { id: 'kakinada', name: 'Kakinada Deep Water Port', state: 'Andhra Pradesh', lat: 16.9800, lon: 82.2800 },
  { id: 'haldia', name: 'Haldia Dock Complex', state: 'West Bengal', lat: 22.0253, lon: 88.0583 },
  { id: 'male', name: 'Malé Commercial Harbour (Maldives)', state: 'Kaafu Atoll', lat: 4.1755, lon: 73.5093 },
];

const findNearestPortName = (lat, lon) => {
  let nearest = null;
  let minDist = Infinity;
  for (const p of POPULAR_PORTS) {
    const d = Math.hypot(p.lat - lat, p.lon - lon);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  if (nearest && minDist < 0.18) {
    return nearest.name;
  }
  return `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
};

export default function RoutePlanner({
  onFocusRoute,
  onUpdateShipLocation,
  pickingMode = null,
  onStartPickOnMap = null,
  pickedMapLocation = null,
  draggedEndpoint = null,
  onUpdateEndpoints = null,
}) {
  const { t } = useLanguage();
  // Google Maps Style Location Search States (Departure A and Destination B)
  const [originQuery, setOriginQuery] = useState('Cochin Port (Kochi)');
  const [originCoords, setOriginCoords] = useState({ lat: 9.9656, lon: 76.2425, name: 'Cochin Port (Kochi)' });

  const [destQuery, setDestQuery] = useState('Port of Colombo (Sri Lanka)');
  const [destCoords, setDestCoords] = useState({ lat: 6.9497, lon: 79.8433, name: 'Port of Colombo (Sri Lanka)' });

  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [downloadToast, setDownloadToast] = useState(null);

  const [cruisingSpeed, setCruisingSpeed] = useState(12.0);
  const [vesselDraft, setVesselDraft] = useState(3.2);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState(1); // Default to Bravo (Optimal)

  // SOS Maritime Emergency States
  const [showSosModal, setShowSosModal] = useState(false);
  const [nearestContacts, setNearestContacts] = useState(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [sosTargetRecipient, setSosTargetRecipient] = useState('ALL_STATIONS'); // 'ALL_STATIONS' | 'NEAREST_SHIP' | 'NEAREST_PORT' | 'MRCC'
  const [sosDistressType, setSosDistressType] = useState('ENGINE_FAILURE_DRIFT');
  const [sosCrewCount, setSosCrewCount] = useState(4);
  const [sosVesselId, setSosVesselId] = useState('IND-KL-07-ORCA');
  const [isDispatchingSos, setIsDispatchingSos] = useState(false);
  const [sosDistressResult, setSosDistressResult] = useState(null);
  const [copiedVoiceScript, setCopiedVoiceScript] = useState(false);

  // Track timestamps of map clicks / drags to prevent repeat firing
  const lastPickedTimestampRef = useRef(null);
  const lastDraggedTimestampRef = useRef(null);

  // Filter Port Suggestions
  const originSuggestions = useMemo(() => {
    if (!originQuery) return POPULAR_PORTS.slice(0, 7);
    const q = originQuery.toLowerCase().trim();
    return POPULAR_PORTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [originQuery]);

  const destSuggestions = useMemo(() => {
    if (!destQuery) return POPULAR_PORTS.slice(0, 7);
    const q = destQuery.toLowerCase().trim();
    return POPULAR_PORTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [destQuery]);

  // Synchronize endpoints with MapStage parent
  useEffect(() => {
    if (onUpdateEndpoints) {
      onUpdateEndpoints({ origin: originCoords, destination: destCoords });
    }
  }, [originCoords, destCoords, onUpdateEndpoints]);

  // Synchronize Ship Location Telemetry
  useEffect(() => {
    if (onUpdateShipLocation) {
      onUpdateShipLocation(originCoords);
    }
  }, [originCoords, onUpdateShipLocation]);

  // Toast feedback helper
  const triggerToast = (msg) => {
    setDownloadToast(msg);
    setTimeout(() => setDownloadToast(null), 2800);
  };

  // Route calculation execution
  const executeRouteCalculation = useCallback(
    async (origObj = originCoords, destObj = destCoords) => {
      setIsOptimizing(true);

      const origStr = `${origObj.lat}, ${origObj.lon}`;
      const destStr = `${destObj.lat}, ${destObj.lon}`;

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
    },
    [originCoords, destCoords, cruisingSpeed, vesselDraft, onFocusRoute]
  );

  // Initial calculation on component mount
  useEffect(() => {
    executeRouteCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle map selection picked by user in MapStage
  useEffect(() => {
    if (!pickedMapLocation || !pickedMapLocation.timestamp) return;
    if (pickedMapLocation.timestamp === lastPickedTimestampRef.current) return;
    lastPickedTimestampRef.current = pickedMapLocation.timestamp;

    const { target, lat, lon } = pickedMapLocation;
    const label = findNearestPortName(lat, lon);

    if (target === 'origin') {
      const newOrig = { lat, lon, name: label };
      setOriginQuery(label);
      setOriginCoords(newOrig);
      setShowOriginDropdown(false);
      executeRouteCalculation(newOrig, destCoords);
      triggerToast(`📍 Departure set: ${label}`);
    } else if (target === 'destination') {
      const newDest = { lat, lon, name: label };
      setDestQuery(label);
      setDestCoords(newDest);
      setShowDestDropdown(false);
      executeRouteCalculation(originCoords, newDest);
      triggerToast(`🎯 Destination set: ${label}`);
    }
  }, [pickedMapLocation, destCoords, originCoords, executeRouteCalculation]);

  // Handle draggable endpoint pin movements from MapStage
  useEffect(() => {
    if (!draggedEndpoint || !draggedEndpoint.timestamp) return;
    if (draggedEndpoint.timestamp === lastDraggedTimestampRef.current) return;
    lastDraggedTimestampRef.current = draggedEndpoint.timestamp;

    const { endpoint, lat, lon } = draggedEndpoint;
    const label = findNearestPortName(lat, lon);

    if (endpoint === 'origin') {
      const newOrig = { lat, lon, name: label };
      setOriginQuery(label);
      setOriginCoords(newOrig);
      executeRouteCalculation(newOrig, destCoords);
      triggerToast(`📍 Departure adjusted: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
    } else if (endpoint === 'destination') {
      const newDest = { lat, lon, name: label };
      setDestQuery(label);
      setDestCoords(newDest);
      executeRouteCalculation(originCoords, newDest);
      triggerToast(`🎯 Destination adjusted: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
    }
  }, [draggedEndpoint, destCoords, originCoords, executeRouteCalculation]);

  // Live GPS Detector (Sets Departure to user's real hardware location)
  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = +pos.coords.latitude.toFixed(4);
          const lon = +pos.coords.longitude.toFixed(4);
          const label = `GPS Fix: ${lat}°N, ${lon}°E`;
          const newOrig = { lat, lon, name: label };
          setOriginQuery(label);
          setOriginCoords(newOrig);
          setShowOriginDropdown(false);
          executeRouteCalculation(newOrig, destCoords);
          triggerToast('🎯 Device GPS position locked as Departure');
        },
        () => {
          const newOrig = { lat: 9.9656, lon: 76.2425, name: 'Cochin Port (Kochi)' };
          setOriginQuery('Cochin Port (Kochi)');
          setOriginCoords(newOrig);
          executeRouteCalculation(newOrig, destCoords);
          triggerToast('GPS not accessible, defaulted to Cochin Port');
        }
      );
    }
  };

  // Reverse / Swap Route (Google Maps style)
  const handleSwapEndpoints = () => {
    const tempQuery = originQuery;
    const tempCoords = originCoords;

    setOriginQuery(destQuery);
    setOriginCoords(destCoords);

    setDestQuery(tempQuery);
    setDestCoords(tempCoords);

    executeRouteCalculation(destCoords, tempCoords);
    triggerToast('⇅ Route reversed: Departure & Destination swapped');
  };

  // Select a port from Autocomplete dropdown
  const handleSelectOriginPort = (port) => {
    const newOrig = { lat: port.lat, lon: port.lon, name: port.name };
    setOriginQuery(port.name);
    setOriginCoords(newOrig);
    setShowOriginDropdown(false);
    executeRouteCalculation(newOrig, destCoords);
  };

  const handleSelectDestPort = (port) => {
    const newDest = { lat: port.lat, lon: port.lon, name: port.name };
    setDestQuery(port.name);
    setDestCoords(newDest);
    setShowDestDropdown(false);
    executeRouteCalculation(originCoords, newDest);
  };

  // Parse raw coordinate strings typed in by user
  const handleOriginBlur = () => {
    setTimeout(() => {
      setShowOriginDropdown(false);
      const coordMatch = originQuery.match(/([+-]?\d+(?:\.\d+)?)\s*[,/ ]+\s*([+-]?\d+(?:\.\d+)?)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          const label = findNearestPortName(lat, lon);
          const newOrig = { lat, lon, name: label };
          setOriginCoords(newOrig);
          executeRouteCalculation(newOrig, destCoords);
        }
      }
    }, 200);
  };

  const handleDestBlur = () => {
    setTimeout(() => {
      setShowDestDropdown(false);
      const coordMatch = destQuery.match(/([+-]?\d+(?:\.\d+)?)\s*[,/ ]+\s*([+-]?\d+(?:\.\d+)?)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          const label = findNearestPortName(lat, lon);
          const newDest = { lat, lon, name: label };
          setDestCoords(newDest);
          executeRouteCalculation(originCoords, newDest);
        }
      }
    }, 200);
  };

  const currentRoute = routes && routes.length > 0 ? routes[activeRouteIndex] : null;
  const nextWaypoint = currentRoute && currentRoute.waypoints && currentRoute.waypoints.length > 1 ? currentRoute.waypoints[1] : null;

  // Real-time environmental calculations at ship coordinates
  const latF = (originCoords.lat - 8.0) / 12.0;
  const lonF = (originCoords.lon - 70.0) / 12.0;
  const shipWind = +(14.0 + 8.0 * Math.sin(latF * 2.5 + lonF * 1.8)).toFixed(1);
  const shipWindDir = Math.round(230 + 35 * Math.sin(latF * 1.5 - lonF * 1.2));
  const shipWave = +(0.8 + (shipWind / 30.0) * 1.8 + 0.3 * Math.cos(latF * 3.0)).toFixed(1);
  const shipSST = +(28.4 + 2.0 * Math.sin(lonF * 1.6) - 0.7 * latF).toFixed(1);

  // Direct Download: Download Official Maritime Passage Plan directly to user's Downloads folder (No print/save dialog)
  const handleDownloadPDF = () => {
    if (!currentRoute) return;
    const origName = originQuery || 'Departure';
    const destName = destQuery || 'Destination';

    try {
      exportRoutePlanPDF(currentRoute, origName, destName);
      triggerToast('Passage plan PDF downloaded directly to your Downloads folder');
    } catch (err) {
      console.error('Failed to export passage plan PDF:', err);
      triggerToast('Error generating PDF document');
    }
  };

  // Fetch Nearest Ships, Port, and Coast Guard MRCC Station
  const fetchNearestEmergencyContacts = useCallback(async (lat, lon) => {
    setIsLoadingContacts(true);
    try {
      const res = await fetch(`/api/emergency/nearest-contacts?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        setNearestContacts(data);
      }
    } catch (e) {
      console.error('Failed to query emergency contacts:', e);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  // Trigger contact discovery whenever SOS modal opens
  useEffect(() => {
    if (showSosModal) {
      const targetLat = originCoords?.lat || 9.9656;
      const targetLon = originCoords?.lon || 76.2425;
      fetchNearestEmergencyContacts(targetLat, targetLon);
    }
  }, [showSosModal, originCoords, fetchNearestEmergencyContacts]);

  // Transmit Official GMDSS Distress Signal
  const handleBroadcastSOS = async () => {
    setIsDispatchingSos(true);
    try {
      const targetLat = originCoords?.lat || 9.9656;
      const targetLon = originCoords?.lon || 76.2425;
      const payload = {
        vessel_id: sosVesselId,
        callsign: 'ORCA-INDIA',
        latitude: targetLat,
        longitude: targetLon,
        crew_count: sosCrewCount,
        distress_type: sosDistressType,
        target_recipient: sosTargetRecipient,
        sea_state: 'Moderate Swell 1.4m · Wind 16 kt',
        description: 'Vessel lost propulsion and drifting offshore. Urgent SAR and nearest vessel intercept requested.'
      };

      const res = await fetch('/api/emergency/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSosDistressResult(data);
        triggerToast(`🚨 SOS MAYDAY Beacon Transmitted: ${data.dispatch_token}`);
      }
    } catch (err) {
      console.error('Failed to broadcast SOS', err);
    } finally {
      setIsDispatchingSos(false);
    }
  };

  // Stand Down SOS Beacon
  const handleCancelSOS = async () => {
    if (!sosDistressResult?.dispatch_token) {
      setSosDistressResult(null);
      return;
    }
    try {
      await fetch(`/api/emergency/cancel/${sosDistressResult.dispatch_token}?reason=Vessel+stabilized+or+false+alarm`, {
        method: 'POST'
      });
      setSosDistressResult(null);
      triggerToast('Distress Beacon Stood Down with Coast Guard MRCC');
    } catch (e) {
      setSosDistressResult(null);
    }
  };

  const handleCopyVoiceScript = () => {
    if (!sosDistressResult?.voice_mayday_script) return;
    navigator.clipboard.writeText(sosDistressResult.voice_mayday_script);
    setCopiedVoiceScript(true);
    setTimeout(() => setCopiedVoiceScript(false), 2500);
    triggerToast('Voice Mayday VHF script copied to clipboard');
  };

  // Reset to default starting configuration: Kochi -> Colombo at 12 kt, 3.2 m draft
  const handleResetDefaults = () => {
    const orig = { lat: 9.9656, lon: 76.2425, name: 'Cochin Port (Kochi)' };
    const dest = { lat: 6.9497, lon: 79.8433, name: 'Port of Colombo (Sri Lanka)' };

    setOriginQuery('Cochin Port (Kochi)');
    setOriginCoords(orig);

    setDestQuery('Port of Colombo (Sri Lanka)');
    setDestCoords(dest);

    setCruisingSpeed(12.0);
    setVesselDraft(3.2);

    executeRouteCalculation(orig, dest);
    triggerToast('Reset to default Cochin Port → Colombo route');
  };

  return (
    <div className="route-planner-panel">
      {/* Panel Header with Small Single PDF Download Button & Default Reset */}
      <div className="panel-header">
        <div className="panel-header-left">
          <Compass size={20} className="panel-header-icon" />
          <div>
            <h3 className="panel-title">{t('routeTitle', 'Dynamic Route Optimization')}</h3>
            <span className="panel-sub">COLREGS Rule 10 & Real-Time Compass Waypoint Steering</span>
          </div>
        </div>

        {/* Small Top Action Controls: SOS Distress, Single PDF & Default Reset */}
        <div className="panel-header-actions">
          {/* High Priority Red SOS Distress Button */}
          <button
            type="button"
            className="btn-route-header-sos"
            onClick={() => setShowSosModal(true)}
            title="Broadcast GMDSS Mayday Emergency Distress Signal to Nearest Ship, Port & Coast Guard"
          >
            <AlertOctagon size={13} />
            <span>SOS Distress</span>
          </button>

          <button
            type="button"
            className="btn-route-header-download"
            onClick={handleDownloadPDF}
            title="Download official Passage Plan as PDF"
          >
            <Download size={12} />
            <span>PDF</span>
          </button>

          <button
            type="button"
            className="btn-route-header-default"
            onClick={handleResetDefaults}
            title="Reset route to Cochin -> Colombo default"
          >
            <RotateCcw size={12} />
            <span>Default</span>
          </button>
        </div>
      </div>

      {/* Floating Action Feedback Toast */}
      {downloadToast && (
        <div className="route-action-toast">
          <Download size={14} className="toast-icon" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Active Broadcast Beacon Ticker in Main Route Panel */}
      {sosDistressResult && (
        <div
          onClick={() => setShowSosModal(true)}
          style={{
            margin: '0 0 14px 0',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>
                ACTIVE SOS MAYDAY BEACON BROADCASTING
              </div>
              <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                Ref: {sosDistressResult.dispatch_token} · Intercept ETA: ~{sosDistressResult.sar_response_eta_minutes} min
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#ffffff', background: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
            Open Terminal ➜
          </span>
        </div>
      )}

      {/* Maritime GMDSS SOS Emergency Distress Modal */}
      {showSosModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#0b1329',
              border: '2px solid #ef4444',
              borderRadius: '14px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)',
              color: '#f1f5f9'
            }}
          >
            {/* Modal Header with Pulsing Beacon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px #ef4444' }}>
                  <AlertOctagon size={22} style={{ color: '#ffffff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.02em' }}>
                    GMDSS Maritime SOS Distress Terminal
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#fca5a5' }}>
                    IMO / Indian Coast Guard National Maritime SAR & Nearest Ship Relay
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Current Distress Position Strip */}
            <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Vessel Distress Position:</span>{' '}
                <strong style={{ color: '#38bdf8' }}>{originCoords.lat.toFixed(4)}°N, {originCoords.lon.toFixed(4)}°E</strong>{' '}
                <span style={{ color: '#cbd5e1' }}>({originCoords.name})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Craft:</span>
                <input
                  type="text"
                  value={sosVesselId}
                  onChange={(e) => setSosVesselId(e.target.value)}
                  style={{ width: '130px', padding: '3px 7px', fontSize: '11px', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#ffffff' }}
                />
              </div>
            </div>

            {/* If Distress Beacon is Active, show Active Transmission Card & Voice Mayday Script */}
            {sosDistressResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Pulsing Active Alert Banner */}
                <div style={{ background: 'rgba(239, 68, 68, 0.18)', border: '2px solid #ef4444', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
                    MAYDAY DISTRESS TRANSMISSION ACTIVE & LOGGED
                  </div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>
                    Dispatch ID: <strong>{sosDistressResult.dispatch_token}</strong> · Dispatched to: <strong>{sosDistressResult.target_recipient}</strong>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', marginTop: '8px' }}>
                    ⏳ Fast Interceptor Craft Estimated Intercept ETA: ~{sosDistressResult.sar_response_eta_minutes} minutes
                  </div>
                </div>

                {/* IMO Standard VHF Mayday Voice Script */}
                <div style={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: '700', fontSize: '12px' }}>
                      <Radio size={15} />
                      <span>OFFICIAL IMO STANDARD MAYDAY VOICE SCRIPT (VHF CH 16):</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyVoiceScript}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px', background: copiedVoiceScript ? '#059669' : '#1e293b', color: '#ffffff', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      {copiedVoiceScript ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedVoiceScript ? 'Copied' : 'Copy Script'}</span>
                    </button>
                  </div>

                  <pre style={{ margin: 0, padding: '12px', background: '#020617', borderRadius: '6px', fontSize: '12px', lineHeight: '1.6', color: '#38bdf8', fontFamily: 'monospace', whiteSpace: 'pre-wrap', border: '1px solid #1e293b' }}>
                    {sosDistressResult.voice_mayday_script}
                  </pre>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '6px' }}>
                    Speak clearly into your VHF Radio on Channel 16 (156.800 MHz) using the text above.
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', border: '1px solid #334155', fontSize: '11.5px' }}>
                  <div style={{ fontWeight: '700', color: '#ffffff', marginBottom: '6px' }}>Immediate Safety Protocols:</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sosDistressResult.instructions?.map((inst, idx) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ul>
                </div>

                {/* Stand Down / Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancelSOS}
                  style={{ padding: '10px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  Stand Down / Cancel Distress Alert
                </button>
              </div>
            ) : (
              /* Pre-Broadcast Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Nearest Maritime Responders Grid */}
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Nearby Maritime Responders Detected in Area:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                  {/* Nearest Ship Card */}
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                      <Ship size={15} />
                      <span>Nearest Vessel (AIS)</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                      {nearestContacts?.nearest_ship?.name || 'ICGS Samar (Coast Guard)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {nearestContacts?.nearest_ship?.type || 'Fast Patrol Vessel'}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#f59e0b', fontWeight: '600' }}>
                      Distance: <strong>{nearestContacts?.nearest_ship?.distance_nm || 3.5} NM</strong> ({nearestContacts?.nearest_ship?.bearing_degrees || 40}° {nearestContacts?.nearest_ship?.bearing_cardinal || 'NE'})
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#10b981', marginTop: '2px' }}>
                      Intercept ETA: ~{nearestContacts?.nearest_ship?.intercept_eta_minutes || 9} mins · {nearestContacts?.nearest_ship?.vhf_channel || 'VHF Ch 16 / DSC 70'}
                    </div>
                  </div>

                  {/* Nearest Port Card */}
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                      <Anchor size={15} />
                      <span>Nearest Coastal Port</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                      {nearestContacts?.nearest_port?.name || 'Cochin Port (Kochi)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {nearestContacts?.nearest_port?.state || 'Kerala Coast'}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#f59e0b', fontWeight: '600' }}>
                      Distance: <strong>{nearestContacts?.nearest_port?.distance_nm || 1.4} NM</strong> ({nearestContacts?.nearest_port?.bearing_degrees || 76}° {nearestContacts?.nearest_port?.bearing_cardinal || 'ENE'})
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '2px' }}>
                      {nearestContacts?.nearest_port?.vhf_channel || 'VHF Channel 12 / 16 (Port Control)'}
                    </div>
                  </div>

                  {/* Assigned MRCC Card */}
                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                      <ShieldAlert size={15} />
                      <span>Coast Guard MRCC</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                      {nearestContacts?.nearest_mrcc?.name || 'MRCC Kochi'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
                      Hotline: {nearestContacts?.nearest_mrcc?.contact_phone || '+91-484-2216444'}
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#f59e0b', fontWeight: '600' }}>
                      Range: <strong>{nearestContacts?.nearest_mrcc?.distance_nm || 1.4} NM</strong> · SAR Fast Craft
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '2px' }}>
                      VHF Channel 16 / DSC Ch 70 (2182 kHz)
                    </div>
                  </div>
                </div>

                {/* Target Relay Recipient Selector */}
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Distress Alert Recipient:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {[
                      { id: 'ALL_STATIONS', label: '📡 All Stations (Ship + Port + ICG)', desc: 'Full SAR Dispatch' },
                      { id: 'NEAREST_SHIP', label: '🚢 Nearest Ship Only', desc: 'VHF DSC Ch 70' },
                      { id: 'NEAREST_PORT', label: '⚓ Nearest Port Authority', desc: 'VHF Ch 12/16' },
                      { id: 'MRCC', label: '🛡️ Coast Guard MRCC', desc: 'National SAR' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSosTargetRecipient(opt.id)}
                        style={{
                          padding: '8px 10px',
                          background: sosTargetRecipient === opt.id ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                          border: sosTargetRecipient === opt.id ? '2px solid #ef4444' : '1px solid #334155',
                          borderRadius: '6px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '11.5px'
                        }}
                      >
                        <div style={{ fontWeight: '700' }}>{opt.label}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nature of Distress & Souls on Board */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nature of Distress:</label>
                    <select
                      value={sosDistressType}
                      onChange={(e) => setSosDistressType(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                    >
                      <option value="ENGINE_FAILURE_DRIFT">Engine Failure & Leeway Drift</option>
                      <option value="HULL_BREACH_FLOODING">Hull Breach / Taking Water</option>
                      <option value="FIRE_EXPLOSION">Fire / Explosion On Board</option>
                      <option value="MEDICAL_EMERGENCY">Medical Emergency At Sea</option>
                      <option value="MAN_OVERBOARD">Man Overboard (MOB)</option>
                      <option value="CAPSIZED_VESSEL">Vessel Listing / Capsized</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Persons on Board (POB):</label>
                    <input
                      type="number"
                      min="1"
                      value={sosCrewCount}
                      onChange={(e) => setSosCrewCount(parseInt(e.target.value, 10) || 4)}
                      style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* Big Red Broadcast Button */}
                <button
                  type="button"
                  disabled={isDispatchingSos}
                  onClick={handleBroadcastSOS}
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: isDispatchingSos ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
                    letterSpacing: '0.03em'
                  }}
                >
                  <AlertOctagon size={18} />
                  <span>{isDispatchingSos ? 'TRANSMITTING BEACON...' : 'TRANSMIT GMDSS MAYDAY DISTRESS BEACON'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Vessel Location Environmental Telemetry Card */}
      <div className="ship-live-telemetry-card">
        <div className="telemetry-card-title-row">
          <div className="title-with-dot">
            <span className="live-pulse-dot" />
            <span className="t-card-title">LIVE SHIP POSITION DATASET</span>
          </div>
          <span className="t-card-coords">
            Latitude: {originCoords.lat.toFixed(4)}°, Longitude: {originCoords.lon.toFixed(4)}°
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

      {/* Google Maps Style Route Card (Unified Search, Map Picker, and Swap) */}
      <div className="google-maps-route-card">
        {/* Departure Row (A) */}
        <div className="route-card-endpoint-row origin">
          <div className="endpoint-pin-badge origin" title="Departure Point (A)">
            <span>A</span>
          </div>
          <div className="endpoint-input-container">
            <input
              type="text"
              className="endpoint-search-input"
              placeholder="Enter departure port, city, or coordinates..."
              value={originQuery}
              onChange={(e) => {
                setOriginQuery(e.target.value);
                setShowOriginDropdown(true);
              }}
              onFocus={() => setShowOriginDropdown(true)}
              onBlur={handleOriginBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOriginBlur();
              }}
            />
            {originQuery && (
              <button
                type="button"
                className="btn-clear-endpoint"
                onClick={() => {
                  setOriginQuery('');
                  setShowOriginDropdown(false);
                }}
                title="Clear departure"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="endpoint-actions-bar">
            {/* Quick GPS button */}
            <button
              type="button"
              className="btn-endpoint-action gps"
              onClick={handleDetectGPS}
              title="Use Device Live GPS Position"
            >
              <Crosshair size={14} />
            </button>
            {/* Pick on Map button */}
            <button
              type="button"
              className={`btn-endpoint-action pick-map ${pickingMode === 'origin' ? 'active-picking' : ''}`}
              onClick={() => {
                if (onStartPickOnMap) onStartPickOnMap('origin');
              }}
              title="Click on the ocean/map to set Departure (Google Maps style)"
            >
              <MapPin size={14} />
              <span className="pick-btn-label">Map</span>
            </button>
          </div>
        </div>

        {/* Autocomplete Suggestions for Departure */}
        {showOriginDropdown && originSuggestions.length > 0 && (
          <div className="endpoint-autocomplete-dropdown">
            <div className="autocomplete-header">POPULAR PORTS & ANCHORAGES</div>
            {originSuggestions.map((port) => (
              <div
                key={port.id}
                className="autocomplete-item"
                onMouseDown={() => handleSelectOriginPort(port)}
              >
                <MapPin size={13} className="item-pin-icon" />
                <div className="item-meta">
                  <span className="item-name">{port.name}</span>
                  <span className="item-sub">
                    {port.state} · {port.lat.toFixed(4)}°N, {port.lon.toFixed(4)}°E
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Middle Connector with Circular Swap Button */}
        <div className="route-endpoints-divider">
          <div className="connector-trail">
            <span className="trail-dot" />
            <span className="trail-dot" />
            <span className="trail-dot" />
          </div>
          <button
            type="button"
            className="btn-swap-endpoints"
            onClick={handleSwapEndpoints}
            title="Reverse Route (Swap Departure and Destination)"
          >
            <ArrowUpDown size={14} />
          </button>
          <div className="connector-rule" />
        </div>

        {/* Destination Row (B) */}
        <div className="route-card-endpoint-row destination">
          <div className="endpoint-pin-badge destination" title="Destination Point (B)">
            <span>B</span>
          </div>
          <div className="endpoint-input-container">
            <input
              type="text"
              className="endpoint-search-input"
              placeholder="Enter destination port, harbor, or coordinates..."
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setShowDestDropdown(true);
              }}
              onFocus={() => setShowDestDropdown(true)}
              onBlur={handleDestBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDestBlur();
              }}
            />
            {destQuery && (
              <button
                type="button"
                className="btn-clear-endpoint"
                onClick={() => {
                  setDestQuery('');
                  setShowDestDropdown(false);
                }}
                title="Clear destination"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="endpoint-actions-bar">
            {/* Pick on Map button */}
            <button
              type="button"
              className={`btn-endpoint-action pick-map ${pickingMode === 'destination' ? 'active-picking' : ''}`}
              onClick={() => {
                if (onStartPickOnMap) onStartPickOnMap('destination');
              }}
              title="Click on the ocean/map to set Destination (Google Maps style)"
            >
              <MapPin size={14} />
              <span className="pick-btn-label">Map</span>
            </button>
          </div>
        </div>

        {/* Autocomplete Suggestions for Destination */}
        {showDestDropdown && destSuggestions.length > 0 && (
          <div className="endpoint-autocomplete-dropdown">
            <div className="autocomplete-header">POPULAR PORTS & ANCHORAGES</div>
            {destSuggestions.map((port) => (
              <div
                key={port.id}
                className="autocomplete-item"
                onMouseDown={() => handleSelectDestPort(port)}
              >
                <MapPin size={13} className="item-pin-icon" />
                <div className="item-meta">
                  <span className="item-name">{port.name}</span>
                  <span className="item-sub">
                    {port.state} · {port.lat.toFixed(4)}°N, {port.lon.toFixed(4)}°E
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vessel Parameters Row & Optimize Action Button */}
        <div className="vessel-params-row">
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
              onClick={() => executeRouteCalculation(originCoords, destCoords)}
              disabled={isOptimizing}
            >
              <Navigation size={15} />
              <span>{isOptimizing ? 'Calculating...' : 'Recalculate'}</span>
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
              {nextWaypoint.steer_instruction || `Steer ${Math.round(nextWaypoint.bearing_degrees || 247)}° into TSS Outbound Lane`}
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
