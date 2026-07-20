# Privacy & Data Handling

## Core Tenets
Kavach AI handles simulated citizen data with stringent privacy-preserving transformations.

## Data Redaction
- **Pydantic Field Masking:** Phone numbers, UPI IDs, and raw IPs are masked at the API boundary using `redaction.py`. Masked values appear as `+91-XXXXX-XX210` or `***@ybl`.
- **Reveal Privilege:** Analysts must explicitly pass `?reveal_sensitive=true` to unmask data, triggering a tamper-evident audit log.

## Spatial Jittering
- **Coordinate Jitter:** Precise latitude/longitude points are passed through a deterministic randomization function, injecting up to 500 meters of noise to prevent residential tracking.

## Hard Deletion
- Counterfeit scan images uploaded for evaluation are subject to hard-deletion workflows. The original `.jpg` is scrubbed from the `data/uploads/` directory, and a deletion tombstone is recorded.
