import pytest
from backend.services.route_engine import route_engine
from backend.database.models import RiskLevel

def test_marine_route_calculation():
    # Mumbai to Goa
    routes = route_engine.calculate_marine_routes(
        orig_lat=18.9438,
        orig_lon=72.8389,
        dest_lat=15.4187,
        dest_lon=73.8010,
        origin_name="Mumbai Harbour",
        destination_name="Mormugao Port (Goa)"
    )
    assert len(routes) == 2
    
    alpha = routes[0]
    bravo = routes[1]

    assert alpha.total_distance_nm > 150.0
    assert bravo.total_distance_nm > 150.0
    assert len(alpha.waypoints) >= 4
    assert len(bravo.waypoints) >= 4
    assert bravo.safety_score >= alpha.safety_score
    assert "RECOMMENDED" in bravo.recommendation_verdict
