# Evaluation Protocol

## Methodology
Kavach AI implements a deterministic, offline-capable evaluation harness to validate engine changes. The protocol ensures that updates to the coercion logic or vision thresholds do not introduce severe regressions.

## 1. Scam Coercion Validation
- **Tool:** `scripts/run_evaluations.py` -> `run_benchmark()`
- **Metrics:** Precision, Recall, Macro-F1, FPR.
- **Protocol:** A stratified dataset of 200 mock transcripts across 6 categories is replayed through the rolling state machine. Results must maintain an F1 > 0.85 before a merge is approved.

## 2. Counterfeit Validation
- **Tool:** `/api/v1/counterfeit/evaluation`
- **Metrics:** Accuracy, False Acceptance Rate (FAR), False Rejection Rate (FRR), Abstention Rate.
- **Protocol:** The classical vision provider scans dynamically perturbed synthetic templates. High abstention is acceptable for edge cases (e.g. extreme blur), but FAR must remain near 0.

## 3. Geospatial Privacy Check
- **Tool:** `pytest apps/api/tests/test_geospatial.py`
- **Metrics:** Suppression thresholds, grid snapping validation.
- **Protocol:** Ensures K-anonymity-like aggregation drops locations with incident counts below the minimum threshold.
