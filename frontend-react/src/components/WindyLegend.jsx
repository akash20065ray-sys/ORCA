import React, { useState } from 'react';
import {
  WINDY_COLOR_RAMP,
  WAVE_COLOR_RAMP,
  SST_COLOR_RAMP,
  CHL_COLOR_RAMP,
  CURRENT_COLOR_RAMP,
} from '../engine/WindyCanvasEngine';

export default function WindyLegend({ activeMode, hoverTelemetry }) {
  const [unitWind, setUnitWind] = useState('kt'); // kt, km/h, m/s
  const [unitWave, setUnitWave] = useState('m'); // m, ft
  const [unitSst, setUnitSst] = useState('°C'); // °C, °F

  if (!activeMode) return null;

  let ramp = WINDY_COLOR_RAMP;
  let title = 'WIND SPEED';
  let activeUnit = unitWind;

  if (activeMode === 'waves') {
    ramp = WAVE_COLOR_RAMP;
    title = 'WAVE SWELL';
    activeUnit = unitWave;
  } else if (activeMode === 'sst') {
    ramp = SST_COLOR_RAMP;
    title = 'SEA SURFACE TEMPERATURE (THERMAL)';
    activeUnit = unitSst;
  } else if (activeMode === 'chlorophyll') {
    ramp = CHL_COLOR_RAMP;
    title = 'CHLOROPHYLL-A BIOMASS (ISRO OCM)';
    activeUnit = 'mg/m³';
  } else if (activeMode === 'currents') {
    ramp = CURRENT_COLOR_RAMP;
    title = 'SURFACE OCEAN CURRENT';
    activeUnit = unitWind;
  }

  const cycleUnit = () => {
    if (activeMode === 'wind' || activeMode === 'currents') {
      const units = ['kt', 'km/h', 'm/s'];
      const next = units[(units.indexOf(unitWind) + 1) % units.length];
      setUnitWind(next);
    } else if (activeMode === 'waves') {
      setUnitWave(unitWave === 'm' ? 'ft' : 'm');
    } else if (activeMode === 'sst') {
      setUnitSst(unitSst === '°C' ? '°F' : '°C');
    }
  };

  const formatValue = (val) => {
    if (val === undefined || val === null) return '--';
    if (activeMode === 'wind' || activeMode === 'currents') {
      if (unitWind === 'km/h') return (val * 1.852).toFixed(1);
      if (unitWind === 'm/s') return (val * 0.5144).toFixed(1);
      return val.toFixed(1);
    }
    if (activeMode === 'waves') {
      if (unitWave === 'ft') return (val * 3.2808).toFixed(1);
      return val.toFixed(1);
    }
    if (activeMode === 'sst') {
      if (unitSst === '°F') return ((val * 9) / 5 + 32).toFixed(1);
      return val.toFixed(1);
    }
    if (activeMode === 'chlorophyll') {
      return Number(val).toFixed(2);
    }
    return val;
  };

  // Calculate needle position percentage based on hover value
  let needlePercent = 50;
  if (hoverTelemetry && hoverTelemetry.value !== undefined) {
    const minVal = ramp[0].val;
    const maxVal = ramp[ramp.length - 1].val;
    needlePercent = Math.max(0, Math.min(100, ((hoverTelemetry.value - minVal) / (maxVal - minVal)) * 100));
  }

  return (
    <div className="windy-bottom-legend">
      <div className="legend-header">
        <div className="legend-title-wrap">
          <span className="legend-title">{title}</span>
          {activeMode !== 'chlorophyll' && (
            <button className="unit-pill-btn" onClick={cycleUnit} title="Click to cycle units">
              {activeUnit} ▾
            </button>
          )}
          {activeMode === 'chlorophyll' && (
            <span className="unit-static-pill">mg/m³</span>
          )}
        </div>

        {hoverTelemetry && (
          <div className="legend-telemetry-readout">
            <span className="telemetry-coord">
              Latitude: {hoverTelemetry.lat.toFixed(4)}°, Longitude: {hoverTelemetry.lon.toFixed(4)}°:
            </span>
            {hoverTelemetry.isLand && activeMode !== 'wind' ? (
              <span className="telemetry-val land" style={{ color: '#94a3b8' }}>Landmass (No Marine Data)</span>
            ) : (
              <>
                <span className="telemetry-val">
                  {formatValue(hoverTelemetry.value)} {activeUnit}
                </span>
                {activeMode === 'wind' && (
                  <span className="telemetry-dir">({hoverTelemetry.windDir}°)</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Color Scale Bar */}
      <div className="legend-bar-container">
        <div className="legend-gradient-bar">
          {ramp.map((step, idx) => (
            <div
              key={idx}
              className="gradient-segment"
              style={{ backgroundColor: step.color }}
            />
          ))}
        </div>

        {/* Hover Needle Indicator (only if over water or wind layer) */}
        {hoverTelemetry && (!hoverTelemetry.isLand || activeMode === 'wind') && hoverTelemetry.value !== null && hoverTelemetry.value !== undefined && (
          <div
            className="legend-needle"
            style={{ left: `${needlePercent}%` }}
            title={`${formatValue(hoverTelemetry.value)} ${activeUnit}`}
          >
            <div className="needle-pointer" />
          </div>
        )}

        {/* Scale Labels */}
        <div className="legend-labels">
          {ramp.map((step, idx) => (
            <span key={idx} className="scale-label">
              {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
