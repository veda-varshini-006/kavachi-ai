# Kavach AI Threat Matrix & Indicators

This document details the threat taxonomy, classification signatures, and vulnerability vectors mapped on the Kavach AI digital safety platform.

## Coercion Scam Taxonomy

### 1. Bank Impersonation (Impersonation)
- **Signature**: Attacker calls claiming to represent state or commercial bank customer care cell.
- **Indicators**:
  - `TI-101`: Claims representation of bank authority without security PIN validation.
  - `TI-102`: Directs target to immediately transfer funds to "safety storage accounts".
- **Intervention**: Automatic temporary block on target bank UPI routing.

### 2. Legal / Police Coercion (Impersonation / Urgency)
- **Signature**: Caller claims to represent CBI, custom cell, or State Police claiming target's identity is linked to contraband.
- **Indicators**:
  - `TI-102`: Threatens instant digital arrest and freeze of assets within minutes.
  - `TI-101`: Instructs target to deposit clearance fees to private UPI accounts.
- **Intervention**: Citizen alert trigger, suspect account block audit.

### 3. Financial Counterfeits
- **Signature**: Injection of high-quality mock currency bills into transit nodes.
- **Indicators**:
  - `TI-103`: Bancknote serial matches sequence ranges flagged by RBI intelligence.
- **Intervention**: Police command coordinate marker on the Geospatial Map.

## Threat Indicator Code Registry

| Code | Name | Category | Severity | Description |
|------|------|----------|----------|-------------|
| **TI-101** | Impersonation Pattern | Identity Fraud | HIGH | Claiming official status without verified reverse authentications. |
| **TI-102** | Urgency Coercion | Social Engineering | CRITICAL | Demanding prompt wallet actions under digital arrest threats. |
| **TI-103** | Counterfeit Serial Alert | Financial Security | HIGH | Banknote serials matching reported counterfeit distributions. |
