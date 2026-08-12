.PHONY: dev dev-backend dev-frontend health test lint test-backend test-frontend lint-backend lint-frontend

BACKEND_DIR := backend
FRONTEND_DIR := frontend
PYTHONPATH := $(CURDIR)/$(BACKEND_DIR)/src
PYTHON := env PYTHONPATH=$(PYTHONPATH) uv run --directory $(BACKEND_DIR)

dev-backend:
	$(PYTHON) python -m agent_chat.app

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

dev:
	$(MAKE) -j2 dev-backend dev-frontend

health:
	@echo "Checking backend health at http://localhost:7777/status ..."
	@response=$$(curl -sf http://localhost:7777/status) && \
		echo "$$response" && \
		echo "$$response" | grep -Eq '"status"\s*:\s*"(ok|available)"' && \
		echo "PASS: backend is healthy" || \
		(echo "FAIL: backend unhealthy or unreachable" && exit 1)

test-backend:
	$(PYTHON) pytest -q

test-frontend:
	cd $(FRONTEND_DIR) && pnpm test

test:
	$(MAKE) test-backend
	$(MAKE) test-frontend

lint-backend:
	$(PYTHON) ruff check src tests

lint-frontend:
	cd $(FRONTEND_DIR) && pnpm lint

lint:
	$(MAKE) lint-backend
	$(MAKE) lint-frontend
