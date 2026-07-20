# Operations & Deployment

## Setup & Execution
The application uses standard `make` and `npm` commands for lifecycle management. 
- `make setup` - Configures the environment and installs dependencies.
- `make dev` - Boots the FastAPI backend and Next.js frontend concurrently.
- `make test` - Runs the comprehensive pytest suite.

## Data Architecture
By default, the application runs on a local SQLite file database (`data/kavach.db`).
- **Seeding:** The database can be safely rebuilt using the seed route `/api/v1/dev/seed` or the `verify.ps1` script.

## Fallback Mechanisms
- The Map dashboard falls back to bundled GeoJSON files if internet connection is lost.
- The Counterfeit Scanner operates fully locally using classical algorithms, removing cloud dependencies.
