# Kavach AI Architectural Decisions Log

This document tracks technical design choices made during the development of the Kavach AI platform.

## ADR-001: Monorepo Folder Structure
- **Decision**: Adopt a clear decoupled structure with Python namespace libraries under `packages/` and services under `apps/`.
- **Consequence**: Ensures clear separations of domain logic (`packages/domain`), environment settings (`packages/config`), and synthetic mocks (`packages/synthetic-data`).

## ADR-002: Default SQLite Storage
- **Decision**: default to SQLite file database `data/kavach.db` for rapid local run tests with standard SQLAlchemy 2 engines.
- **Consequence**: Eliminates complex Docker setups for local developers. Fallback connection parameters to PostgreSQL compose containers remain active via standard URL env overrides.

## ADR-003: SVG-based Graph and Map Canvases
- **Decision**: Build interactive SVG-based canvases inside Next.js routes for both network graph linkages and coordinate plots.
- **Consequence**: Avoids massive D3 or React-Leaflet packages, maintaining lightweight page sizes, absolute responsive resizings, and 100% theme consistency.

## ADR-004: Abstracted Speech to Text Provider
- **Decision**: Define a generic `SpeechToTextProvider` interface with a local scripted provider loading from `scenarios.json` and a local Whisper integration provider.
- **Consequence**: Eliminates the need for paid cloud-based STT keys while allowing offline development, deterministic playback testing, and local mic capture simulations.

## ADR-005: Sequence Sync & Deduplication Protocol
- **Decision**: Implement sequence numbers, idempotency keys, and reconnect sync handshake over WebSocket streams.
- **Consequence**: Prevents transcript duplication, supports out-of-order segment handling, and enables seamless state recovery during network drops.

## ADR-006: Rolling State-Machine Coercion Engine
- **Decision**: Build a deterministic rules-based rolling state machine (`NORMAL -> CONCERN -> COERCION -> FINANCIAL_ACTION`) that tracks 12 distinct indicators and applies negative counter-evidence discounts.
- **Consequence**: Ensures reliable, high-fidelity threat classifications without dependency on external AI cloud systems. Captures sequences of behavioral patterns instead of isolated keywords.

## ADR-007: Prompt-Injection Sanitizer Adapter
- **Decision**: Wrap optional LLM reasoners in a `ThreatModelProvider` interface that enforces sanitization filters to reject adversarial commands (e.g. "ignore previous instructions") inside transcripts.
- **Consequence**: Protects decision-support pipelines from caller-side injection attacks designed to alter verdicts or formatting instructions.

## ADR-008: Decoupled Intervention Policy Engine
- **Decision**: Separate raw model verdicts from authorized actions by inserting an `InterventionPolicyEngine`. Authorization rules evaluate indicator severities, confidence, and cooldowns.
- **Consequence**: Protects pay rails and warning indicators from direct, unfiltered machine recommendations. Ensures stable, auditable, and mock-controlled operations.

## ADR-009: Merkle-Chain Append-Only Auditing
- **Decision**: Secure all state modifications (e.g. status changes, note postings, deletions) using sequential SHA-256 block hashes pointing to the previous event block hash (Merkle chain pointer).
- **Consequence**: Provides built-in tamper-evidence. If any audit log entry or payload detail is modified in the database, the hash verification breaks immediately.

## ADR-010: Field-Level Selective Data Redaction
- **Decision**: Implement field masking rules in `redaction.py` for phone, UPI, IP, device, and location inputs. Analysts must request `reveal_sensitive=true` to view the synthetic values.
- **Consequence**: Protects citizen PII during normal operations, audits, and case evidence package exports.

## DEC-007: Event Bus & Transactional Outbox
**Date:** 2026-07-19
**Context:** Need reliable event processing without heavy dependencies like Kafka/RabbitMQ for the demo.
**Decision:** Implemented a SQLAlchemy-backed Transactional Outbox table (`EventOutbox`). Events are written in the same transaction as state changes. A background `asyncio` task polls the outbox and dispatches events. Failures are sent to a `DeadLetter` table.
**Consequences:** Ensures atomic writes and at-least-once delivery. Lightweight and self-contained.

## DEC-008: Deterministic Replay Service
**Date:** 2026-07-19
**Context:** Need robust ways to demonstrate the application capabilities in a reproducible manner.
**Decision:** Implemented `ScenarioReplayService` that reads from `kavach_synthetic_data/scenarios.json` and injects transcripts, creating sessions programmatically. Exposed via `/demo-control` UI.
**Consequences:** Replaces manual microphone clicking with fast, reproducible golden scenarios, ideal for high-stakes presentations.

## ADR-011: Classical Banknote Quality & Screening Pipeline
- **Decision**: Implement classical image properties processing (using Pillow and numpy edge/channel statistics) to validate note aspect, blur, exposure glare, and template drift deviation.
- **Consequence**: Avoids massive neural model dependencies or external key requirements. Ensures rapid, deterministic screening checks. Routes low quality inputs directly to manual review.

## ADR-012: Banknote Storage & Original Image Hard Deletion Privacy Control
- **Decision**: Store uploaded images on server disk under `data/uploads/` temporarily, exposing a manual "Delete Original Image" action button linked to a hard-delete endpoint.
- **Consequence**: Ensures compliance with security and privacy requirements by eliminating unnecessary retention of raw currency uploads.

## ADR-013: High-Performance Offline Map Rendering (MapLibre + deck.gl)
- **Decision**: Replace SVG map canvas with `maplibre-gl` and `deck.gl` to render geospatial plots. Bundle offline GeoJSON boundaries for zero-internet environments.
- **Consequence**: Improves spatial mapping performance and supports complex temporal heatmaps, while maintaining strict offline availability requirements for critical infrastructure deployment.

## ADR-014: Mandatory Spatial Privacy Transformations
- **Decision**: All API geolocations (hotspots, discrete events) must be transformed by `GeospatialService` via coordinate jittering (random noise) or grid-cell coarsening.
- **Consequence**: Enforces citizen privacy by never serving precise private residential coordinates to the frontend, even if analysts bypass UI masking controls. Prevents individual re-identification.
