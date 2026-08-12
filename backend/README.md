# Backend

Agno AgentOS backend with AG-UI interface, routed through Vercel AI Gateway (`google/gemini-2.5-flash-lite`).

## Setup

```bash
cp .env.example .env
# Set AI_GATEWAY_API_KEY in .env
uv sync --directory backend --extra dev
```

## Run

```bash
make dev-backend
make health
```

## Test

```bash
make test-backend
make lint-backend
```
