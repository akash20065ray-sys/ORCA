/**
 * ORCA Multi-Agent Execution UI & Structured Component Renderer
 * SIH26176 — 8-Agent Collaborative Reasoning Trace
 */

function getAgentIcon(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('planning')) return '🧠';
  if (t.includes('retrieval') || t.includes('data')) return '📡';
  if (t.includes('analytics') || t.includes('ocean')) return '🌡️';
  if (t.includes('weather')) return '💨';
  if (t.includes('alert') || t.includes('notification')) return '⚡';
  if (t.includes('risk')) return '🛡️';
  if (t.includes('geospatial') || t.includes('route')) return '🧭';
  if (t.includes('synthesis') || t.includes('response')) return '📑';
  return '🤖';
}

function buildAgentStepperHtml(traceSteps, totalDurationMs) {
  if (!traceSteps || traceSteps.length === 0) return '';

  let stepsHtml = '';
  traceSteps.forEach((step) => {
    const icon = getAgentIcon(step.agent_title);
    stepsHtml += `
      <div class="step-item">
        <div class="step-name">
          <span>${icon}</span>
          <span style="font-weight:600;">${step.agent_title}</span>
        </div>
        <span class="step-duration">${step.duration_ms} ms</span>
      </div>
    `;
  });

  return `
    <div class="agent-stepper">
      <div class="agent-stepper-header">
        <span>⚡ 8-Agent Collaborative Execution Trace</span>
        <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--brand-primary);">${totalDurationMs} ms total</span>
      </div>
      <div class="stepper-steps-list">
        ${stepsHtml}
      </div>
    </div>
  `;
}

function buildRiskBannerHtml(risk) {
  if (!risk) return '';
  const level = (risk.overall_risk || 'LOW').toLowerCase();
  let cssClass = 'low';
  if (level.includes('moderate')) cssClass = 'moderate';
  else if (level.includes('high') || level.includes('critical')) cssClass = 'high';

  return `
    <div class="risk-banner ${cssClass}">
      <div class="risk-title-block">
        <span class="risk-level-tag">${risk.overall_risk} RISK</span>
        <span class="risk-subtext">${risk.is_safe_to_sail ? 'Safe to navigate with standard precautions' : 'High sea danger — departure not recommended'}</span>
      </div>
      <div class="risk-score-badge">${risk.risk_score}/100</div>
    </div>
  `;
}

function buildTelemetryGridHtml(telemetry) {
  if (!telemetry) return '';

  return `
    <div class="telemetry-grid">
      <div class="telemetry-cell">
        <div class="label">Significant Wave</div>
        <div class="value">${telemetry.wave_height_meters !== null && telemetry.wave_height_meters !== undefined ? telemetry.wave_height_meters + ' m' : '--'}</div>
      </div>
      <div class="telemetry-cell">
        <div class="label">Wind Speed</div>
        <div class="value">${telemetry.wind_speed_knots !== null && telemetry.wind_speed_knots !== undefined ? telemetry.wind_speed_knots + ' kts' : '--'}</div>
      </div>
      <div class="telemetry-cell">
        <div class="label">SST</div>
        <div class="value">${telemetry.sst_celsius !== null && telemetry.sst_celsius !== undefined ? telemetry.sst_celsius + ' °C' : '--'}</div>
      </div>
      <div class="telemetry-cell">
        <div class="label">Swell Height</div>
        <div class="value">${telemetry.swell_wave_height_meters !== null && telemetry.swell_wave_height_meters !== undefined ? telemetry.swell_wave_height_meters + ' m' : '--'}</div>
      </div>
      <div class="telemetry-cell">
        <div class="label">Wind Gusts</div>
        <div class="value">${telemetry.wind_gusts_knots !== null && telemetry.wind_gusts_knots !== undefined ? telemetry.wind_gusts_knots + ' kts' : '--'}</div>
      </div>
      <div class="telemetry-cell">
        <div class="label">Chlorophyll-a</div>
        <div class="value">${telemetry.chlorophyll_mg_m3 !== null && telemetry.chlorophyll_mg_m3 !== undefined ? telemetry.chlorophyll_mg_m3 + ' mg/m³' : '--'}</div>
      </div>
    </div>
  `;
}

function buildEvidenceDrawerHtml(citations, cardId) {
  if (!citations || citations.length === 0) return '';

  let listHtml = '';
  citations.forEach(c => {
    const fClass = (c.freshness || 'REAL_TIME').toLowerCase();
    listHtml += `
      <div class="citation-card">
        <div class="citation-title">📡 ${c.source_name} (${c.dataset_name})</div>
        <div class="citation-details">
          <b>Parameters:</b> ${c.parameter}<br>
          <b>Timestamp:</b> ${c.timestamp} &nbsp;|&nbsp; <b>Quality:</b> ${c.quality}<br>
          <b>Latency:</b> ${c.latency_note}
        </div>
        <span class="freshness-badge ${fClass}">● ${c.freshness.replace('_', ' ')}</span>
      </div>
    `;
  });

  return `
    <div class="evidence-drawer">
      <div class="evidence-header" onclick="toggleEvidence('${cardId}')">
        <span>📑 Data Provenance & Citations (${citations.length} sources)</span>
        <span id="arrow-${cardId}">▼</span>
      </div>
      <div id="content-${cardId}" class="evidence-content" style="display:none;">
        ${listHtml}
      </div>
    </div>
  `;
}

function toggleEvidence(cardId) {
  const el = document.getElementById(`content-${cardId}`);
  const arrow = document.getElementById(`arrow-${cardId}`);
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'flex';
    if (arrow) arrow.innerText = '▲';
  } else {
    el.style.display = 'none';
    if (arrow) arrow.innerText = '▼';
  }
}

window.buildAgentStepperHtml = buildAgentStepperHtml;
window.buildRiskBannerHtml = buildRiskBannerHtml;
window.buildTelemetryGridHtml = buildTelemetryGridHtml;
window.buildEvidenceDrawerHtml = buildEvidenceDrawerHtml;
window.toggleEvidence = toggleEvidence;
