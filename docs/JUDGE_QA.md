# Judge Q&A Cheat Sheet

**Q: What is the novelty here? Aren't there already scam blockers?**
A: Most blockers rely on static blacklists or post-facto reporting. Kavach AI uses a rolling state machine to detect behavioral coercion *during* the interaction, fusing it with geospatial and graph data in real-time.

**Q: How do you handle False Positives blocking legitimate transactions?**
A: The AI does not block directly. It proposes a severity score to the `InterventionPolicyEngine`. The engine enforces cooldowns and routes ambiguous cases to the SOC for human-in-the-loop validation.

**Q: What about Privacy? Are you tracking citizens?**
A: We implement strict data redaction (PII masking) at the API level and enforce spatial jittering (adding noise to coordinates) and K-anonymity for map visualizations.

**Q: Does it support multiple languages?**
A: Yes, our synthetic evaluation proves stable Macro-F1 across English and Hindi/Regional transliterations using the NLP feature extractors.

**Q: Why a classical vision pipeline for counterfeit notes instead of Deep Learning?**
A: Classical pipelines (blur detection, exposure checks) run deterministically and rapidly offline without massive GPU requirements. They efficiently filter out low-quality uploads and flag obvious manipulation, routing the rest to human review.

**Q: Is the UPI freeze real?**
A: No, all banking, telecom, and police actions are strictly simulated prototype responses.

**Q: Can it handle high load?**
A: The decoupled EventBus and Transactional Outbox ensure events are processed reliably even under concurrent spikes, as validated by our integration tests.
