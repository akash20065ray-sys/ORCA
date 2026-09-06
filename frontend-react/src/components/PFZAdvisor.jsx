import React, { useState, useEffect } from 'react';
import { Fish, Waves, Thermometer, Navigation } from 'lucide-react';

export default function PFZAdvisor({ onFocusPFZ }) {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    fetch('/api/pfz/zones?port_name=kochi')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data)) {
          setZones(data);
        }
      })
      .catch(() => {
        // Mock fallback
        setZones([
          {
            id: 'PFZ-KL-01',
            zone_name: 'Chellanam Thermal Front',
            latitude: 9.782,
            longitude: 76.124,
            species_association: ['Yellowfin Tuna', 'Skipjack Tuna'],
            chlorophyll_mg_m3: 1.85,
            sst_celsius: 28.4,
            distance_nm: 14.2,
            bearing_cardinal: 'WSW',
            confidence_score: 0.88,
            fuel_cost_estimate_inr: 3200,
            projected_catch_value_inr: 28000,
            valid_until: 'Today, 23:59 IST',
          },
          {
            id: 'PFZ-KL-02',
            zone_name: 'Munambam Shelf Edge',
            latitude: 10.154,
            longitude: 75.982,
            species_association: ['Indian Mackerel', 'Oil Sardine'],
            chlorophyll_mg_m3: 2.45,
            sst_celsius: 27.9,
            distance_nm: 22.8,
            bearing_cardinal: 'NW',
            confidence_score: 0.92,
            fuel_cost_estimate_inr: 4800,
            projected_catch_value_inr: 42000,
            valid_until: 'Today, 23:59 IST',
          },
        ]);
      });
  }, []);

  return (
    <div className="pfz-advisor-panel">
      <div className="panel-header">
        <Fish size={20} className="panel-header-icon" />
        <div>
          <h3 className="panel-title">INCOIS Potential Fishing Zones (PFZ)</h3>
          <span className="panel-sub">Thermal Front & Chlorophyll-a Oceanographic Correlation</span>
        </div>
      </div>

      {/* Advisory Cards List */}
      <div className="pfz-cards-list">
        {zones.map((zone, zIdx) => {
          const zoneId = zone.id || zone.zone_id || `PFZ-${zIdx + 1}`;
          const speciesList = Array.isArray(zone.species_association)
            ? zone.species_association
            : Array.isArray(zone.target_species)
            ? zone.target_species
            : [zone.target_species || 'Pelagic Fish'];
          const matchPercent = Math.round((zone.confidence_score ?? zone.catch_probability ?? 0.85) * 100);

          return (
            <div
              key={zoneId}
              className="pfz-card"
              onClick={() => onFocusPFZ && onFocusPFZ(zone)}
            >
              <div className="pfz-card-header">
                <div className="pfz-title-wrap">
                  <span className="pfz-id-badge">{zoneId}</span>
                  <h4 className="pfz-name">{zone.zone_name}</h4>
                </div>
                <div className="catch-prob-pill" title="INCOIS Catch Confidence">
                  <span>{matchPercent}% Match</span>
                </div>
              </div>

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
                  <span>SST: {zone.sst_celsius || 28.2}°C</span>
                </div>
                <div className="tele-item">
                  <Waves size={14} className="tele-icon" />
                  <span>Chl-a: {zone.chlorophyll_mg_m3 || 1.8} mg/m³</span>
                </div>
              <div className="tele-item">
                <Navigation size={14} className="tele-icon" />
                <span>Dist: {zone.distance_nm || 18.5} NM</span>
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
    </div>
  );
}
