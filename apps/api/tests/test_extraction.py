import pytest
from kavach_api.services.extraction import ExtractionService
from kavach_domain.schemas import EntityType


def test_extract_phone_numbers():
    text = "Call me at 9876543210 or maybe 1234567890."
    phones = ExtractionService.extract_phone_numbers(text)
    assert len(phones) == 2
    assert "9876543210" in phones
    assert "1234567890" in phones

def test_extract_upi_handles():
    text = "Transfer to secure-safety@ybl or scammer@paytm immediately."
    upis = ExtractionService.extract_upi_handles(text)
    assert len(upis) == 2
    assert "secure-safety@ybl" in upis
    assert "scammer@paytm" in upis

def test_extract_aliases():
    text = "I am CBI Officer Sharma. My name is Rajesh Kumar."
    aliases = ExtractionService.extract_aliases(text)
    assert len(aliases) == 2
    assert "CBI Officer" in aliases or "Officer Sharma" in aliases
    
def test_normalize_entity():
    assert ExtractionService.normalize_entity(EntityType.PHONE, "+91-98765-43210") == "919876543210"
    assert ExtractionService.normalize_entity(EntityType.UPI_ID, "Scammer@YBL") == "scammer@ybl"
    assert ExtractionService.normalize_entity(EntityType.ALIAS, " rajesh  kumar ") == "Rajesh  Kumar"
    
def test_fuzzy_match_exact():
    res = ExtractionService.fuzzy_match("+91-12345-67890", "911234567890", EntityType.PHONE)
    assert res["matched"] is True
    assert res["confidence"] == 1.0
    assert res["method"] == "EXACT_MATCH"
    
def test_fuzzy_match_alias_weak():
    res = ExtractionService.fuzzy_match("Rajesh Kumar", "Rajesh Sharma", EntityType.ALIAS)
    assert res["matched"] is True
    assert res["method"] == "WEAK_NAME_OVERLAP"
    assert res["confidence"] == 0.5
