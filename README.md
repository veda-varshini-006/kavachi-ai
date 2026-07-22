# Kavach AI - Digital Public Safety Intelligence Hub

![Kavach AI Architecture](docs/SYSTEM_DESIGN.md)

**Kavach AI** is a state-of-the-art Digital Public Safety Intelligence Hub designed to bridge the gap between reactive policing and proactive intervention. In an era where cybercrimes—such as "Digital Arrest" schemes, KYC fraud, and impersonation extortion—are escalating rapidly, Kavach AI offers a unified command center for law enforcement and cybersecurity agencies.

By integrating real-time Natural Language Processing (NLP), classical computer vision, geospatial intelligence, and graph analytics, the platform detects ongoing scams, verifies physical evidence, and maps out sophisticated fraud syndicates. All operations are underpinned by strict privacy constraints, K-anonymity protocols, and a tamper-evident Merkle-chain audit log to ensure chain-of-custody for legal proceedings.

> [!WARNING]
> **Simulated Prototype Boundary**: This application is a decision-support prototype. It does not connect to real telecom providers, banking networks, or police dispatch systems. All "actions" are simulated.

## 🚀 Core Features

- **Real-Time Call Coercion Engine**: Processes live telecom call transcripts using a rolling state machine to detect "Digital Arrest" and KYC fraud before money is lost.
- **Security Operations Center (SOC)**: A centralized dashboard for human analysts to review active threats, triage cases, and authorize intervention actions.
- **Geospatial Hotspot Map**: K-anonymity privacy-preserving visualizations of scam incidents to coordinate physical police response without compromising individual citizen privacy.
- **Counterfeit Note Scanner**: Deterministic classical vision pipeline to screen uploaded currency images for field agents.
- **Fraud Linkage Graph**: Cybercrime network visualizations using Cytoscape.js to reveal organized syndicates.
- **Merkle-Chain Auditing**: Tamper-evident transaction logs for SOC investigations, ensuring non-repudiation in legal contexts.

## ⚙️ Quick Start

```bash
# 1. Install dependencies
make setup

# 2. Start the application
make dev
```
Navigate to `http://localhost:3000` to view the dashboard.

*Note: For Windows environments where `make` is unavailable, you can manually install dependencies via Python venv/pip and npm, then run the Next.js frontend (`npm run dev`) and FastAPI backend (`uvicorn kavach_api.main:app`) separately.*

## 🎮 Demo Credentials & Scenario Instructions

- Role assignment is handled via `X-Demo-Role` headers (simulated).
- To launch the pre-configured golden demo, navigate to `http://localhost:3000/demo-control`. 
- Use the **Call Simulator** to inject the `DIGITAL_ARREST` test sequence and watch the system escalate the threat level in real-time.

## 📚 Project Documentation

For a deep dive into the architecture, evaluation metrics, and security posture, please review the following technical documents:

- [System Design & Architecture](docs/SYSTEM_DESIGN.md)
- [Evaluation Protocol](docs/EVALUATION_PROTOCOL.md)
- [Privacy & Data Handling](docs/PRIVACY.md)
- [Ethics & Limitations](docs/ETHICS_AND_LIMITATIONS.md)
- [Security Posture](docs/SECURITY.md)
