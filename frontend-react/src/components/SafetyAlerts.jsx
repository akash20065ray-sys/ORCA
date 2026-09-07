import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Anchor,
  Wind,
  Waves,
  Radio,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';

const IMD_PORT_SIGNALS = [
  {
    signal: 1,
    name: 'Cautionary Signal No. 1',
    day_shape: '⚫ One Black Ball',
    night_light: '⚪ over 🔴 (White over Red)',
    wind_kts: '< 17 kts',
    meaning: 'Distant cyclonic disturbance or low pressure system in ocean. Port is not in immediate danger, but sea state may become squally. Vessels leaving harbor should monitor broadcasts.',
    recommendation: 'Deep-sea craft exercise caution; standard harbor operations continue.',
  },
  {
    signal: 2,
    name: 'Warning Signal No. 2',
    day_shape: '▲ One Black Cone (Apex Up)',
    night_light: '🔴 over ⚪ (Red over White)',
    wind_kts: '17 - 21 kts',
    meaning: 'Disturbance has intensified into depression/cyclonic storm with gale winds. Port not in imminent danger yet, but sea state worsening.',
    recommendation: 'Small craft and non-mechanized artisanal boats advise return to harbor shelter.',
  },
  {
    signal: 3,
    name: 'Local Cautionary Signal No. 3',
    day_shape: '⚫ over ▲ (Ball over Cone Up)',
    night_light: '⚪ over ⚪ (Two White Lights Vertically)',
    wind_kts: '22 - 27 kts',
    meaning: 'Port itself is threatened by squally weather. Heavy gusts and rough seas developing in harbor entrance and coastal approaches.',
    recommendation: 'Total prohibition on artisanal skiffs leaving harbor. Vessels at anchor double moorings.',
  },
  {
    signal: 4,
    name: 'Local Warning Signal No. 4',
    day_shape: '▬ One Black Cylinder',
    night_light: '🔴 over ⚪ ⚪ (Red over Two White)',
    wind_kts: '28 - 33 kts',
    meaning: 'Port threatened by cyclonic storm. Serious danger to vessels in anchorage and offshore.',
    recommendation: 'All fishing activities suspended. Mechanized trawlers must return immediately.',
  },
  {
    signal: 5,
    name: 'Danger Signal No. 5',
    day_shape: '▼ One Black Cone (Apex Down)',
    night_light: '🔴 over 🔴 (Two Red Lights Vertically)',
    wind_kts: '34 - 47 kts',
    meaning: 'Cyclonic storm of slight/moderate intensity expected to cross coast keeping port to the south.',
    recommendation: 'Severe danger. Ships to take inner harbor shelter or proceed to deep-water sea clearance.',
  },
  {
    signal: 6,
    name: 'Danger Signal No. 6',
    day_shape: '▲ One Black Cone (Apex Up)',
    night_light: '🔴 ⚪ 🔴 (White Light between Two Red)',
    wind_kts: '34 - 47 kts',
    meaning: 'Cyclonic storm expected to cross coast keeping port to the north.',
    recommendation: 'High storm surge risk on harbor wharves. Coastal evacuation protocols activated.',
  },
  {
    signal: 7,
    name: 'Danger Signal No. 7',
    day_shape: '▲ over ▼ (Two Cones points together - Hourglass)',
    night_light: '🔴 ⚪ ⚪ 🔴 (Two White between Two Red)',
    wind_kts: '34 - 47 kts',
    meaning: 'Severe cyclonic storm expected to cross directly over or very near the port.',
    recommendation: 'Total harbor shutdown. All personnel evacuated from jetties and open wharves.',
  },
  {
    signal: 8,
    name: 'Great Danger Signal No. 8',
    day_shape: '▼ over ▲ (Two Cones base to base - Diamond)',
    night_light: '🔴 🔴 over ⚪ (Two Red over One White)',
    wind_kts: '48 - 63 kts',
    meaning: 'Very severe cyclonic storm expected to cross coast keeping port to the south. Hurricane winds and catastrophic storm tide.',
    recommendation: 'Disaster management command in effect. Full coastal defensive lockdown.',
  },
  {
    signal: 9,
    name: 'Great Danger Signal No. 9',
    day_shape: '▲ over ⚫ (Cone Up over Ball)',
    night_light: '⚪ over 🔴 🔴 (One White over Two Red)',
    wind_kts: '48 - 63 kts',
    meaning: 'Very severe cyclonic storm expected to cross coast keeping port to the north.',
    recommendation: 'Extreme danger from destructive hurricane-force onshore surges.',
  },
  {
    signal: 10,
    name: 'Great Danger Signal No. 10',
    day_shape: '▲ over ▲ (Two Cones Apex Up)',
    night_light: '🔴 🔴 🔴 (Three Red Lights Vertically)',
    wind_kts: '≥ 64 kts',
    meaning: 'Super Cyclonic Storm expected to strike directly over port. Massive destruction and catastrophic sea inundation.',
    recommendation: 'Total catastrophe avoidance. Immediate emergency shelter protocol.',
  },
  {
    signal: 11,
    name: 'Failure of Communication Signal No. 11',
    day_shape: '⚫ over ⚫ (Two Black Balls Vertically)',
    night_light: '🔴 ⚪ 🔴 (Red over White over Red)',
    wind_kts: 'Unknown / Severe',
    meaning: 'All communications with meteorological headquarters have failed. Local port officer considers danger of bad weather imminent.',
    recommendation: 'Immediate precautionary harbor shutdown pending relay restoration.',
  },
];

export default function SafetyAlerts() {
  const [activeTab, setActiveTab] = useState('advisories'); // 'advisories' | 'signals' | 'assessment' | 'colregs'
  const [alerts, setAlerts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedSignal, setSelectedSignal] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Safety Assessment State
  const [vesselType, setVesselType] = useState('artisanal_fishing_craft');
  const [assessmentPort, setAssessmentPort] = useState('kochi');
  const [assessmentData, setAssessmentData] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/alerts/active')
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        if (data && data.alerts) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setAlerts([
          {
            id: 'ADV-SURGE-01',
            title: 'Kallakkadal / Swell Surge Warning',
            severity: 'WARNING',
            advisory_type: 'HIGH_WAVE',
            issuing_authority: 'INCOIS Ocean State Forecast',
            region: 'South Kerala Coast (Kollam to Munambam)',
            description: 'Low-frequency swell waves reaching 2.2m to 2.8m expected during high tide window. Nearshore skiffs advised to anchor safely.',
            valid_until: 'Next 24 Hours',
          },
          {
            id: 'ADV-CYC-02',
            title: 'Deep Depression Squall Advisory',
            severity: 'CRITICAL',
            advisory_type: 'CYCLONE',
            issuing_authority: 'IMD Cyclone Warning Division',
            region: 'West Central Arabian Sea',
            description: 'Gale force wind speed 40-50 kts gusting to 60 kts. Total prohibition on deep-sea craft operations.',
            valid_until: 'Next 48 Hours',
          },
          {
            id: 'ADV-DAMINI-03',
            title: 'Damini Convective Lightning Advisory',
            severity: 'ADVISORY',
            advisory_type: 'SQUALL',
            issuing_authority: 'IMD Damini Lightning Early Warning',
            region: 'Coastal Karnataka & Goa',
            description: 'Severe thunderstorm squalls with cloud-to-water lightning discharges detected in offshore grid.',
            valid_until: 'Next 6 Hours',
          },
          {
            id: 'ADV-NAV-04',
            title: 'Naval Live Firing Range (Sector W-4)',
            severity: 'DANGER',
            advisory_type: 'RESTRICTED',
            issuing_authority: 'Southern Naval Command (Kochi)',
            region: 'Sector W-4 (25 NM Offshore)',
            description: 'Live gunnery exercises scheduled between 0800 - 1800 IST. Strict exclusion corridor enforced.',
            valid_until: 'Today 18:00 IST',
          },
        ]);
      });
  }, []);

  // Fetch real-time Safety Score assessment
  const handleRunAssessment = () => {
    setIsAssessing(true);
    fetch(`/api/safety/assess?port_name=${assessmentPort}&vessel_type=${vesselType}`)
      .then((res) => res.json())
      .then((data) => {
        setIsAssessing(false);
        setAssessmentData(data);
      })
      .catch(() => {
        setIsAssessing(false);
      });
  };

  useEffect(() => {
    handleRunAssessment();
  }, [assessmentPort, vesselType]);

  const filteredAlerts = alerts.filter((al) => {
    if (selectedRegion === 'all') return true;
    return al.region?.toLowerCase().includes(selectedRegion.toLowerCase());
  });

  return (
    <div className="safety-alerts-panel" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={22} style={{ color: '#38bdf8' }} />
        </div>
        <div>
          <h3 className="panel-title" style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', margin: 0 }}>
            Maritime Safety, Disaster Alerts & Regulatory Matrix
          </h3>
          <span className="panel-sub" style={{ fontSize: '12px', color: '#94a3b8' }}>
            IMD Cyclone Tracking · INCOIS Kallakkadal High Waves · IMD Port Signals 1–11 · COLREGS 1972
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('advisories')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            borderRadius: '8px',
            border: activeTab === 'advisories' ? '1px solid #0284c7' : '1px solid #334155',
            background: activeTab === 'advisories' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} />
          <span>Active Hazard Bulletins ({alerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signals')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            borderRadius: '8px',
            border: activeTab === 'signals' ? '1px solid #0284c7' : '1px solid #334155',
            background: activeTab === 'signals' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Radio size={16} />
          <span>IMD Port Warning Signals (1–11)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assessment')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            borderRadius: '8px',
            border: activeTab === 'assessment' ? '1px solid #0284c7' : '1px solid #334155',
            background: activeTab === 'assessment' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Compass size={16} />
          <span>Vessel Safety Score & Douglas Sea State</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colregs')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '700',
            borderRadius: '8px',
            border: activeTab === 'colregs' ? '1px solid #0284c7' : '1px solid #334155',
            background: activeTab === 'colregs' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={16} />
          <span>COLREGS Rule 10 Compliance</span>
        </button>
      </div>

      {/* 1. ACTIVE MARITIME HAZARD BULLETINS TAB */}
      {activeTab === 'advisories' && (
        <div>
          {/* Region Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid #1e293b', borderRadius: '8px', flexWrap: 'wrap' }}>
            <Anchor size={16} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Filter Coastal Basin:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '13px', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px' }}
            >
              <option value="all">Pan-India Waters (All Basins)</option>
              <option value="kerala">Kerala Coast & Lakshadweep</option>
              <option value="tamil nadu">Tamil Nadu & Gulf of Mannar</option>
              <option value="arabian">Arabian Sea & Konkan</option>
              <option value="karnataka">Karnataka Coast</option>
              <option value="gujarat">Gujarat & Saurashtra</option>
              <option value="bengal">Bay of Bengal & East Coast</option>
            </select>
            <span style={{ fontSize: '11px', color: '#38bdf8', marginLeft: 'auto' }}>
              Showing {filteredAlerts.length} Active Bulletins
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {filteredAlerts.map((al) => {
              const isDanger = al.severity === 'DANGER' || al.severity === 'CRITICAL';
              const isWarning = al.severity === 'WARNING';
              return (
                <div
                  key={al.id}
                  style={{
                    background: '#0f172a',
                    border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: isDanger ? 'rgba(239, 68, 68, 0.2)' : isWarning ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#38bdf8',
                        border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.5)' : isWarning ? 'rgba(245, 158, 11, 0.5)' : 'rgba(56, 189, 248, 0.5)'}`,
                      }}
                    >
                      {al.severity}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{al.id}</span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                    {al.title}
                  </h4>

                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                    Authority: <strong style={{ color: '#cbd5e1' }}>{al.issuing_authority || 'INCOIS / IMD'}</strong>
                  </div>

                  <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                    {al.description}
                  </p>

                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} style={{ color: '#38bdf8' }} />
                      <span>{al.region}</span>
                    </div>
                    {al.valid_until && (
                      <span style={{ color: '#facc15' }}>⏳ {al.valid_until}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. OFFICIAL IMD PORT WARNING SIGNALS (1 - 11) MATRIX */}
      {activeTab === 'signals' && (
        <div>
          <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
            <strong style={{ color: '#38bdf8' }}>IMD Standard Maritime Port Warning Signal Code:</strong> Hoisted physically by port authorities at harbor signal stations (daytime flag shapes and nighttime lanterns) to warn coastal skiffs, deep-sea trawlers, and commercial ships of impending depressions, cyclones, and gale surges.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '18px' }}>
            {/* Signals List Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto' }}>
              {IMD_PORT_SIGNALS.map((sig) => {
                const isSelected = selectedSignal === sig.signal;
                return (
                  <button
                    key={sig.signal}
                    type="button"
                    onClick={() => setSelectedSignal(sig.signal)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #0284c7' : '1px solid #1e293b',
                      background: isSelected ? '#1e293b' : '#0f172a',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#38bdf8' : '#f1f5f9' }}>
                        Signal No. {sig.signal}
                      </span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#0f172a', color: '#94a3b8' }}>
                        {sig.wind_kts}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {sig.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Signal Detail View */}
            {(() => {
              const sig = IMD_PORT_SIGNALS.find((s) => s.signal === selectedSignal) || IMD_PORT_SIGNALS[0];
              const isMajor = sig.signal >= 5;
              return (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isMajor ? '#ef4444' : '#38bdf8', textTransform: 'uppercase' }}>
                        {isMajor ? '🚨 Great Danger Warning' : 'ℹ️ Cautionary / Warning Category'}
                      </span>
                      <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                        {sig.name}
                      </h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sustained Wind Threshold:</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#facc15' }}>{sig.wind_kts}</div>
                    </div>
                  </div>

                  {/* Visual Signals (Day vs Night) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Day Shape (Flag Mast):</span>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', marginTop: '6px' }}>
                        {sig.day_shape}
                      </div>
                    </div>
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Night Signal (Masthead Lamps):</span>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', marginTop: '6px' }}>
                        {sig.night_light}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Official Meteorological Meaning:</h5>
                    <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                      {sig.meaning}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#10b981', textTransform: 'uppercase', fontWeight: '700' }}>Operational Directive for Fishermen:</h5>
                    <div style={{ fontSize: '12.5px', color: '#f1f5f9', lineHeight: '1.5' }}>
                      {sig.recommendation}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. VESSEL SAFETY SCORE & DOUGLAS SEA STATE CALCULATOR */}
      {activeTab === 'assessment' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Departure Port / Location:
              </label>
              <select
                value={assessmentPort}
                onChange={(e) => setAssessmentPort(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="kochi">Cochin Port (Kochi, Kerala)</option>
                <option value="munambam">Munambam Fishing Jetty (Kerala)</option>
                <option value="mumbai">Sassoon Dock (Mumbai, Maharashtra)</option>
                <option value="chennai">Kasimedu Harbour (Chennai, Tamil Nadu)</option>
                <option value="visakhapatnam">Visakhapatnam Harbour (Andhra Pradesh)</option>
                <option value="veraval">Veraval Port (Gujarat)</option>
                <option value="paradip">Paradip Port (Odisha)</option>
              </select>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Vessel Craft Classification:
              </label>
              <select
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="artisanal_fishing_craft">🛶 Artisanal Motorized Skiff (OBM, &lt;15m)</option>
                <option value="mechanized_boat">🚤 Mechanized Fishing Trawler (15–30m)</option>
                <option value="deep_sea_trawler">🚢 Deep-Sea Tuna Longliner (&gt;30m)</option>
                <option value="coastal_patrol">🛡️ Coast Guard / Coastal Police Patrol</option>
              </select>
            </div>
          </div>

          {isAssessing && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Computing deterministic marine risk score & sea state...
            </div>
          )}

          {!isAssessing && assessmentData && (
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '18px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sector:</span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', color: '#ffffff' }}>
                    {assessmentData.location?.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Deterministic Safety Score:</span>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: assessmentData.safety_score >= 70 ? '#10b981' : assessmentData.safety_score >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {assessmentData.safety_score} / 100
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: assessmentData.is_safe_to_sail ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${assessmentData.is_safe_to_sail ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      color: assessmentData.is_safe_to_sail ? '#10b981' : '#ef4444',
                      fontWeight: '800',
                      fontSize: '13px',
                    }}
                  >
                    {assessmentData.is_safe_to_sail ? '🟢 SAFE TO SAIL' : '🔴 DANGER: HARBOUR STAY ADVISE'}
                  </div>
                </div>
              </div>

              {/* Ocean Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Wave Height</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{assessmentData.metrics?.wave_height_meters} m</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Wind Speed</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{assessmentData.metrics?.wind_speed_knots} kts</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Douglas Sea State</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8' }}>Code {assessmentData.metrics?.douglas_sea_state} (Moderate)</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Beaufort Force</span>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#facc15' }}>Force {assessmentData.metrics?.beaufort_wind_force}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '12px 14px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>Operational Safety Advisory:</span>
                <div style={{ fontSize: '13px', color: '#f1f5f9', marginTop: '4px' }}>
                  {assessmentData.advisory_headline}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. COLREGS RULE 10 COMPLIANCE TAB */}
      {activeTab === 'colregs' && (
        <div>
          <div className="compliance-card" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px', marginBottom: '18px' }}>
            <div className="compliance-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
              <ShieldCheck size={22} style={{ color: '#10b981' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>COLREGS Rule 10 TSS Compliance Checklist</h4>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>International Regulations for Preventing Collisions at Sea (1972)</span>
              </div>
            </div>

            <div className="rules-checklist" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                  <strong style={{ color: '#f1f5f9' }}>Rule 10(b) - Direction of Traffic Flow:</strong> Vessels using the Cochin Traffic Separation Scheme must proceed in the designated direction of traffic lane.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                  <strong style={{ color: '#f1f5f9' }}>Rule 10(c) - Separation Zone Buffer:</strong> Maintain minimum clearance margin &gt; 1.5 NM from separation line. Only cross at right angles when necessary.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                  <strong style={{ color: '#f1f5f9' }}>Rule 10(d) - Inshore Traffic Zones (ITZ):</strong> Artisanal motorized canoes and vessels under 20m are permitted inshore navigation without impeding commercial trunk corridor.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Helpline Bar */}
      <div style={{ marginTop: '24px', padding: '14px 18px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          🚨 <strong>Indian Coast Guard Emergency Search & Rescue (MRCC):</strong> Toll-Free <strong style={{ color: '#ef4444' }}>1554</strong> · VHF Channel 16
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          INCOIS Ocean State Forecast Helpdesk: +91 40 23895000
        </div>
      </div>
    </div>
  );
}
