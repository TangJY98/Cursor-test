.PHONY: dev dev-backend dev-frontend health test lint test-backend lint-backend

BACKEND_DIR := backend
PYTHONPATH := $(CURDIR)/$(BACKEND_DIR)/src
PYTHON := env PYTHONPATH=$(PYTHONPATH) uv run --directory $(BACKEND_DIR)

dev-backend:
	$(PYTHON) python -m agent_chat.app

dev-frontend:
	@echo "Frontend not implemented yet. Run frontend phase separately."
	@exit 1

dev:
	@echo "Starting backend only (frontend not implemented)."
	$(MAKE) dev-backend

health:
	@echo "Checking backend health at http://localhost:7777/status ..."
	@curl -sf http://localhost:7777/status | tee /dev/stderr | grep -Eq '"status"\s*:\s*"(ok|available)"' && \
		echo "PASS: backend is healthy" || \
		(echo "FAIL: backend unhealthy or unreachable" && exit 1)

test-backend:
	$(PYTHON) pytest -q

test:
	$(MAKE) test-backend

lint-backend:
	$(PYTHON) ruff check src tests

lint:
	$(MAKE) lint-backend
