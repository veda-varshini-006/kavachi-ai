# Kavach AI - Digital Public Safety Intelligence Hub

![Kavach AI Architecture](docs/SYSTEM_DESIGN.md)

**Kavach AI** is a prototype Digital Public Safety Intelligence Hub designed to detect scam coercion in real-time, screen suspect currency, link fraud networks, and coordinate geospatial response. 

> [!WARNING]
> **Simulated Prototype Boundary**: This application is a decision-support prototype. It does not connect to real telecom providers, banking networks, or police dispatch systems. All "actions" are simulated.

## Features
- **Real-Time Call Coercion Engine**: Processes call transcripts to detect "Digital Arrest" and KYC fraud using a rolling state machine.
- **Geospatial Hotspot Map**: K-anonymity privacy-preserving visualizations of scam incidents.
- **Counterfeit Note Scanner**: Deterministic classical vision pipeline to screen uploaded currency.
- **Fraud Linkage Graph**: Cybercrime network visualizations using Cytoscape.js.
- **Merkle-Chain Auditing**: Tamper-evident transaction logs for SOC investigations.

## Quick Start
```bash
# 1. Install dependencies
make setup

# 2. Start the application
make dev
```
Navigate to `http://localhost:3000` to view the dashboard.

## Demo Credentials & Scenario Instructions
- Role assignment is handled via `X-Demo-Role` headers (simulated).
- To launch the pre-configured golden demo, navigate to `http://localhost:3000/demo-control`. 
- Use the **Call Simulator** to inject the `DIGITAL_ARREST` test sequence.

## Documentation
- [System Design](docs/SYSTEM_DESIGN.md)
- [Evaluation Protocol](docs/EVALUATION_PROTOCOL.md)
- [Privacy & Data](docs/PRIVACY.md)
- [Ethics & Limitations](docs/ETHICS_AND_LIMITATIONS.md)
- [Security](docs/SECURITY.md)
