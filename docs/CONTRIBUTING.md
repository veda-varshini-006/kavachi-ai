# Contributing to Kavach AI

Thank you for your interest in Kavach AI!

## Development Setup
1. Clone the repository.
2. Run `make setup` to configure dependencies.
3. Use `make dev` to boot local servers.

## Pull Request Guidelines
- All PRs must pass the Github Actions CI pipeline (Linting, Typing, Pytest).
- Ensure new features include updated unit and integration tests.
- Do not bypass the `ThreatModelProvider` or `InterventionPolicyEngine` restrictions.

## Security Disclosures
If you discover a security vulnerability or privacy leak (e.g., inadequate spatial jittering), please report it to the maintainers directly instead of opening a public issue.
