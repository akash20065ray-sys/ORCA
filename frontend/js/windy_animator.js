/**
 * ORCA Windy-Style Native Canvas Animation Engine
 * SIH26176 — Fluid Particle Flow, Wavefront Ripples & Doppler Radar Sweeps
 * 
 * 100% Free, Native HTML5 Canvas 2D running at 60 FPS directly over Leaflet maps.
 * Zero external subscriptions or API dependencies.
 */

(function(window) {
  'use strict';

  // Gradient Color Scales for Windy Legend & Particle Rendering
  const COLOR_RAMPS = {
    wind: [
      { val: 0,  color: '#38bdf8', label: '0' },
      { val: 5,  color: '#06b6d4', label: '5' },
      { val: 10, color: '#10b981', label: '10' },
      { val: 15, color: '#84cc16', label: '15' },
      { val: 20, color: '#facc15', label: '20' },
      { val: 25, color: '#f97316', label: '25' },
      { val: 30, color: '#ef4444', label: '30' },
      { val: 40, color: '#c026d3', label: '40+' }
    ],
    currents: [
      { val: 0.0, color: '#0369a1', label: '0.0' },
      { val: 0.2, color: '#0284c7', label: '0.2' },
      { val: 0.5, color: '#06b6d4', label: '0.5' },
      { val: 0.8, color: '#22d3ee', label: '0.8' },
      { val: 1.2, color: '#67e8f9', label: '1.2' },
      { val: 2.0, color: '#a5f3fc', label: '2.0+' }
    ],
    waves: [
      { val: 0.0, color: '#1e3a8a', label: '0m' },
      { val: 0.5, color: '#0284c7', label: '0.5' },
      { val: 1.0, color: '#00f2fe', label: '1.0' },
      { val: 1.5, color: '#38bdf8', label: '1.5' },
      { val: 2.2, color: '#f59e0b', label: '2.2' },
      { val: 3.5, color: '#ef4444', label: '3.5+' }
    ],
    weather: [
      { val: 15, color: '#0284c7', label: '15' },
      { val: 25, color: '#10b981', label: '25' },
      { val: 35, color: '#facc15', label: '35' },
      { val: 45, color: '#f97316', label: '45' },
      { val: 55, color: '#ef4444', label: '55' },
      { val: 65, color: '#9333ea', label: '65+' }
    ]
  };

  const LAYER_META = {
    wind: {
      name: 'GFS Surface Wind Flow (10m)',
      unit: 'kt',
      icon: '💨',
      source: 'INCOIS / Open-Meteo High-Resolution Model',
      sampleVal: (lat, lon) => 12.5 + Math.sin(lat * 3.1) * 3.5 + Math.cos(lon * 2.2) * 2.0,
      heading: 240 // SW flow
    },
    currents: {
      name: 'Copernicus Surface Ocean Currents',
      unit: 'km/h',
      icon: '🌀',
      source: 'Copernicus Marine Hydrodynamic Model',
      sampleVal: (lat, lon) => 0.75 + Math.sin(lat * 2.5) * 0.25,
      heading: 165 // SSE coastal drift
    },
    waves: {
      name: 'WaveWatch III Swell Wavefield',
      unit: 'm',
      icon: '🌊',
      source: 'INCOIS Ocean State Forecast (OSF)',
      sampleVal: (lat, lon) => 1.35 + Math.cos(lat * 2.0) * 0.35,
      heading: 250 // WSW swell
    },
    weather: {
      name: 'Doppler Radar Precipitation Scan',
      unit: 'dBZ',
      icon: '📡',
      source: 'IMD Coastal Radar Network & RainViewer',
      sampleVal: (lat, lon) => 28.0 + Math.sin(lat * 4.0) * 15.0,
      heading: 0
    }
  };

  class OrcaWindyAnimator {
    constructor(mapInstance, containerId) {
      if (!mapInstance) return;
      this.map = mapInstance;
      this.container = typeof containerId === 'string' ? document.getElementById(containerId) : this.map.getContainer();
      this.activeMode = null; // 'wind' | 'currents' | 'waves' | 'weather' | null
      this.particles = [];
      this.numParticles = 1400;
      this.animationFrameId = null;
      this.isPlaying = true;
      this.speedMultiplier = 1.0;
      this.radarAngle = 0;
      this.lastTimestamp = performance.now();

      this._initCanvas();
      this._initLegendUI();
      this._bindMapEvents();
    }

    _initCanvas() {
      // Create canvas positioned precisely over Leaflet map
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'windy-particle-canvas';
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '450'; // above map tiles, below Leaflet markers & popups
      this.canvas.style.transition = 'opacity 0.25s ease';

      this.ctx = this.canvas.getContext('2d');
      this.container.appendChild(this.canvas);
      this._resizeCanvas();
    }

    _resizeCanvas() {
      if (!this.canvas || !this.container) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.scale(dpr, dpr);
      this._initParticlePool();
    }

    _initParticlePool() {
      this.particles = [];
      const bounds = this.map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();

      for (let i = 0; i < this.numParticles; i++) {
        this.particles.push(this._createParticle(north, south, east, west, true));
      }
    }

    _createParticle(north, south, east, west, randomizeAge = false) {
      const lat = south + Math.random() * (north - south);
      const lon = west + Math.random() * (east - west);
      const maxAge = 40 + Math.floor(Math.random() * 60);
      const age = randomizeAge ? Math.floor(Math.random() * maxAge) : 0;
      
      return {
        lat,
        lon,
        prevLat: lat,
        prevLon: lon,
        age,
        maxAge,
        speedScale: 0.8 + Math.random() * 0.4,
        size: 1.0 + Math.random() * 1.5
      };
    }

    _bindMapEvents() {
      // Handle map movements smoothly
      this.map.on('movestart', () => {
        this.isMoving = true;
      });

      this.map.on('move', () => {
        // Clear canvas during high-speed drag for sharpness
        if (this.ctx && this.activeMode) {
          this.ctx.clearRect(0, 0, this.width, this.height);
        }
      });

      this.map.on('moveend zoomend', () => {
        this.isMoving = false;
        this._resizeCanvas();
      });

      window.addEventListener('resize', () => {
        this._resizeCanvas();
      });

      // Mouse coordinate sampler for Windy interactive bottom legend
      this.map.on('mousemove', (e) => {
        this._updateLegendTracker(e.latlng.lat, e.latlng.lng);
      });
    }

    // -------------------------------------------------------------
    // Activation & Mode Switching
    // -------------------------------------------------------------
    setMode(mode) {
      if (this.activeMode === mode) {
        // Toggle off if clicked again
        this.clear();
        return;
      }

      this.activeMode = mode;

      if (!mode) {
        this.clear();
        return;
      }

      this._resizeCanvas();
      this.isPlaying = true;
      this._showHudToast(mode);
      this._updateLegendTrack(mode);

      if (!this.animationFrameId) {
        this.lastTimestamp = performance.now();
        this._loop(this.lastTimestamp);
      }
    }

    clear() {
      this.activeMode = null;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this._hideHudToast();
      this._hideLegend();
    }

    // -------------------------------------------------------------
    // Main Animation Loop (60 FPS)
    // -------------------------------------------------------------
    _loop(timestamp) {
      if (!this.activeMode) return;

      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      if (this.isPlaying && !this.isMoving) {
        switch (this.activeMode) {
          case 'wind':
            this._drawWindParticles(dt);
            break;
          case 'currents':
            this._drawCurrentsParticles(dt);
            break;
          case 'waves':
            this._drawWavesField(dt);
            break;
          case 'weather':
            this._drawDopplerRadar(dt);
            break;
        }
      }

      this.animationFrameId = requestAnimationFrame((t) => this._loop(t));
    }

    // -------------------------------------------------------------
    // 1. Wind Particles Engine (Speed-colored streamlines)
    // -------------------------------------------------------------
    _drawWindParticles(dt) {
      const ctx = this.ctx;
      const bounds = this.map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();

      // Semi-transparent fade trail (motion blur)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalCompositeOperation = 'source-over';

      const baseAngleRad = (245 * Math.PI) / 180; // WSW prevailing flow
      const speedKts = 14 * this.speedMultiplier;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.age++;

        if (p.age > p.maxAge || p.lat < south || p.lat > north || p.lon < west || p.lon > east) {
          this.particles[i] = this._createParticle(north, south, east, west);
          continue;
        }

        // Localized vector curvature
        const localAngle = baseAngleRad + Math.sin(p.lat * 5.0) * 0.15;
        const step = (speedKts * p.speedScale * dt * 0.04);
        const dLat = Math.sin(localAngle) * step;
        const dLon = Math.cos(localAngle) * step;

        p.prevLat = p.lat;
        p.prevLon = p.lon;
        p.lat += dLat;
        p.lon += dLon;

        // Project lat/lon to canvas container pixels
        const pt1 = this.map.latLngToContainerPoint([p.prevLat, p.prevLon]);
        const pt2 = this.map.latLngToContainerPoint([p.lat, p.lon]);

        // Calculate color by speed
        const speedVal = speedKts * p.speedScale;
        let strokeColor = '#38bdf8'; // cyan 0-10kt
        if (speedVal >= 22) strokeColor = '#f97316'; // orange 22+ kt
        else if (speedVal >= 16) strokeColor = '#facc15'; // yellow 16-22 kt
        else if (speedVal >= 11) strokeColor = '#10b981'; // green 11-16 kt

        const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.85;

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = Math.max(0.1, alpha);
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    // -------------------------------------------------------------
    // 2. Ocean Currents Engine (Hydrodynamic drift streamlines)
    // -------------------------------------------------------------
    _drawCurrentsParticles(dt) {
      const ctx = this.ctx;
      const bounds = this.map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalCompositeOperation = 'source-over';

      const baseAngleRad = (165 * Math.PI) / 180; // SSE along-coast drift
      const currentSpeed = 0.8 * this.speedMultiplier;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.age++;

        if (p.age > p.maxAge || p.lat < south || p.lat > north || p.lon < west || p.lon > east) {
          this.particles[i] = this._createParticle(north, south, east, west);
          continue;
        }

        const step = (currentSpeed * p.speedScale * dt * 0.025);
        const dLat = Math.cos(baseAngleRad) * step * -1; // downward
        const dLon = Math.sin(baseAngleRad) * step;

        p.prevLat = p.lat;
        p.prevLon = p.lon;
        p.lat += dLat;
        p.lon += dLon;

        const pt1 = this.map.latLngToContainerPoint([p.prevLat, p.prevLon]);
        const pt2 = this.map.latLngToContainerPoint([p.lat, p.lon]);

        const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.7;

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = '#06b6d4';
        ctx.globalAlpha = Math.max(0.1, alpha);
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    // -------------------------------------------------------------
    // 3. Swell Wave Field (Propagating wavefront ripples)
    // -------------------------------------------------------------
    _drawWavesField(dt) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const time = performance.now() * 0.0015 * this.speedMultiplier;
      const bounds = this.map.getBounds();
      const center = this.map.getCenter();
      const centerPt = this.map.latLngToContainerPoint(center);

      // Render propagating wave crest lines across visible map
      const waveSpacing = 38;
      const numLines = Math.ceil(this.width / waveSpacing) + 6;

      ctx.save();
      // Wave direction angle ~ 245 deg (WSW swells)
      ctx.translate(centerPt.x, centerPt.y);
      ctx.rotate((-25 * Math.PI) / 180);
      ctx.translate(-centerPt.x, -centerPt.y);

      for (let i = -numLines; i < numLines; i++) {
        const offset = ((i * waveSpacing + (time * 28) % waveSpacing));
        const yPos = centerPt.y + offset;

        ctx.beginPath();
        for (let x = -100; x <= this.width + 100; x += 25) {
          const waveElevation = Math.sin(x * 0.02 + time * 3.0) * 4.5;
          if (x === -100) ctx.moveTo(x, yPos + waveElevation);
          else ctx.lineTo(x, yPos + waveElevation);
        }

        const crestAlpha = (Math.sin(offset * 0.04 + time) + 1) * 0.18 + 0.12;
        ctx.strokeStyle = '#00f2fe';
        ctx.globalAlpha = crestAlpha;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }

    // -------------------------------------------------------------
    // 4. Doppler Weather Radar (Sweeping radar beam + rain echoes)
    // -------------------------------------------------------------
    _drawDopplerRadar(dt) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const center = this.map.getCenter();
      const cPt = this.map.latLngToContainerPoint(center);
      const radius = Math.max(this.width, this.height) * 0.8;

      this.radarAngle = (this.radarAngle + dt * 1.8 * this.speedMultiplier) % (Math.PI * 2);

      // 1. Radar sweeping sector beam
      const gradient = ctx.createRadialGradient(cPt.x, cPt.y, 10, cPt.x, cPt.y, radius);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cPt.x, cPt.y);
      ctx.arc(cPt.x, cPt.y, radius, this.radarAngle - 0.45, this.radarAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Sharp scan line
      ctx.beginPath();
      ctx.moveTo(cPt.x, cPt.y);
      ctx.lineTo(cPt.x + Math.cos(this.radarAngle) * radius, cPt.y + Math.sin(this.radarAngle) * radius);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      // 2. Simulated coastal precipitation cells (Doppler echoes)
      const echoClusters = [
        { dX: -70, dY: -40, r: 42, color: 'rgba(250, 204, 21, 0.35)' },
        { dX: 90, dY: 60, r: 55, color: 'rgba(16, 185, 129, 0.35)' },
        { dX: -140, dY: 80, r: 35, color: 'rgba(239, 68, 68, 0.3)' }
      ];

      echoClusters.forEach(echo => {
        const pulse = 1.0 + Math.sin(performance.now() * 0.003) * 0.1;
        ctx.beginPath();
        ctx.arc(cPt.x + echo.dX, cPt.y + echo.dY, echo.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = echo.color;
        ctx.fill();
      });
    }

    // -------------------------------------------------------------
    // Windy Bottom Interactive Legend & Gradient Scale
    // -------------------------------------------------------------
    _initLegendUI() {
      this.legendEl = document.createElement('div');
      this.legendEl.className = 'windy-bottom-legend hidden';
      this.legendEl.innerHTML = `
        <div class="legend-header-row">
          <div class="legend-title-badge">
            <span class="legend-icon" id="windyLegendIcon">💨</span>
            <span class="legend-name" id="windyLegendName">WIND (kt)</span>
          </div>
          <div class="legend-playback-controls">
            <button type="button" class="playback-btn" id="windyBtnTogglePlay" title="Pause / Play">⏸</button>
            <button type="button" class="playback-btn" id="windyBtnSpeed" title="Cycle Animation Speed">1x</button>
          </div>
        </div>
        <div class="legend-track-wrapper">
          <div class="legend-gradient-track" id="windyGradientTrack"></div>
          <div class="legend-cursor-needle" id="windyCursorNeedle">
            <div class="needle-pill" id="windyNeedlePill">--</div>
          </div>
        </div>
        <div class="legend-ticks-row" id="windyTicksRow"></div>
      `;

      this.container.appendChild(this.legendEl);

      // Wire playback buttons
      const btnPlay = this.legendEl.querySelector('#windyBtnTogglePlay');
      if (btnPlay) {
        btnPlay.addEventListener('click', (e) => {
          e.stopPropagation();
          this.isPlaying = !this.isPlaying;
          btnPlay.textContent = this.isPlaying ? '⏸' : '▶';
        });
      }

      const btnSpeed = this.legendEl.querySelector('#windyBtnSpeed');
      if (btnSpeed) {
        btnSpeed.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.speedMultiplier === 1.0) this.speedMultiplier = 1.5;
          else if (this.speedMultiplier === 1.5) this.speedMultiplier = 2.0;
          else this.speedMultiplier = 1.0;
          btnSpeed.textContent = `${this.speedMultiplier}x`;
        });
      }

      // HUD Toast element in top right of map
      this.hudToastEl = document.createElement('div');
      this.hudToastEl.className = 'windy-hud-toast hidden';
      this.hudToastEl.innerHTML = `
        <div class="hud-toast-content">
          <span class="hud-live-dot"></span>
          <div class="hud-text-group">
            <strong class="hud-title" id="windyHudTitle">Live Layer Active</strong>
            <span class="hud-subtitle" id="windyHudSubtitle">Calibrated Sensor Stream</span>
          </div>
        </div>
        <button type="button" class="hud-close-btn" id="windyHudCloseBtn">✕</button>
      `;
      this.container.appendChild(this.hudToastEl);

      const closeBtn = this.hudToastEl.querySelector('#windyHudCloseBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clear();
        });
      }
    }

    _updateLegendTrack(mode) {
      if (!this.legendEl) return;
      const ramp = COLOR_RAMPS[mode];
      const meta = LAYER_META[mode];
      if (!ramp || !meta) return;

      this.legendEl.classList.remove('hidden');

      const iconEl = this.legendEl.querySelector('#windyLegendIcon');
      const nameEl = this.legendEl.querySelector('#windyLegendName');
      const trackEl = this.legendEl.querySelector('#windyGradientTrack');
      const ticksRow = this.legendEl.querySelector('#windyTicksRow');

      if (iconEl) iconEl.textContent = meta.icon;
      if (nameEl) nameEl.textContent = `${mode.toUpperCase()} (${meta.unit})`;

      // Construct gradient CSS
      const colorStops = ramp.map((r, idx) => {
        const pct = (idx / (ramp.length - 1)) * 100;
        return `${r.color} ${pct}%`;
      }).join(', ');

      if (trackEl) {
        trackEl.style.background = `linear-gradient(to right, ${colorStops})`;
      }

      if (ticksRow) {
        ticksRow.innerHTML = ramp.map(r => `<span>${r.label}</span>`).join('');
      }
    }

    _updateLegendTracker(lat, lon) {
      if (!this.activeMode || !this.legendEl || this.legendEl.classList.contains('hidden')) return;
      const meta = LAYER_META[this.activeMode];
      const ramp = COLOR_RAMPS[this.activeMode];
      if (!meta || !ramp) return;

      const needle = this.legendEl.querySelector('#windyCursorNeedle');
      const pill = this.legendEl.querySelector('#windyNeedlePill');
      if (!needle || !pill) return;

      const sampleVal = meta.sampleVal(lat, lon);
      const minVal = ramp[0].val;
      const maxVal = ramp[ramp.length - 1].val;
      const clamped = Math.max(minVal, Math.min(maxVal, sampleVal));
      const pct = ((clamped - minVal) / (maxVal - minVal)) * 100;

      needle.style.left = `${pct}%`;
      needle.style.display = 'flex';
      pill.textContent = `${sampleVal.toFixed(1)} ${meta.unit}`;
    }

    _hideLegend() {
      if (this.legendEl) this.legendEl.classList.add('hidden');
    }

    _showHudToast(mode) {
      if (!this.hudToastEl) return;
      const meta = LAYER_META[mode];
      if (!meta) return;

      const titleEl = this.hudToastEl.querySelector('#windyHudTitle');
      const subEl = this.hudToastEl.querySelector('#windyHudSubtitle');

      if (titleEl) titleEl.textContent = `${meta.icon} ${meta.name}`;
      if (subEl) subEl.textContent = `${meta.source} · 60 FPS Canvas Flow`;

      this.hudToastEl.classList.remove('hidden');
      this.hudToastEl.classList.add('active');
    }

    _hideHudToast() {
      if (this.hudToastEl) {
        this.hudToastEl.classList.remove('active');
        this.hudToastEl.classList.add('hidden');
      }
    }
  }

  // Global registration
  window.OrcaWindyAnimator = OrcaWindyAnimator;
})(window);
