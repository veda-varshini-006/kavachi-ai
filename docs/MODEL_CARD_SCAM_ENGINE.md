# Model Card: Scam Coercion Engine

## Overview
- **Name:** Kavach Risk & Coercion Engine
- **Type:** Rules-based Rolling State Machine & Pattern Matcher
- **Version:** 1.0.0 (Prototype)

## Intended Use
- **Primary Use Case:** Real-time evaluation of telephonic or digital communication transcripts to detect coercion, scams, and financial fraud vectors.
- **Out of Scope:** It does not predict future criminal intent nor should it be used for automated legal sentencing. It serves strictly as decision-support for human analysts.

## Factors & Indicators
Evaluates multiple severity indicators:
- `ISOLATION_ATTEMPT` (e.g., "don't tell your family")
- `AUTHORITY_IMPERSONATION` (e.g., "CBI Officer", "Customs")
- `URGENCY_THREAT` (e.g., "arrest you immediately")
- `SECRECY_DEMAND`
- `FINANCIAL_DIRECTIVE`

## Performance & Limitations
- **Evaluation:** Achieves stable Macro-F1 across English and Hindi transliterations using synthetic benchmarks.
- **Limitations:** Dependent on the quality of transcriptions. Adversarial prompts (e.g. prompt injection) are mitigated by the `ThreatModelProvider` adapter, but zero-day linguistic evasion is possible.
