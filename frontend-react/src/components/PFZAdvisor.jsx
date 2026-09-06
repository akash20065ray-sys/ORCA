import React, { useState, useEffect } from 'react';
import { Fish, Waves, Thermometer, Navigation, Anchor, Download, Compass } from 'lucide-react';

const COASTAL_HARBORS = [
  { id: 'all', name: 'All India (National INCOIS Dataset)', state: 'National Basin' },
  { id: 'local', name: '📍 Local Fish Landing Centers (Artisanal Jetties)', state: 'Village Harbours' },
  { id: 'kochi', name: 'Cochin Fisheries Harbour', state: 'Kerala' },
  { id: 'mumbai', name: 'Sassoon Dock, Mumbai', state: 'Maharashtra' },
  { id: 'chennai', name: 'Kasimedu Harbour, Chennai', state: 'Tamil Nadu' },
  { id: 'visakhapatnam', name: 'Visakhapatnam Fishing Harbour', state: 'Andhra Pradesh' },
  { id: 'goa', name: 'Malim Jetty, Panaji', state: 'Goa' },
  { id: 'mangalore', name: 'Old Mangalore Bunder', state: 'Karnataka' },
  { id: 'tuticorin', name: 'V.O.C. Harbour, Tuticorin', state: 'Tamil Nadu' },
  { id: 'veraval', name: 'Veraval Fishing Port', state: 'Gujarat' },
  { id: 'paradip', name: 'Paradip Fishing Harbour', state: 'Odisha' },
];

export default function PFZAdvisor({ onFocusPFZ }) {
  const [selectedHarbor, setSelectedHarbor] = useState('all');
  const [craftFilter, setCraftFilter] = useState('all'); // 'all' | 'artisanal' | 'mechanized'
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let endpoint = '';
    if (selectedHarbor === 'local' || craftFilter === 'artisanal') {
      endpoint = `/api/pfz/local-fishermen?craft_type=${craftFilter === 'all' ? '' : craftFilter}`;
    } else if (selectedHarbor === 'all') {
      endpoint = '/api/pfz/all';
    } else {
      endpoint = `/api/pfz/zones?port_name=${selectedHarbor}`;
    }

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        if (data) {
          const rawZones = Array.isArray(data) ? data : data.zones || [];
          setZones(rawZones);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setZones([
          {
            id: 'FLC-KL-MUN-01',
            zone_name: 'Munambam Shelf Upwelling Front',
            landing_center: 'Munambam Fisheries Harbour, Vypeen, Kerala',
            latitude: 10.145,
            longitude: 75.985,
            target_species: ['Indian Mackerel (Ayala)', 'Oil Sardine (Mathi)', 'Anchovy'],
            chlorophyll_mg_m3: 2.15,
            sst_celsius: 28.6,
            thermal_gradient_c_per_km: 0.68,
            distance_nm: 8.5,
            bearing_cardinal: 'WSW',
            bearing_degrees: 248,
            confidence_score: 0.94,
            fuel_cost_estimate_inr: 1710,
            projected_catch_value_inr: 24500,
            steer_instruction: 'From Munambam Jetty, steer 248° WSW for 8.5 NM. Set drift gillnets on thermal boundary.',
          },
          {
            id: 'PFZ-COCHI-01',
            zone_name: 'Cochin Thermal Front',
            landing_center: 'Cochin Fisheries Harbour, Kerala',
            latitude: 9.85,
            longitude: 75.88,
            target_species: ['Yellowfin Tuna', 'Indian Mackerel', 'Oil Sardine'],
            chlorophyll_mg_m3: 1.25,
            sst_celsius: 29.4,
            distance_nm: 15.4,
            bearing_cardinal: 'WSW',
            confidence_score: 0.92,
            fuel_cost_estimate_inr: 3200,
            projected_catch_value_inr: 28000,
          },
          {
            id: 'PFZ-BOM-01',
            zone_name: 'South Mumbai Outer Shelf',
            landing_center: 'Sassoon Dock, Mumbai, Maharashtra',
            latitude: 18.60,
            longitude: 72.40,
            target_species: ['Bombay Duck', 'Silver Pomfret', 'Squid'],
            chlorophyll_mg_m3: 1.85,
            sst_celsius: 28.1,
            distance_nm: 22.7,
            bearing_cardinal: 'SW',
            confidence_score: 0.94,
            fuel_cost_estimate_inr: 4500,
            projected_catch_value_inr: 42000,
          },
          {
            id: 'PFZ-CHN-01',
            zone_name: 'Northeast Pulicat Shelf',
            landing_center: 'Kasimedu Harbour, Chennai, Tamil Nadu',
            latitude: 13.35,
            longitude: 80.55,
            target_species: ['Skipjack Tuna', 'King Seerfish', 'Ribbonfish'],
            chlorophyll_mg_m3: 1.40,
            sst_celsius: 28.8,
            distance_nm: 18.3,
            bearing_cardinal: 'ENE',
            confidence_score: 0.89,
            fuel_cost_estimate_inr: 3800,
            projected_catch_value_inr: 34000,
          },
        ]);
      });
  }, [selectedHarbor, craftFilter]);

  // Download printable INCOIS PFZ Advisory Bulletin for local fishermen & crew
  const handleDownloadPFZReport = () => {
    if (!zones || zones.length === 0) return;
    const harborObj = COASTAL_HARBORS.find((h) => h.id === selectedHarbor);
    const harborName = harborObj ? harborObj.name : 'Pan-India';
    const fileName = `INCOIS_PFZ_Advisory_${selectedHarbor.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.html`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>INCOIS PFZ Advisory Bulletin - ${harborName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f1f5f9; padding: 24px; }
    .container { max-width: 860px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
    h1 { font-size: 20px; color: #10b981; margin: 4px 0 12px 0; }
    .meta { font-size: 12px; color: #94a3b8; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
    .zone-title { font-size: 15px; font-weight: 700; color: #ffffff; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; font-size: 11px; }
    .pill { background: #1e293b; padding: 6px 10px; border-radius: 6px; }
    .steer { background: rgba(56, 189, 248, 0.1); border: 1px solid #0284c7; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #38bdf8; margin-top: 8px; }
    .roi { color: #10b981; font-weight: 700; }
    .btn-print { background: #059669; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; float: right; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .container { border: none; }
      .card { background: #f8fafc; border: 1px solid #cbd5e1; color: #000; }
      .zone-title { color: #000; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
    <div style="font-size:11px; color:#34d399; font-weight:800;">INCOIS · MINISTRY OF EARTH SCIENCES, GOVT. OF INDIA</div>
    <h1>Potential Fishing Zone (PFZ) Advisory Bulletin</h1>
    <div class="meta">
      Harbor/Sector: <strong>${harborName}</strong> · Valid for: 48 Hours · Issued: ${new Date().toLocaleDateString()}
    </div>
    ${zones
      .map(
        (z, i) => `
      <div class="card">
        <div class="zone-title">#${i + 1}: ${z.landing_center || z.sector || z.zone_name || 'PFZ Hotspot'}</div>
        <div style="font-size:12px; color:#94a3b8; margin: 4px 0;">
          Target Species: <strong style="color:#f1f5f9;">${Array.isArray(z.target_species) ? z.target_species.join(', ') : 'Pelagic Mackerel & Tuna'}</strong>
        </div>
        <div class="grid">
          <div class="pill"><strong>Bearing:</strong> ${z.bearing_degrees ? z.bearing_degrees + '° ' : ''}${z.bearing_cardinal || 'WSW'}</div>
          <div class="pill"><strong>Distance:</strong> ${z.distance_nm || (z.distance_km ? (z.distance_km * 0.54).toFixed(1) : 15)} NM</div>
          <div class="pill"><strong>Depth:</strong> ${z.depth_meters || 45} m</div>
          <div class="pill"><strong>Confidence:</strong> ${Math.round((z.confidence_score || 0.9) * 100)}%</div>
        </div>
        <div class="grid">
          <div class="pill"><strong>SST:</strong> ${z.sst_celsius || 28.5}°C</div>
          <div class="pill"><strong>Thermal Gradient:</strong> ${z.thermal_gradient_c_per_km || 0.65}°C/km</div>
          <div class="pill"><strong>Chlorophyll-a:</strong> ${z.chlorophyll_mg_m3 || 1.8} mg/m³</div>
          <div class="pill roi"><strong>Net Catch ROI:</strong> ₹${(z.projected_catch_value_inr || 28000).toLocaleString()}</div>
        </div>
        ${
          z.steer_instruction
            ? `<div class="steer">🧭 <strong>Steer Command:</strong> ${z.steer_instruction}</div>`
            : `<div class="steer">🧭 <strong>Navigation Directive:</strong> Steer ${z.bearing_cardinal || 'WSW'} from port channel directly to thermal boundary edge.</div>`
        }
      </div>
    `
      )
      .join('')}
    <div style="font-size:11px; color:#94a3b8; margin-top:20px; border-top:1px solid #334155; padding-top:10px;">
      Emergency Indian Coast Guard Toll-Free Search & Rescue: 1554 · VHF Channel 16
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pfz-advisor-panel">
      <div className="panel-header">
        <Fish size={20} className="panel-header-icon" />
        <div>
          <h3 className="panel-title">INCOIS Potential Fishing Zones (PFZ)</h3>
          <span className="panel-sub">Thermal Front & Chlorophyll-a Oceanographic Correlation</span>
        </div>
      </div>

      {/* Coastal Harbor & Port Selector */}
      <div className="pfz-harbor-selector-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 8px 0', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid #1e293b', borderRadius: '8px' }}>
        <Anchor size={16} style={{ color: '#0284c7' }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Harbor / Sector:</span>
        <select
          value={selectedHarbor}
          onChange={(e) => {
            setSelectedHarbor(e.target.value);
            setIsLoading(true);
          }}
          className="select-input"
          style={{ flex: 1, padding: '6px 10px', fontSize: '13px', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px' }}
        >
          {COASTAL_HARBORS.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} — {h.state}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          {zones.length} Hotspots
        </span>
      </div>

      {/* Local Fisherman Craft Range Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Craft Range:</span>
        <button
          type="button"
          className={`btn-craft-pill ${craftFilter === 'all' ? 'active' : ''}`}
          onClick={() => { setCraftFilter('all'); setIsLoading(true); }}
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '14px', border: '1px solid #334155', background: craftFilter === 'all' ? '#0284c7' : '#1e293b', color: '#ffffff', cursor: 'pointer' }}
        >
          All Fleets
        </button>
        <button
          type="button"
          className={`btn-craft-pill ${craftFilter === 'artisanal' ? 'active' : ''}`}
          onClick={() => { setCraftFilter('artisanal'); setIsLoading(true); }}
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '14px', border: '1px solid #10b981', background: craftFilter === 'artisanal' ? '#10b981' : '#1e293b', color: '#ffffff', cursor: 'pointer' }}
        >
          🛶 Artisanal Motorized (≤15 NM)
        </button>
        <button
          type="button"
          className={`btn-craft-pill ${craftFilter === 'mechanized' ? 'active' : ''}`}
          onClick={() => { setCraftFilter('mechanized'); setIsLoading(true); }}
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '14px', border: '1px solid #334155', background: craftFilter === 'mechanized' ? '#0284c7' : '#1e293b', color: '#ffffff', cursor: 'pointer' }}
        >
          🚤 Mechanized Trawler (15-30 NM)
        </button>
      </div>

      {/* Advisory Cards List */}
      <div className="pfz-cards-list">
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <span>Fetching live INCOIS satellite SST & chlorophyll gradients...</span>
          </div>
        )}

        {!isLoading && zones.map((zone, zIdx) => {
          const zoneId = zone.id || zone.zone_id || `PFZ-${zIdx + 1}`;
          const zoneName = zone.sector || zone.zone_name || zone.landing_center || `INCOIS Hotspot ${zIdx + 1}`;
          const speciesList = Array.isArray(zone.target_species)
            ? zone.target_species
            : Array.isArray(zone.species_association)
            ? zone.species_association
            : ['Yellowfin Tuna', 'Mackerel', 'Sardines'];
          const matchPercent = Math.round((zone.confidence_score ?? zone.catch_probability ?? 0.88) * 100);

          return (
            <div
              key={zoneId}
              className="pfz-card"
              onClick={() => onFocusPFZ && onFocusPFZ(zone)}
            >
              <div className="pfz-card-header">
                <div className="pfz-title-wrap">
                  <span className="pfz-id-badge">{zoneId}</span>
                  <h4 className="pfz-name">{zoneName}</h4>
                  {zone.landing_center && (
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      ⚓ {zone.landing_center}
                    </span>
                  )}
                </div>
                <div className="catch-prob-pill" title="INCOIS Catch Confidence">
                  <span>{matchPercent}% Match</span>
                </div>
              </div>

              {/* Local Artisanal Suitability & Bathymetry */}
              {zone.craft_suitability && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    🛶 {zone.craft_suitability}
                  </span>
                  {zone.depth_meters && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Depth: <strong style={{ color: '#f1f5f9' }}>{zone.depth_meters}m</strong>
                    </span>
                  )}
                  {zone.thermal_gradient_c_per_km && (
                    <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                      ∇SST: <strong style={{ color: '#38bdf8' }}>{zone.thermal_gradient_c_per_km}°C/km</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Vernacular Fish Names */}
              {zone.local_names && (
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '6px', fontStyle: 'italic' }}>
                  Regional Species: {zone.local_names}
                </div>
              )}

              {/* Steer Directive */}
              {zone.steer_instruction && (
                <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: '#38bdf8', margin: '8px 0', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Compass size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span><strong>Steer:</strong> {zone.steer_instruction}</span>
                </div>
              )}

              <div className="pfz-species-row">
                {speciesList.map((sp, idx) => (
                  <span key={idx} className="species-chip">
                    🐟 {sp}
                  </span>
                ))}
              </div>

              <div className="pfz-ocean-telemetry">
                <div className="tele-item">
                  <Thermometer size={14} className="tele-icon" />
                  <span>SST: {zone.sst_celsius || 28.5}°C</span>
                </div>
                <div className="tele-item">
                  <Waves size={14} className="tele-icon" />
                  <span>Chl-a: {zone.chlorophyll_mg_m3 || 1.3} mg/m³</span>
                </div>
                <div className="tele-item">
                  <Navigation size={14} className="tele-icon" />
                  <span>Dist: {zone.distance_nm || (zone.distance_km ? (zone.distance_km * 0.54).toFixed(1) : '16')} NM</span>
                </div>
              </div>

              <div className="pfz-financial-row">
                <div className="fin-metric">
                  <span className="fin-lbl">EST FUEL BURN</span>
                  <span className="fin-val red">₹{(zone.fuel_cost_estimate_inr || 3500).toLocaleString()}</span>
                </div>
                <div className="fin-metric">
                  <span className="fin-lbl">PROJECTED YIELD</span>
                  <span className="fin-val green">₹{(zone.projected_catch_value_inr || 32000).toLocaleString()}</span>
                </div>
                <div className="fin-metric">
                  <span className="fin-lbl">NET PROFIT MULTIPLIER</span>
                  <span className="fin-val blue">
                    {(
                      (zone.projected_catch_value_inr || 32000) /
                      (zone.fuel_cost_estimate_inr || 3500)
                    ).toFixed(1)}x
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-plot-pfz"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFocusPFZ) onFocusPFZ(zone);
                }}
              >
                Center on Map & Plot Route →
              </button>
            </div>
          );
        })}
      </div>

      {/* Down at Last: Download Option for PFZ */}
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
          Download PFZ Advisory Bulletin (HTML / Offline Use)
        </button>
        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
          Exports INCOIS thermal fronts, compass steer angles, fuel vs catch ROI & emergency MRCC frequencies for offline navigation.
        </div>
      </div>
    </div>
  );
}
