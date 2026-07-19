# Kavach AI Synthetic Data Policy

To ensure complete privacy and compliance with digital safety regulations, Kavach AI strictly employs synthetic and mocked variables across all demonstration dashboards.

## Strict Mock Guidelines

1. **Target Phone Numbers**:
   - Mapped to ranges containing fictional prefixes or non-standard configurations (e.g. `+91-98765-43210`).
   - No real citizen telecom lines are monitored.

2. **UPI Wallet Identifiers**:
   - UPI addresses (e.g. `secure-safety@ybl`, `clearance-depot@paytm`) are registered as mock variables.
   - No payment routing is performed.

3. **Geospatial Coordinates**:
   - Location coordinates are offset or mapped to generic coordinates (e.g. Noida Sector 62, Delhi Connaught Place) for visual interface testing.
   - Telemetry details are mock generated.

4. **Counterfeit banknote serials**:
   -banknote numbers are procedurally generated (e.g. `5EF678901`).
   - No forensic verdicts reflect actual legal currency.

## Development Mode Controls
- The reset endpoint `/api/v1/dev/reset` instantly wipes database tables and seeds mock objects to prevent persistent data contamination.
