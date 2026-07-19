# Kavach AI Architecture Specification

Kavach AI is designed as a modular, containerized digital public safety intelligence platform. The first vertical slice focuses on real-time scam call interception, threat verdict generation, and automated financial locks.

## System Block Diagram

```mermaid
graph TD
    classDef default fill:#0B1528,stroke:#1E293B,stroke-width:1px,color:#e2e8f0;
    classDef highlight fill:#0D9488,stroke:#06B6D4,stroke-width:2px,color:#fff;
    classDef warning fill:#D97706,stroke:#F59E0B,stroke-width:1px,color:#fff;

    subgraph UserInterface["apps/web (Next.js 15 + React 19)"]
        A["Overview Dashboard"]
        B["Call Intercept Simulator"]:::highlight
        C["SOC Command Console"]
        D["Cases & Notes Index"]
        E["Fraud Network (SVG)"]
        F["Geospatial Map (SVG)"]
    end

    subgraph ServiceLayer["apps/api (FastAPI + Python)"]
        G["FastAPI App (main.py)"]
        H["WebSocket Stream Manager"]:::highlight
        I["Scam Threat Rules Engine"]
        J["Database Handler (database.py)"]
    end

    subgraph SharedLibraries["packages/ (Python Modules)"]
        K["packages/domain"]
        L["packages/config"]
        M["packages/synthetic-data"]:::warning
    end

    subgraph DatabaseLayer["Data Storage"]
        N[("SQLite / PostgreSQL")]
    end

    %% Flow links
    B <-->|WS events stream| H
    A & C & D & E & F -->|HTTP Requests| G
    H & I --> J
    G --> I
    J --> N
    
    G -.->|Loads| K & L & M
```

## Real-Time Event Flow

1. **Incoming VoIP Connection**: A citizen call is simulation-started on the Call Simulator frontend.
2. **Audio Transcription Segment**: The audio stream is chunked. Segments are pushed to the backend WebSocket stream `/api/v1/sessions/{id}/stream`.
3. **Risk Scoring Engine**: The backend evaluates segments against `ThreatIndicator` regex definitions (e.g. Identity Impersonation patterns).
4. **Scam Verdict Generation**: A `ThreatVerdict` (SAFE, SUSPICIOUS, CRITICAL) is updated.
5. **Simulated Interventions**: If CRITICAL, the backend emits `BLOCK_UPI` instructions, blocks the suspect wallet, updates the incident case log, and informs the SOC Dashboard.
