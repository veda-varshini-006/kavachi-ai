import base64
import json
from typing import List, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader
from structlog import get_logger

logger = get_logger()

# In a real app this would be a strict OAuth2/OIDC setup.
# For demo purposes, we will expect a header: `X-Demo-Role`
# Or decode a dummy JWT. We will use a simplified header approach to ensure demo reliability
# while maintaining strict backend authorization blocks.

API_KEY_NAME = "X-Demo-Role"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_current_role(api_key: str = Depends(api_key_header)) -> str:
    """Returns the current role based on the X-Demo-Role header."""
    if not api_key:
        # Default to unauthenticated or "Citizen" if no header is present
        return "Citizen"
    return api_key

def require_role(allowed_roles: List[str]):
    """Dependency that enforces role-based access control."""
    def role_checker(role: str = Depends(get_current_role)):
        if role not in allowed_roles:
            logger.warning("authz.forbidden", role=role, allowed=allowed_roles)
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
        return role
    return role_checker
