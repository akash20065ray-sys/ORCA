import React from 'react';
import { Play, Pause, FastForward, Sliders, Wind, Waves, Compass, Thermometer, Leaf } from 'lucide-react';

export default function WindyToolrail({
  activeMode,
  setActiveMode,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  density,
  onDensityChange,
}) {
  return (
    <div className="windy-toolrail">
      {/* Mode Selector Buttons */}
      <div className="toolrail-modes">
        {[
          { id: 'wind', icon: Wind, label: 'Wind' },
          { id: 'waves', icon: Waves, label: 'Waves' },
          { id: 'currents', icon: Compass, label: 'Currents' },
          { id: 'sst', icon: Thermometer, label: 'SST' },
          { id: 'chlorophyll', icon: Leaf, label: 'Chl-a' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              className={`toolrail-btn ${activeMode === m.id ? 'active' : ''}`}
              onClick={() => setActiveMode(activeMode === m.id ? null : m.id)}
              title={`${m.label} Marine Telemetry`}
            >
              <Icon size={16} />
              <span className="btn-text">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="toolrail-divider" />

      {/* Play / Pause Toggle */}
      <button
        className="toolrail-icon-btn"
        onClick={onTogglePlay}
        title={isPlaying ? 'Pause Animation' : 'Resume Animation'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Speed Slider */}
      <div className="toolrail-control" title={`Particle Flow Speed: ${speed}x`}>
        <FastForward size={14} className="control-icon" />
        <input
          type="range"
          min="0.3"
          max="2.5"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="slider-input"
        />
        <span className="control-val">{speed}x</span>
      </div>

      {/* Density Slider */}
      <div className="toolrail-control" title={`Particle Density: ${density} particles`}>
        <Sliders size={14} className="control-icon" />
        <input
          type="range"
          min="1500"
          max="5000"
          step="500"
          value={density}
          onChange={(e) => onDensityChange(parseInt(e.target.value))}
          className="slider-input"
        />
        <span className="control-val">{density / 1000}k</span>
      </div>
    </div>
  );
}
