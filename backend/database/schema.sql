-- ===================================================
-- ORCA PostgreSQL + PostGIS Schema
-- Problem Statement: SIH26176
-- ===================================================

-- 1. Enable PostGIS Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Marine Observations (Normalized Time-Series & Spatial Table)
CREATE TABLE IF NOT EXISTS marine_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(64) NOT NULL,              -- e.g. 'Open-Meteo Marine', 'NOAA CoastWatch', 'INCOIS'
    dataset VARCHAR(64) NOT NULL,             -- e.g. 'ecmwf_waves', 'ghrsst', 'modis_chl'
    variable VARCHAR(48) NOT NULL,            -- e.g. 'sst', 'wave_height', 'wind_speed'
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    geom GEOMETRY(Point, 4326),
    value NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(24) NOT NULL,                -- e.g. '°C', 'm', 'knots', 'mg/m3'
    observed_at TIMESTAMPTZ NOT NULL,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    data_age_hours NUMERIC(6, 2),
    freshness_status VARCHAR(24) NOT NULL,    -- 'LIVE', 'NEAR_REAL_TIME', 'DELAYED', 'HISTORICAL'
    quality_flag VARCHAR(24) DEFAULT 'VALIDATED',
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_obs_geom ON marine_observations USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_obs_var_time ON marine_observations (variable, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_source ON marine_observations (source);

-- Trigger to keep PostGIS geometry synced with lat/lon
CREATE OR REPLACE FUNCTION update_marine_obs_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    NEW.data_age_hours := EXTRACT(EPOCH FROM (NOW() - NEW.observed_at)) / 3600.0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marine_obs_geom ON marine_observations;
CREATE TRIGGER trg_marine_obs_geom
BEFORE INSERT OR UPDATE ON marine_observations
FOR EACH ROW EXECUTE FUNCTION update_marine_obs_geom();

-- 3. Marine Zones & Boundaries (EEZ, MPAs, Restricted Zones, Harbors)
CREATE TABLE IF NOT EXISTS marine_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    zone_type VARCHAR(48) NOT NULL,           -- 'MPA', 'EEZ', 'RESTRICTED_NAVAL', 'SHIPPING_LANE', 'PORT'
    state_region VARCHAR(64),
    risk_multiplier NUMERIC(4, 2) DEFAULT 1.0,
    is_restricted BOOLEAN DEFAULT FALSE,
    description TEXT,
    geom GEOMETRY(MultiPolygon, 4326),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_zones_geom ON marine_zones USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_zones_type ON marine_zones (zone_type);

-- 4. Active Hazard Advisories & Bulletins
CREATE TABLE IF NOT EXISTS hazard_advisories (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    advisory_type VARCHAR(48) NOT NULL,       -- 'HIGH_WAVE', 'SQUALL', 'CYCLONE', 'PORT_WARNING'
    severity VARCHAR(24) NOT NULL,            -- 'WARNING', 'WATCH', 'ADVISORY'
    issuing_authority VARCHAR(64) NOT NULL,   -- 'INCOIS', 'IMD', 'Indian Coast Guard'
    region VARCHAR(128) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    port_warning_signal INT,
    description TEXT,
    geom GEOMETRY(Geometry, 4326),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_hazards_geom ON hazard_advisories USING GIST(geom);

-- 5. Potential Fishing Zones (PFZ)
CREATE TABLE IF NOT EXISTS pfz_advisories (
    id VARCHAR(64) PRIMARY KEY,
    zone_name VARCHAR(128) NOT NULL,
    latitude NUMERIC(8, 4) NOT NULL,
    longitude NUMERIC(8, 4) NOT NULL,
    geom GEOMETRY(Point, 4326),
    sst_celsius NUMERIC(5, 2),
    sst_gradient_deg_km NUMERIC(5, 3),
    chlorophyll_mg_m3 NUMERIC(6, 3),
    reference_port VARCHAR(64),
    distance_km NUMERIC(7, 2),
    bearing_deg NUMERIC(5, 1),
    bearing_cardinal VARCHAR(8),
    depth_meters INT,
    confidence_score NUMERIC(3, 2),
    valid_until TIMESTAMPTZ,
    species_association TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_pfz_geom ON pfz_advisories USING GIST(geom);

-- 6. Chat Sessions & Decision Audit Trail
CREATE TABLE IF NOT EXISTS chat_audit_logs (
    query_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_query TEXT NOT NULL,
    detected_intent VARCHAR(64),
    selected_agents TEXT[],
    target_location VARCHAR(128),
    risk_level VARCHAR(24),
    response_summary TEXT,
    evidence_payload JSONB,
    processing_time_ms NUMERIC(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
