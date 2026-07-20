# Clean Machine Validation

This protocol verifies that Kavach AI can be started from scratch on a clean machine (e.g., a judge's laptop).

## Pre-requisites
- Python 3.10+
- Node.js 18+

## Validation Steps
1. **Clone the repo:** `git clone <repo_url> && cd kavachi-ai-main`
2. **Install all:** `make setup` (Verifies pip and npm installs)
3. **Verify tests:** `make test` (Verifies isolated pytest environment)
4. **Seed database:** `./verify.ps1` (Verifies database creation and population)
5. **Run stack:** `make dev`
6. **Navigate:** Open browser to `http://localhost:3000`. No errors should appear in console.

If these steps pass, the machine is validated.
