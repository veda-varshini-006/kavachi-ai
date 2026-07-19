# Kavachi AI - Advanced Cyber Defense Dashboard

Kavachi AI is an advanced prototype for cyber defense, forensic case management, and data compliance visualization. Built iteratively, this project demonstrates a highly robust web dashboard and API backend tailored for forensic and intelligence-level cyber security.

## Current Project Status
- **Implementation Status:** 9 Prompts Completed out of 10
- **Overall Completion:** ~97% Complete
- **Latest Phase Completed:** Production Hardening (Prompt 9)

## Key Features Built
1. **Full-stack API & Web Dashboard**: Developed a FastAPI backend and a NextJS frontend connected via REST and WebSockets.
2. **Data-Subject Request (DSR) & Privacy Compliance**: Deeply integrated privacy auditing, granular redaction rules (PII masking), and data-export capabilities compliant with security standards.
3. **Counterfeit Detection & Intelligence Fusion**: Features a robust `Counterfeit Screening Core` and `ScenarioReplayService` capable of categorizing anomalous incidents and linking them in a relational knowledge graph.
4. **Comprehensive Telemetry (Observability)**: Packed with pre-flight check tools, Grafana dashboards, and Prometheus data scraping integrations out-of-the-box.
5. **CI/CD Integration**: Secure GitHub actions for Python typing (`mypy`), linting (`ruff`), NextJS accessibility audits (`eslint-plugin-jsx-a11y`), and automated SBOM (Software Bill of Materials) generation via Syft.
6. **Load & Resilience Testing**: Fault injection routes and synthetic load tests built directly into the codebase.

## Quick Start
The project relies on Docker Compose for a seamless startup of the entire stack.

```bash
# 1. Bring up the stack (API, Web UI, Postgres Database, Prometheus, and Grafana)
docker compose up --build

# 2. Run the database seeder to populate synthetic events
curl -X POST "http://localhost:8000/api/v1/dev/seed" -H "X-Demo-Role: Admin"
```

## Dashboard Services
- **Web UI:** `http://localhost:3000`
- **FastAPI Docs:** `http://localhost:8000/docs`
- **Grafana Telemetry:** `http://localhost:3001` (Credentials: admin / admin)

## License
Proprietary Prototype.
