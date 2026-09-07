import pytest
from backend.orchestration.orca_orchestrator import orca_orchestrator
from backend.utils.llm_client import llm_client

def test_greeting_intent():
    res = orca_orchestrator.process_query("hi", language="en")
    assert res.intent == "greeting"
    assert "ORCA" in res.synthesized_response
    assert "Welcome aboard" in res.synthesized_response
    # Greeting should not have forced a weather table
    assert res.risk_assessment is None

def test_vernacular_greetings():
    # Hindi
    res_hi = orca_orchestrator.process_query("namaste", language="hi")
    assert res_hi.intent == "greeting"
    assert "नमस्ते" in res_hi.synthesized_response

    # Tamil
    res_ta = orca_orchestrator.process_query("vanakkam", language="ta")
    assert res_ta.intent == "greeting"
    assert "வணக்கம்" in res_ta.synthesized_response

    # Malayalam
    res_ml = orca_orchestrator.process_query("namaskaram", language="ml")
    assert res_ml.intent == "greeting"
    assert "നമസ്കാരം" in res_ml.synthesized_response

def test_out_of_domain_guardrail():
    res = orca_orchestrator.process_query("who won the cricket match yesterday?", language="en")
    assert res.intent == "out_of_domain"
    assert "Guardrail" in res.synthesized_response
    assert "Marine Ecosystem Reasoning" in res.synthesized_response
    assert res.risk_assessment is None

def test_marine_knowledge_kallakkadal():
    res = orca_orchestrator.process_query("what is kallakkadal?", language="en")
    assert res.intent == "marine_knowledge"
    assert "Kallakkadal" in res.synthesized_response
    assert "Southern Ocean" in res.synthesized_response or "swell surge" in res.synthesized_response.lower()

def test_marine_knowledge_port_signals():
    res = orca_orchestrator.process_query("explain port signals 1 to 11", language="en")
    assert res.intent == "marine_knowledge"
    assert "Port Warning Signals" in res.synthesized_response
    assert "Signal 1" in res.synthesized_response

def test_operational_query_retains_telemetry():
    res = orca_orchestrator.process_query("Is it safe to sail from Kochi tomorrow morning?", language="en")
    assert res.intent in ["sea_safety_assessment", "general_marine_query"]
    assert res.target_location == "Cochin Port (Kochi)"
    assert res.risk_assessment is not None
    assert len(res.execution_trace) >= 6
