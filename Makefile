##############################################################################
# Kavach AI — One-command project automation
# Usage:
#   make setup     — create venv and install all Python + Node deps
#   make seed      — generate deterministic synthetic demo data
#   make test      — run full test suite
#   make api       — start FastAPI backend (port 8000)
#   make web       — start Next.js frontend (port 3000)
#   make dev       — start both API and web in parallel
#   make clean     — remove generated data and databases
##############################################################################

SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -Command

PYTHON := .venv\Scripts\python.exe
PIP := .venv\Scripts\pip.exe
PYTEST := .venv\Scripts\pytest.exe

.DEFAULT_GOAL := help

##############################################################################
# Setup
##############################################################################

.PHONY: setup
setup:  ## Create virtualenv and install all dependencies
	@Write-Host "Creating virtual environment..." -ForegroundColor Cyan
	python -m venv .venv
	$(PYTHON) -m pip install --upgrade pip --quiet
	$(PIP) install -r requirements.txt -r requirements-dev.txt --quiet
	$(PIP) install -e packages/domain -e packages/config -e packages/synthetic-data -e apps/api --quiet
	@Write-Host "✓ Python environment ready" -ForegroundColor Green
	@Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
	cd apps\web; npm install --legacy-peer-deps --silent
	@Write-Host "✓ Node.js environment ready" -ForegroundColor Green
	@Write-Host "" 
	@Write-Host "✓ Setup complete! Run 'make dev' to start." -ForegroundColor Green

##############################################################################
# Data
##############################################################################

.PHONY: seed
seed:  ## Generate deterministic synthetic golden demo case in DB
	@Write-Host "Seeding database with golden case data..." -ForegroundColor Cyan
	$(PYTHON) -c "from kavach_synthetic_data.generator import seed_db; seed_db()"
	@Write-Host "✓ Seeding complete." -ForegroundColor Green

##############################################################################
# Tests
##############################################################################

.PHONY: test
test:  ## Run the full test suite
	@Write-Host "Running tests..." -ForegroundColor Cyan
	$(PYTEST) apps/api/tests/ -v --tb=short

##############################################################################
# Services
##############################################################################

.PHONY: api
api:  ## Start the FastAPI backend on port 8000
	@Write-Host "Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Cyan
	@Write-Host "Docs: http://localhost:8000/docs" -ForegroundColor Yellow
	$(PYTHON) -m uvicorn kavach_api.main:app --host 0.0.0.0 --port 8000 --reload --app-dir apps/api

.PHONY: web
web:  ## Start the Next.js frontend on port 3000
	@Write-Host "Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Cyan
	cd apps\web; npm run dev

.PHONY: dev
dev:  ## Start API + web concurrently (opens two terminals)
	@Write-Host "Starting development servers..." -ForegroundColor Cyan
	@Start-Process powershell -ArgumentList "-NoProfile -Command cd '$$PWD'; make api" -WindowStyle Normal
	@Start-Process powershell -ArgumentList "-NoProfile -Command cd '$$PWD'; make web" -WindowStyle Normal
	@Write-Host "✓ API  → http://localhost:8000/docs" -ForegroundColor Green
	@Write-Host "✓ Web  → http://localhost:3000" -ForegroundColor Green

##############################################################################
# Quality
##############################################################################

.PHONY: lint
lint:  ## Run ruff linter
	$(PYTHON) -m ruff check packages/ apps/api/kavach_api/ --fix

.PHONY: typecheck
typecheck:  ## Run mypy type check
	$(PYTHON) -m mypy packages/domain/kavach_domain/ packages/config/kavach_config/ --ignore-missing-imports

##############################################################################
# Cleanup
##############################################################################

.PHONY: clean
clean:  ## Remove database files and cache directories
	@if (Test-Path data\kavach.db) { Remove-Item -Force data\kavach.db }
	@if (Test-Path .pytest_cache) { Remove-Item -Recurse -Force .pytest_cache }
	@Write-Host "✓ Cleaned databases and caches" -ForegroundColor Green

.PHONY: clean-all
clean-all: clean  ## Remove everything including venv and node_modules
	@if (Test-Path .venv) { Remove-Item -Recurse -Force .venv }
	@if (Test-Path apps\web\node_modules) { Remove-Item -Recurse -Force apps\web\node_modules }
	@Write-Host "✓ Full clean complete" -ForegroundColor Green

##############################################################################
# Help
##############################################################################

.PHONY: help
help:  ## Show this help
	@Write-Host ""
	@Write-Host "Kavach AI — Development Commands" -ForegroundColor Cyan
	@Write-Host "======================================" -ForegroundColor Cyan
	@Write-Host ""
	@Write-Host "  make setup    Create venv, install Python + Node deps" -ForegroundColor White
	@Write-Host "  make seed     Generate deterministic demo database seed" -ForegroundColor White
	@Write-Host "  make test     Run full test suite" -ForegroundColor White
	@Write-Host "  make api      Start FastAPI backend  → http://localhost:8000" -ForegroundColor White
	@Write-Host "  make web      Start Next.js frontend → http://localhost:3000" -ForegroundColor White
	@Write-Host "  make dev      Start both in separate terminal windows" -ForegroundColor White
	@Write-Host "  make lint     Run ruff linter" -ForegroundColor White
	@Write-Host "  make clean    Remove generated databases" -ForegroundColor White
	@Write-Host ""
