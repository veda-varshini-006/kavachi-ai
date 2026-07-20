# Ethics & Limitations

## Prototype Boundaries
**Kavach AI is an evaluation prototype.** It is not connected to real banking, telecom, or government networks. All interactions, data blocks, and interventions demonstrated are synthetic simulations.

## False Positives
- The Scam Coercion Engine favors recall over precision. It is tuned to alert operators of potential coercion (False Positives) rather than miss critical threats (False Negatives). This requires human-in-the-loop validation for all generated cases.

## Algorithmic Bias
- While the evaluation dataset covers English and regional transliterations, true dialect scaling requires substantial real-world data gathering that is out of scope for this prototype.

## Human-in-the-Loop Requirement
- AI models propose severities, but financial actions (e.g. account blocks) or law enforcement dispatches **must** be approved by a verified Analyst. The `InterventionPolicyEngine` enforces this disconnect.
