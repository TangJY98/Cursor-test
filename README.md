# Agent Chat App（v1）

Traditional Chinese streaming chat application built with **assistant-ui** (frontend) and **Agno AgentOS** (backend).

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js 20+ and [pnpm](https://pnpm.io/)
- Vercel AI Gateway API key (`AI_GATEWAY_API_KEY`)

## Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and set AI_GATEWAY_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
# Default: VITE_AGUI_AGENT_URL=http://localhost:7777/agui
```

## Canonical Commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `make dev` | Start backend + frontend |
| `make dev-backend` | AgentOS server only (port 7777) |
| `make dev-frontend` | Vite dev server only (port 5173) |
| `make health` | Check `GET /status` |
| `make test` | Run backend and frontend tests |
| `make lint` | Run linters |

## Quick Start

```bash
make dev
```

Open [http://localhost:5173](http://localhost:5173), send a message in Traditional Chinese, and observe the streaming reply.

For full validation scenarios (health check, env-based backend URL, edge cases), see [specs/001-agent-chat-app/quickstart.md](specs/001-agent-chat-app/quickstart.md).

## Architecture

- **Frontend**: React 19 + Vite + assistant-ui (`@assistant-ui/react-ag-ui`) → `POST /agui` (SSE)
- **Backend**: Agno AgentOS + AG-UI interface → Vercel AI Gateway (`google/gemini-2.5-flash-lite`)

## Configuration

| Variable | Location | Description |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | `backend/.env` | Vercel AI Gateway API key (required) |
| `AI_GATEWAY_BASE_URL` | `backend/.env` | Gateway base URL (default: `https://ai-gateway.vercel.sh/v1`) |
| `AGENT_MODEL_ID` | `backend/.env` | Model ID (default: `google/gemini-2.5-flash-lite`) |
| `VITE_AGUI_AGENT_URL` | `frontend/.env` | AG-UI endpoint (default: `http://localhost:7777/agui`) |

## Project Structure

```text
backend/src/agent_chat/   # Agno AgentOS + AG-UI server
frontend/src/             # React + assistant-ui chat UI
specs/001-agent-chat-app/  # Feature specification and plan
```
