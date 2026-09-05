/**
 * ORCA Forecast Telemetry Charts Engine (Interactive SVG & Canvas)
 */

function renderForecastChart(containerId, timeline) {
  const container = document.getElementById(containerId);
  if (!container || !timeline || timeline.length === 0) return;

  const width = 380;
  const height = 110;
  const padding = { top: 15, right: 15, bottom: 20, left: 30 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Extract wave heights and wind speeds
  const maxWave = Math.max(3.0, ...timeline.map(d => d.wave_height_m));
  const maxWind = Math.max(30.0, ...timeline.map(d => d.wind_speed_kts));

  // Generate SVG Points
  const wavePoints = timeline.map((d, i) => {
    const x = padding.left + (i / (timeline.length - 1)) * plotW;
    const y = padding.top + plotH - (d.wave_height_m / maxWave) * plotH;
    return `${x},${y}`;
  }).join(' ');

  const windPoints = timeline.map((d, i) => {
    const x = padding.left + (i / (timeline.length - 1)) * plotW;
    const y = padding.top + plotH - (d.wind_speed_kts / maxWind) * plotH;
    return `${x},${y}`;
  }).join(' ');

  // Danger threshold line (Wave = 2.0m)
  const dangerY = padding.top + plotH - (2.0 / maxWave) * plotH;

  const svg = `
    <div style="background:rgba(6,14,24,0.7); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:10px; margin-top:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px; font-weight:700;">
        <span style="color:#00e5ff;"> 24-Hour Wave & Wind Forecast</span>
        <span style="color:#aaa;"><span style="color:#00e5ff;">■</span> Wave (m) &nbsp;<span style="color:#ffb703;">■</span> Wind (kts)</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;">
        <!-- Grid & Threshold Line -->
        <line x1="${padding.left}" y1="${dangerY}" x2="${width - padding.right}" y2="${dangerY}" stroke="#ff3366" stroke-dasharray="3 3" stroke-width="1" opacity="0.6"/>
        <text x="${width - padding.right - 2}" y="${dangerY - 3}" fill="#ff3366" font-size="9" text-anchor="end">2.0m Safety Limit</text>
        
        <!-- Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        
        <!-- Y-Axis Labels -->
        <text x="${padding.left - 5}" y="${padding.top + 5}" fill="#64748b" font-size="8" text-anchor="end">${maxWave.toFixed(1)}m</text>
        <text x="${padding.left - 5}" y="${height - padding.bottom}" fill="#64748b" font-size="8" text-anchor="end">0m</text>

        <!-- Wave Line -->
        <polyline points="${wavePoints}" fill="none" stroke="#00e5ff" stroke-width="2"/>
        
        <!-- Wind Line -->
        <polyline points="${windPoints}" fill="none" stroke="#ffb703" stroke-width="1.5" stroke-dasharray="4 2"/>

        <!-- Time Ticks -->
        <text x="${padding.left}" y="${height - 5}" fill="#64748b" font-size="8">Now</text>
        <text x="${padding.left + plotW * 0.5}" y="${height - 5}" fill="#64748b" font-size="8" text-anchor="middle">+12h</text>
        <text x="${width - padding.right}" y="${height - 5}" fill="#64748b" font-size="8" text-anchor="end">+24h</text>
      </svg>
    </div>
  `;

  container.innerHTML = svg;
}

window.renderForecastChart = renderForecastChart;
