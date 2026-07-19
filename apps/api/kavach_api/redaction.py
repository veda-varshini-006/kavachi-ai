
def redact_field(value: str | None, field_type: str, enabled: bool = True) -> str | None:
    """Mask sensitive fields for compliance verification views unless redaction is bypassed."""
    if value is None:
        return None
    if not enabled:
        return value

    field_type = field_type.lower()

    if field_type == "phone":
        # e.g., +91-99999-88888 -> +91-XXXXX-XX888
        if len(value) >= 7:
            return value[:-5] + "XX" + value[-3:]
        return "XXXXXXX"

    elif field_type == "upi":
        # e.g., user@ybl -> u***@ybl
        if "@" in value:
            name, domain = value.split("@", 1)
            if len(name) > 1:
                return name[0] + "***" + "@" + domain
            return "***@" + domain
        return "***"

    elif field_type == "account":
        # e.g., 1234567890 -> ******7890
        if len(value) >= 4:
            return "*" * (len(value) - 4) + value[-4:]
        return "****"

    elif field_type == "device":
        # e.g., dev-1234 -> de******
        if len(value) > 2:
            return value[:2] + "*" * (len(value) - 2)
        return "***"

    elif field_type == "ip":
        # e.g., 192.168.1.1 -> 192.168.X.X
        parts = value.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.X.X"
        return "X.X.X.X"

    elif field_type == "location":
        return "[REDACTED LOCATION]"

    return value
