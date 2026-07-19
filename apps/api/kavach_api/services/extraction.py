import hashlib
import re
from typing import Any

from kavach_domain.schemas import EntityCreate, EntityType


class ExtractionService:
    @staticmethod
    def extract_phone_numbers(text: str) -> list[str]:
        # Simple extraction logic for demo
        matches = re.findall(r"\b\d{10}\b", text)
        return list(set(matches))
        
    @staticmethod
    def extract_upi_handles(text: str) -> list[str]:
        matches = re.findall(r"\b[\w\.\-]+@[\w\.\-]+\b", text)
        # Filter mostly looking for generic upi patterns
        return [m for m in matches if m.endswith("@ybl") or m.endswith("@okhdfcbank") or m.endswith("@upi") or m.endswith("@paytm")]
        
    @staticmethod
    def extract_aliases(text: str) -> list[str]:
        # Simplistic rule: "I am [Name]" or "my name is [Name]"
        aliases = []
        for match in re.finditer(r"(?i)(?:i am|my name is)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", text):
            aliases.append(match.group(1))
        return list(set(aliases))
        
    @staticmethod
    def extract_agency_claims(text: str) -> list[str]:
        claims = []
        agencies = ["CBI", "Police", "Customs", "FedEx", "TRAI", "RBI"]
        for agency in agencies:
            if re.search(rf"\b{agency}\b", text, re.IGNORECASE):
                claims.append(agency)
        return list(set(claims))
        
    @staticmethod
    def hash_pii(value: str, salt: str = "kavach-salt-42") -> str:
        return hashlib.sha256(f"{value}{salt}".encode("utf-8")).hexdigest()
        
    @staticmethod
    def normalize_entity(entity_type: EntityType, value: str) -> str:
        if entity_type == EntityType.PHONE:
            return re.sub(r"\D", "", value)
        if entity_type == EntityType.UPI_ID:
            return value.lower()
        if entity_type == EntityType.ALIAS:
            return value.title().strip()
        return value.strip()
        
    @staticmethod
    def fuzzy_match(entity1: str, entity2: str, entity_type: EntityType) -> dict[str, Any]:
        """
        Explainable fuzzy matching returning a confidence score, method, and explanation.
        """
        e1 = ExtractionService.normalize_entity(entity_type, entity1)
        e2 = ExtractionService.normalize_entity(entity_type, entity2)
        
        if e1 == e2:
            return {
                "matched": True,
                "confidence": 1.0,
                "method": "EXACT_MATCH",
                "explanation": f"Exact match for {entity_type.value}: {e1}"
            }
            
        if entity_type == EntityType.ALIAS:
            # Example fuzzy logic for names
            e1_parts = set(e1.lower().split())
            e2_parts = set(e2.lower().split())
            intersection = e1_parts.intersection(e2_parts)
            
            if len(intersection) > 0:
                confidence = len(intersection) / max(len(e1_parts), len(e2_parts))
                if confidence > 0.6:
                    return {
                        "matched": True,
                        "confidence": confidence,
                        "method": "PARTIAL_NAME_OVERLAP",
                        "explanation": f"Partial overlap in names '{e1}' and '{e2}' sharing {list(intersection)}"
                    }
                else:
                    return {
                        "matched": True,  # It's a weak match -> POSSIBLE_SAME_ACTOR
                        "confidence": confidence,
                        "method": "WEAK_NAME_OVERLAP",
                        "explanation": f"Weak overlap in names '{e1}' and '{e2}' sharing {list(intersection)}"
                    }
                    
        return {
            "matched": False,
            "confidence": 0.0,
            "method": "NONE",
            "explanation": "No match found."
        }
