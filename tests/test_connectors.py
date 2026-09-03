import pytest
from backend.data_connectors.open_meteo import open_meteo_connector
from backend.data_connectors.ocean_sst_chl import ocean_sst_chl_connector
from backend.data_connectors.advisories import marine_advisories_connector
from backend.data_connectors.gis_boundaries import gis_boundaries_connector

def test_open_meteo_connector():
    data = open_meteo_connector.fetch_data(13.0827, 80.2707)
    assert "source" in data
    assert "current" in data
    curr = data["current"]
    assert "wave_height_m" in curr
    assert "wind_speed_kts" in curr
    assert curr["wave_height_m"] > 0
    assert "timeline" in data

def test_ocean_sst_chl_connector():
    data = ocean_sst_chl_connector.fetch_data(13.0827, 80.2707)
    assert data["sst_celsius"] >= 24.0
    assert data["chlorophyll_mg_m3"] > 0.0
    assert "sst_gradient_deg_km" in data

def test_marine_advisories_connector():
    hazards = marine_advisories_connector.fetch_data()
    assert len(hazards) > 0
    assert any("INCOIS" in h.issuing_authority for h in hazards)

def test_gis_boundaries_connector():
    zones = gis_boundaries_connector.fetch_data()
    assert len(zones) >= 5
    mpas = [z for z in zones if z.zone_type == "MPA"]
    assert len(mpas) >= 3
