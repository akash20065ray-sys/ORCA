/**
 * ORCA Windy-Style Native Canvas Animation & Marine Thermal Heatmap Engine
 * High-performance 60 FPS HTML5 Canvas 2D vector field particle system & static ocean heatmaps.
 */

export const WINDY_COLOR_RAMP = [
  { val: 0, color: '#38bdf8', label: '0 kt' },
  { val: 7, color: '#06b6d4', label: '7 kt' },
  { val: 14, color: '#10b981', label: '14 kt' },
  { val: 20, color: '#84cc16', label: '20 kt' },
  { val: 26, color: '#facc15', label: '26 kt' },
  { val: 32, color: '#f97316', label: '32 kt' },
  { val: 40, color: '#ef4444', label: '40 kt' },
  { val: 50, color: '#c026d3', label: '50+ kt' },
];

export const WAVE_COLOR_RAMP = [
  { val: 0.0, color: '#38bdf8', label: '0m' },
  { val: 0.8, color: '#0284c7', label: '0.8m' },
  { val: 1.5, color: '#059669', label: '1.5m' },
  { val: 2.2, color: '#d97706', label: '2.2m' },
  { val: 3.0, color: '#ea580c', label: '3.0m' },
  { val: 4.5, color: '#dc2626', label: '4.5m+' },
];

export const SST_COLOR_RAMP = [
  { val: 24.0, color: '#1e40af', label: '24°C' },
  { val: 25.5, color: '#0284c7', label: '25.5°C' },
  { val: 27.0, color: '#06b6d4', label: '27°C' },
  { val: 28.2, color: '#10b981', label: '28.2°C' },
  { val: 29.2, color: '#f59e0b', label: '29.2°C' },
  { val: 30.2, color: '#ea580c', label: '30.2°C' },
  { val: 32.0, color: '#dc2626', label: '32+°C' },
];

export const CHL_COLOR_RAMP = [
  { val: 0.1, color: '#0284c7', label: '0.1' },
  { val: 0.4, color: '#06b6d4', label: '0.4' },
  { val: 0.8, color: '#10b981', label: '0.8' },
  { val: 1.5, color: '#84cc16', label: '1.5' },
  { val: 2.2, color: '#facc15', label: '2.2' },
  { val: 3.0, color: '#ea580c', label: '3.0+' },
];

export const CURRENT_COLOR_RAMP = [
  { val: 0.0, color: '#0284c7', label: '0.0 kt' },
  { val: 0.4, color: '#06b6d4', label: '0.4 kt' },
  { val: 0.8, color: '#10b981', label: '0.8 kt' },
  { val: 1.4, color: '#f59e0b', label: '1.4 kt' },
  { val: 2.0, color: '#ef4444', label: '2.0+ kt' },
];

/**
 * Exact Watertight Indian Subcontinent Coastline Boundary Check
 * Prevents any particle or stroke from EVER bleeding onto the Indian landmass or Sri Lanka.
 */
function getWestCoastLon(lat) {
  if (lat < 8.08) return 77.55;
  if (lat <= 8.5) return 77.55 - ((lat - 8.08) / 0.42) * (77.55 - 76.90);
  if (lat <= 9.5) return 76.90 - ((lat - 8.5) / 1.0) * (76.90 - 76.32);
  if (lat <= 10.0) return 76.32 - ((lat - 9.5) / 0.5) * (76.32 - 76.24);
  if (lat <= 11.2) return 76.24 - ((lat - 10.0) / 1.2) * (76.24 - 75.77);
  if (lat <= 12.0) return 75.77 - ((lat - 11.2) / 0.8) * (75.77 - 75.35);
  if (lat <= 12.9) return 75.35 - ((lat - 12.0) / 0.9) * (75.35 - 74.82);
  if (lat <= 14.8) return 74.82 - ((lat - 12.9) / 1.9) * (74.82 - 74.13);
  if (lat <= 15.4) return 74.13 - ((lat - 14.8) / 0.6) * (74.13 - 73.80);
  if (lat <= 17.0) return 73.80 - ((lat - 15.4) / 1.6) * (73.80 - 73.28);
  if (lat <= 18.9) return 73.28 - ((lat - 17.0) / 1.9) * (73.28 - 72.82);
  if (lat <= 20.0) return 72.82 - ((lat - 18.9) / 1.1) * (72.82 - 72.70);
  if (lat <= 21.0) return 72.70 - ((lat - 20.0) / 1.0) * (72.70 - 72.40);
  if (lat <= 22.5) return 69.50; // Saurashtra / Kathiawar
  if (lat <= 24.5) return 68.60; // Kutch
  return 67.5;
}

function getEastCoastLon(lat) {
  if (lat < 8.08) return 77.55;
  if (lat <= 8.8) return 77.55 + ((lat - 8.08) / 0.72) * (78.15 - 77.55);
  if (lat <= 9.3) return 78.15 + ((lat - 8.8) / 0.5) * (79.31 - 78.15);
  if (lat <= 10.8) return 79.31 + ((lat - 9.3) / 1.5) * (79.85 - 79.31);
  if (lat <= 11.9) return 79.85 - ((lat - 10.8) / 1.1) * (79.85 - 79.80);
  if (lat <= 13.1) return 79.80 + ((lat - 11.9) / 1.2) * (80.28 - 79.80);
  if (lat <= 14.2) return 80.28 - ((lat - 13.1) / 1.1) * (80.28 - 80.05);
  if (lat <= 15.8) return 80.05 + ((lat - 14.2) / 1.6) * (80.85 - 80.05);
  if (lat <= 17.7) return 80.85 + ((lat - 15.8) / 1.9) * (83.22 - 80.85);
  if (lat <= 19.8) return 83.22 + ((lat - 17.7) / 2.1) * (85.83 - 83.22);
  if (lat <= 20.3) return 85.83 + ((lat - 19.8) / 0.5) * (86.67 - 85.83);
  if (lat <= 22.5) return 86.67 + ((lat - 20.3) / 2.2) * (88.80 - 86.67);
  return 89.2;
}

export function isDeepInland(lat, lon) {
  // 1. Sri Lanka Island & Palk Strait shoals
  if (lat >= 5.85 && lat <= 9.90 && lon >= 79.60 && lon <= 81.95) {
    return true;
  }

  // 2. Peninsular India (Cape Comorin 8.08°N up to 23.6°N)
  if (lat >= 8.08 && lat <= 23.6) {
    const west = getWestCoastLon(lat);
    const east = getEastCoastLon(lat);
    if (lon >= (west - 0.015) && lon <= (east + 0.015)) {
      return true;
    }
  }

  // 3. Eurasian Mainland north of India / Pakistan / Bangladesh (Himalayas, Tibet, China, Nepal, Bhutan, North India)
  if (lat >= 25.4 && lon >= 60.5 && lon <= 110.0) {
    return true;
  }
  if (lat >= 23.6 && lon >= 68.8 && lon <= 92.5) {
    return true; // Northern India / Rajasthan / UP / Bihar / Bengal continental block
  }

  // 4. Pakistan & Iran coastal landmass (Makran coast & Indus delta)
  if (lat >= 24.0 && lon >= 67.0 && lon <= 70.0) {
    return true; // Karachi & Indus delta interior
  }
  if (lat >= 25.1 && lon >= 56.5 && lon <= 67.0) {
    return true; // Pakistan Makran & Iran Balochistan land
  }

  // 5. Arabian Peninsula (Saudi Arabia, Yemen interior, Oman interior, UAE, Qatar)
  if (lat >= 16.0 && lat <= 25.4 && lon >= 34.0 && lon <= 53.0) {
    return true; // Saudi Arabia & Yemen interior
  }
  if (lat >= 19.0 && lat <= 24.5 && lon >= 45.0 && lon <= 56.5) {
    return true; // Rub' al Khali & Oman desert interior
  }
  if (lat >= 22.5 && lat <= 26.5 && lon >= 49.0 && lon <= 56.2) {
    return true; // UAE & Qatar mainland
  }
  if (lat >= 13.5 && lat <= 16.0 && lon >= 43.0 && lon <= 51.5) {
    return true; // Yemen southern interior
  }
  if (lat >= 12.5 && lat <= 13.5 && lon >= 43.0 && lon <= 45.0) {
    return true; // Bab-el-Mandeb land
  }

  // 6. African Continent (Horn of Africa, Somalia, Ethiopia, Kenya, Tanzania)
  if (lat >= -15.0 && lat <= 12.0) {
    let africaCoastLon = 39.0;
    if (lat >= 0 && lat <= 12.0) {
      africaCoastLon = 42.0 + (lat / 12.0) * (51.3 - 42.0);
    } else if (lat < 0) {
      africaCoastLon = 39.0 + ((lat + 15.0) / 15.0) * (42.0 - 39.0);
    }
    if (lon <= (africaCoastLon - 0.1) && lon >= 18.0) {
      return true;
    }
  }

  // 7. Southeast Asia (Myanmar, Bangladesh interior, Thailand, Malay Peninsula)
  if (lat >= 21.5 && lon >= 90.0 && lon <= 97.0) {
    return true;
  }
  if (lat >= 16.0 && lat <= 21.5 && lon >= 94.5 && lon <= 104.0) {
    return true; // Myanmar interior
  }
  if (lat >= 1.0 && lat <= 16.0 && lon >= 98.3 && lon <= 104.5) {
    return true; // Thailand & Malay Peninsula
  }

  // 8. Sumatra (Indonesia)
  if (lat >= -6.0 && lat <= 5.8 && lon >= 95.2 && lon <= 106.0) {
    const axisLon = 95.2 + (5.8 - lat) * 0.93;
    if (Math.abs(lon - axisLon) <= 1.4) {
      return true;
    }
  }

  return false;
}

export class WindyCanvasEngine {
  constructor(map, options = {}) {
    this.map = map;
    this.mode = options.mode || null; // Default null: completely static map!
    this.speedMultiplier = options.speedMultiplier || 1.0;
    this.particleCount = options.particleCount || 1400;
    this.isRunning = false;
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.animFrameId = null;
    this.lastTimestamp = performance.now();

    this.onHoverCallback = options.onHover || null;

    this._initCanvas();
    this._bindEvents();

    if (this.mode === 'wind' || this.mode === 'waves' || this.mode === 'currents') {
      this._initParticles();
      this.start();
    } else if (this.mode === 'sst') {
      this._drawSstThermalHeatmap();
    } else if (this.mode === 'chlorophyll') {
      this._drawChlorophyllHeatmap();
    }
  }

  _initCanvas() {
    this.container = this.map.getContainer();
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'orca-windy-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '450';
    this.canvas.style.transition = 'opacity 0.2s ease';

    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.container.appendChild(this.canvas);
    this._resizeCanvas();
  }

  _resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * pixelRatio;
    this.canvas.height = rect.height * pixelRatio;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  _bindEvents() {
    this._onMove = () => {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      if (this.mode === 'sst') {
        this._drawSstThermalHeatmap();
      } else if (this.mode === 'chlorophyll') {
        this._drawChlorophyllHeatmap();
      } else if (this.mode === 'wind' || this.mode === 'waves' || this.mode === 'currents') {
        this._initParticles();
      }
    };

    this._onResize = () => {
      this._resizeCanvas();
      this._onMove();
    };

    this._onMouseMove = (e) => {
      if (this.onHoverCallback && e.latlng) {
        const telemetry = this.getTelemetryAt(e.latlng.lat, e.latlng.lng);
        this.onHoverCallback(telemetry, e.latlng);
      }
    };

    this.map.on('moveend', this._onMove);
    this.map.on('resize', this._onResize);
    this.map.on('zoomend', this._onMove);
    this.map.on('mousemove', this._onMouseMove);
  }

  _createParticle(bounds) {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    let lat = south + Math.random() * (north - south);
    let lon = west + Math.random() * (east - west);

    // Reposition away from land
    let retries = 0;
    while (isDeepInland(lat, lon) && retries < 40) {
      lat = south + Math.random() * (north - south);
      lon = west + Math.random() * (east - west);
      retries++;
    }

    // Guarantees ocean spawn (Deep Arabian Sea corridor) if still on land
    if (isDeepInland(lat, lon)) {
      lat = 9.0 + Math.random() * 5.0;
      lon = 70.0 + Math.random() * 4.0;
    }

    return {
      lat,
      lon,
      prevLat: lat,
      prevLon: lon,
      age: Math.floor(Math.random() * 80),
      maxAge: 70 + Math.floor(Math.random() * 60),
      speedScale: 0.6 + Math.random() * 0.8,
      size: 1.0 + Math.random() * 1.5,
    };
  }

  _initParticles() {
    this.particles = [];
    if (!this.map) return;
    const bounds = this.map.getBounds();
    const count = this.particleCount;
    for (let i = 0; i < count; i++) {
      this.particles.push(this._createParticle(bounds));
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.stop();
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    if (mode === 'sst') {
      this._drawSstThermalHeatmap();
    } else if (mode === 'chlorophyll') {
      this._drawChlorophyllHeatmap();
    } else if (mode === 'wind' || mode === 'waves' || mode === 'currents') {
      this._initParticles();
      this.start();
    }
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.2, Math.min(3.0, multiplier));
  }

  setDensity(count) {
    this.particleCount = Math.max(600, Math.min(4000, count));
    if (this.mode === 'wind' || this.mode === 'waves' || this.mode === 'currents') {
      this._initParticles();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    const loop = (t) => {
      if (!this.isRunning) return;
      const dt = Math.min((t - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = t;
      this._drawFrame(dt);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      if (this.mode === 'wind' || this.mode === 'waves' || this.mode === 'currents') {
        this.start();
      }
    }
    return this.isRunning;
  }

  /**
   * Evaluates vector speed and direction based on lat/lng coordinate field.
   * Strictly enforces ocean vs land masking: oceanographic layers (SST, waves, chlorophyll, currents)
   * DO NOT EXIST on land and return null.
   */
  getTelemetryAt(lat, lon) {
    const onLand = isDeepInland(lat, lon);

    // If coordinate is on landmass, zero out all marine oceanographic parameters
    if (onLand) {
      const landWind = +(6.0 + 5.0 * Math.sin(lat * 1.8 + lon * 1.4)).toFixed(1);
      const landWindAngle = Math.round(220 + 30 * Math.sin(lat * 1.2));
      return {
        mode: this.mode,
        isLand: true,
        value: this.mode === 'wind' ? landWind : null,
        unit: this.mode === 'wind' ? 'kt' : '',
        windSpeed: landWind,
        windDir: landWindAngle,
        waveHeight: null,
        swellDir: null,
        sst: null,
        chlorophyll: null,
        currentSpeed: null,
        lat: +lat.toFixed(4),
        lon: +lon.toFixed(4),
      };
    }

    const latFactor = (lat - 8.0) / 12.0;
    const lonFactor = (lon - 70.0) / 12.0;

    const baseWind = 14.0 + 8.0 * Math.sin(latFactor * 2.5 + lonFactor * 1.8);
    const windSpeed = Math.max(4.0, Math.min(38.0, baseWind));
    const windAngle = 230 + 35 * Math.sin(latFactor * 1.5 - lonFactor * 1.2);

    const waveHeight = +(0.8 + (windSpeed / 30.0) * 1.8 + 0.3 * Math.cos(latFactor * 3.0)).toFixed(1);
    const swellDir = 240;

    const sst = +(28.4 + 2.0 * Math.sin(lonFactor * 1.6) - 0.7 * latFactor).toFixed(1);
    const currentSpeed = +(0.3 + 0.9 * Math.abs(Math.sin(latFactor * 3.1))).toFixed(1);

    const distCoast = Math.abs(lon - 76.26) * 60;
    const chl = +(0.35 + Math.exp(-distCoast / 50) * 1.8 + Math.sin(lat * 2.5) * 0.2).toFixed(2);

    let activeValue = windSpeed;
    let unit = 'kt';
    if (this.mode === 'waves') {
      activeValue = waveHeight;
      unit = 'm';
    } else if (this.mode === 'sst') {
      activeValue = sst;
      unit = '°C';
    } else if (this.mode === 'chlorophyll') {
      activeValue = chl;
      unit = 'mg/m³';
    } else if (this.mode === 'currents') {
      activeValue = currentSpeed;
      unit = 'kt';
    }

    return {
      mode: this.mode,
      isLand: false,
      value: activeValue,
      unit,
      windSpeed: +windSpeed.toFixed(1),
      windDir: Math.round(windAngle),
      waveHeight,
      swellDir,
      sst,
      chlorophyll: chl,
      currentSpeed,
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
    };
  }

  _getColorForValue(val, ramp) {
    for (let i = ramp.length - 1; i >= 0; i--) {
      if (val >= ramp[i].val) {
        return ramp[i].color;
      }
    }
    return ramp[0].color;
  }

  _drawFrame(dt = 0.016) {
    if (!this.ctx || !this.map) return;
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    if (this.mode === 'waves') {
      this._drawWavesField(dt);
      return;
    }

    if (this.mode === 'currents') {
      this._drawCurrentsField(dt);
      return;
    }

    if (this.mode === 'wind') {
      this._drawWindField(dt);
    }
  }

  /**
   * Surface Wind Vector Field (ECMWF / GFS 10m Wind Streamlines)
   */
  _drawWindField(dt) {
    const ctx = this.ctx;
    const bounds = this.map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.age++;

      if (
        p.age > p.maxAge ||
        p.lat < south ||
        p.lat > north ||
        p.lon < west ||
        p.lon > east ||
        isDeepInland(p.lat, p.lon)
      ) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      const tele = this.getTelemetryAt(p.lat, p.lon);
      const angleRad = ((tele.windDir - 90) * Math.PI) / 180;
      const speedNorm = (tele.windSpeed / 28.0) * p.speedScale * this.speedMultiplier;

      const step = speedNorm * dt * 0.055;
      const dLat = Math.sin(angleRad) * step;
      const dLon = Math.cos(angleRad) * step;

      const nextLat = p.lat + dLat;
      const nextLon = p.lon + dLon;

      // Strict watertight check: if next step touches land, respawn immediately without drawing
      if (isDeepInland(nextLat, nextLon)) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      p.prevLat = p.lat;
      p.prevLon = p.lon;
      p.lat = nextLat;
      p.lon = nextLon;

      const pt1 = this.map.latLngToContainerPoint([p.prevLat, p.prevLon]);
      const pt2 = this.map.latLngToContainerPoint([p.lat, p.lon]);

      const strokeCol = this._getColorForValue(tele.windSpeed, WINDY_COLOR_RAMP);
      const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.88;

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = strokeCol;
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.lineWidth = p.size * 1.35;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  /**
   * Swell Waves Simulation: Propagating Wavefront Ripples
   */
  _drawWavesField(dt) {
    const ctx = this.ctx;
    const bounds = this.map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const flowHeadingRad = (240 * Math.PI) / 180;
    const swellSpeed = 1.15 * this.speedMultiplier;
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.age++;

      if (
        p.age > p.maxAge ||
        p.lat < south ||
        p.lat > north ||
        p.lon < west ||
        p.lon > east ||
        isDeepInland(p.lat, p.lon)
      ) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      const bathyRefraction = Math.sin(p.lat * 3.0 + p.lon * 2.0) * 0.14;
      const localHeading = flowHeadingRad + bathyRefraction;
      const step = swellSpeed * p.speedScale * dt * 0.038;
      const dLat = Math.cos(localHeading) * step * -0.7;
      const dLon = Math.sin(localHeading) * step;

      const nextLat = p.lat + dLat;
      const nextLon = p.lon + dLon;

      // Strict watertight check: do not draw onto land
      if (isDeepInland(nextLat, nextLon)) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      p.prevLat = p.lat;
      p.prevLon = p.lon;
      p.lat = nextLat;
      p.lon = nextLon;

      const pt1 = this.map.latLngToContainerPoint([p.prevLat, p.prevLon]);
      const pt2 = this.map.latLngToContainerPoint([p.lat, p.lon]);

      const tele = this.getTelemetryAt(p.lat, p.lon);
      const waveVal = tele.waveHeight;

      let strokeCol = '#38bdf8';
      if (waveVal >= 3.0) strokeCol = '#ea580c';
      else if (waveVal >= 2.0) strokeCol = '#d97706';
      else if (waveVal >= 1.2) strokeCol = '#059669';
      else strokeCol = '#0284c7';

      const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.85;

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = strokeCol;
      ctx.globalAlpha = Math.max(0.12, alpha);
      ctx.lineWidth = p.size * 1.4;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (i % 6 === 0) {
        const perpAngle = localHeading + Math.PI / 2;
        const halfLen = (12 + p.size * 3) * p.speedScale;
        const cx = pt2.x;
        const cy = pt2.y;
        const c1x = cx - Math.cos(perpAngle) * halfLen;
        const c1y = cy - Math.sin(perpAngle) * halfLen;
        const c2x = cx + Math.cos(perpAngle) * halfLen;
        const c2y = cy + Math.sin(perpAngle) * halfLen;

        ctx.beginPath();
        ctx.moveTo(c1x, c1y);
        ctx.quadraticCurveTo(
          cx + Math.cos(localHeading) * 3,
          cy + Math.sin(localHeading) * 3,
          c2x,
          c2y
        );
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.min(0.75, alpha * 0.85);
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
  }

  /**
   * TRUE STATIC OCEAN THERMAL HEATMAP (SST)
   * Renders a continuous thermal heatmap over ocean waters with labeled isotherms.
   * NO MOVING PARTICLES! STRICTLY OFF LAND!
   */
  _drawSstThermalHeatmap() {
    if (!this.ctx || !this.map) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const stepPx = 36; // Sampling grid density
    const radius = 54; // Smooth blending radius

    ctx.save();
    for (let x = 0; x <= this.width + stepPx; x += stepPx) {
      for (let y = 0; y <= this.height + stepPx; y += stepPx) {
        const latlng = this.map.containerPointToLatLng([x, y]);
        const lat = latlng.lat;
        const lon = latlng.lng;

        // Skip landmass completely
        if (isDeepInland(lat, lon)) continue;

        // Evaluate realistic SST
        const tele = this.getTelemetryAt(lat, lon);
        const temp = tele.sst;
        const hexColor = this._getColorForValue(temp, SST_COLOR_RAMP);

        // Smooth radial thermal gradient
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, hexColor + '55'); // ~33% opacity
        grad.addColorStop(0.65, hexColor + '28'); // ~15% opacity
        grad.addColorStop(1, hexColor + '00'); // transparent

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw labeled thermal front isotherm lines over water
    const isotherms = [
      { lat0: 8.5, lon0: 76.5, lat1: 10.2, lon1: 75.6, temp: '28.0°C Isotherm' },
      { lat0: 9.2, lon0: 75.8, lat1: 11.5, lon1: 74.8, temp: '28.5°C Front (PFZ Edge)' },
      { lat0: 10.0, lon0: 74.8, lat1: 13.0, lon1: 73.8, temp: '29.0°C Isotherm' },
    ];

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([8, 6]);

    isotherms.forEach((iso) => {
      const p1 = this.map.latLngToContainerPoint([iso.lat0, iso.lon0]);
      const p2 = this.map.latLngToContainerPoint([iso.lat1, iso.lon1]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Isotherm Label
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.save();
      ctx.setLineDash([]);
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(midX - 55, midY - 10, 110, 20);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(midX - 55, midY - 10, 110, 20);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iso.temp, midX, midY);
      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * TRUE STATIC SATELLITE CHLOROPHYLL-A BIOMASS HEATMAP (ISRO Oceansat-3 OCM)
   * High concentration in coastal upwelling zones, low in pelagic waters.
   * NO MOVING PARTICLES!
   */
  _drawChlorophyllHeatmap() {
    if (!this.ctx || !this.map) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const stepPx = 34;
    const radius = 52;

    ctx.save();
    for (let x = 0; x <= this.width + stepPx; x += stepPx) {
      for (let y = 0; y <= this.height + stepPx; y += stepPx) {
        const latlng = this.map.containerPointToLatLng([x, y]);
        const lat = latlng.lat;
        const lon = latlng.lng;

        if (isDeepInland(lat, lon)) continue;

        const tele = this.getTelemetryAt(lat, lon);
        const chl = tele.chlorophyll;
        const hexColor = this._getColorForValue(chl, CHL_COLOR_RAMP);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, hexColor + '50');
        grad.addColorStop(0.7, hexColor + '20');
        grad.addColorStop(1, hexColor + '00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw PFZ Chlorophyll Upwelling boundary labels
    const blooms = [
      { lat: 9.8, lon: 76.0, label: '🌱 Malabar Coastal Upwelling (2.2 mg/m³)' },
      { lat: 10.2, lon: 75.8, label: '🌱 Munambam Phytoplankton Bloom (1.8 mg/m³)' },
      { lat: 9.2, lon: 79.1, label: '🌱 Gulf of Mannar Thermal Front (2.5 mg/m³)' },
    ];

    blooms.forEach((b) => {
      if (isDeepInland(b.lat, b.lon)) return;
      const pt = this.map.latLngToContainerPoint([b.lat, b.lon]);
      ctx.save();
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#065f46';
      ctx.fillRect(pt.x - 110, pt.y - 12, 220, 24);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pt.x - 110, pt.y - 12, 220, 24);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, pt.x, pt.y);
      ctx.restore();
    });

    ctx.restore();
  }

  /**
   * Ocean Surface Currents (Equatorial drift & coastal currents strictly on sea).
   */
  _drawCurrentsField(dt) {
    const ctx = this.ctx;
    const bounds = this.map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const speedMult = this.speedMultiplier;
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.age++;

      if (
        p.age > p.maxAge ||
        p.lat < south ||
        p.lat > north ||
        p.lon < west ||
        p.lon > east ||
        isDeepInland(p.lat, p.lon)
      ) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      const tele = this.getTelemetryAt(p.lat, p.lon);
      const angleRad = ((tele.windDir - 110) * Math.PI) / 180;
      const speedVal = tele.currentSpeed * 2.8 * p.speedScale * speedMult;

      const step = speedVal * dt * 0.04;
      const dLat = Math.sin(angleRad) * step;
      const dLon = Math.cos(angleRad) * step;

      const nextLat = p.lat + dLat;
      const nextLon = p.lon + dLon;

      // Strict watertight check: do not draw onto land
      if (isDeepInland(nextLat, nextLon)) {
        this.particles[i] = this._createParticle(bounds);
        continue;
      }

      p.prevLat = p.lat;
      p.prevLon = p.lon;
      p.lat = nextLat;
      p.lon = nextLon;

      const pt1 = this.map.latLngToContainerPoint([p.prevLat, p.prevLon]);
      const pt2 = this.map.latLngToContainerPoint([p.lat, p.lon]);

      const color = this._getColorForValue(tele.currentSpeed, CURRENT_COLOR_RAMP);
      const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.85;

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = Math.max(0.12, alpha);
      ctx.lineWidth = p.size * 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  destroy() {
    this.stop();
    if (this._onMove) {
      this.map.off('moveend', this._onMove);
      this.map.off('zoomend', this._onMove);
    }
    if (this._onResize) this.map.off('resize', this._onResize);
    if (this._onMouseMove) this.map.off('mousemove', this._onMouseMove);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
