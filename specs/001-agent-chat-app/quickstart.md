# Quickstart: Agent Chat App（v1）

**Date**: 2026-08-12  
**Feature**: `specs/001-agent-chat-app`

End-to-end validation guide. See [data-model.md](./data-model.md) and [contracts/api.md](./contracts/api.md) for details — not duplicated here.

## Prerequisites

- **Python** 3.11+
- **uv** (package manager)
- **Node.js** 20+ and **pnpm**
- **Vercel AI Gateway API key** (`AI_GATEWAY_API_KEY`)
- Repository cloned with plan artifacts present

## Environment Setup

```bash
# Backend (copy backend/.env.example and fill in your key)
export AI_GATEWAY_API_KEY=gw_...
export AI_GATEWAY_BASE_URL=https://ai-gateway.vercel.sh/v1
export AGENT_MODEL_ID=google/gemini-2.5-flash-lite

# Frontend (.env in frontend/)
echo 'VITE_AGUI_AGENT_URL=http://localhost:7777/agui' > frontend/.env
```

## Canonical Commands

All commands run from repository root:

| Command | Purpose |
| --- | --- |
| `make dev` | Start backend + frontend |
| `make dev-backend` | AgentOS server only (port 7777) |
| `make dev-frontend` | Vite dev server only (port 5173) |
| `make health` | Check `GET /status` |
| `make test` | Run all tests |
| `make lint` | Run linters |

> Commands are defined in root `Makefile` during implementation (`/speckit-implement`).

## Validation Scenarios

### VS-1: Health check (User Story 2)

**Goal**: Confirm backend is ready without using chat UI.

```bash
make dev-backend
# wait for server ready
make health
```

**Expected**:
- Exit code `0`
- Response includes healthy status (see [contracts/api.md](./contracts/api.md#get-status))

**Failure check**: Stop backend, run `make health` → non-zero exit or unhealthy status.

---

### VS-2: Streaming chat (User Story 1)

**Goal**: Send 繁體中文 message and see streaming reply.

```bash
make dev
```

1. Open `http://localhost:5173` in browser.
2. Type `你好` in composer and send.
3. Observe:
   - User message appears immediately.
   - Assistant reply streams token-by-token in 繁體中文.
   - Loading/in-progress indicator visible until complete.
4. Send `今天天氣如何？` as second message.
5. Observe both exchanges visible in order in single thread.

**Expected** (maps to SC-001, SC-002):
- Full round-trip completable in < 30 seconds.
- First reply content visible within 3 seconds of send.

---

### VS-3: Environment variable backend URL (User Story 3)

**Goal**: Frontend connects to backend via env var.

1. Stop frontend.
2. Set `VITE_AGUI_AGENT_URL=http://localhost:7777/agui` in `frontend/.env`.
3. Restart: `make dev-frontend`.
4. Repeat VS-2 step 2–3 → streaming works.

**Failure check**:
1. Set `VITE_AGUI_AGENT_URL=http://localhost:9999/agui` (invalid).
2. Restart frontend, send message.
3. **Expected**: 繁體中文 error within 5 seconds (SC-004); no infinite spinner.

---

### VS-4: Edge cases

| Scenario | Steps | Expected |
| --- | --- | --- |
| Empty message | Click send with blank composer | Send blocked or 繁體中文 validation prompt; no network request |
| Refresh page | Complete one exchange, reload | Thread empty; no error state |
| Stream interrupt | Kill backend mid-stream | Partial reply shown; error/incomplete state; composer re-enabled |
| Concurrent send | Send while streaming | Second send disabled or queued (consistent behavior) |
| Long message | Paste 8,001+ characters | 繁體中文 error before send |

---

## Manual Acceptance Checklist

Maps to spec acceptance criteria:

- [ ] **AC-1**: Web UI sends message and displays streaming reply (VS-2)
- [ ] **AC-2**: `GET /status` health check works (VS-1)
- [ ] **AC-3**: `VITE_AGUI_AGENT_URL` switches backend target (VS-3)

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| CORS error in browser console | Backend CORS not configured | Add frontend origin to `AgentOS` `cors_allowed_origins` |
| 503 on `/status` | Missing `AI_GATEWAY_API_KEY` | Export key and restart backend |
| Connection refused | Backend not running | `make dev-backend` |
| Stream never starts | Wrong `VITE_AGUI_AGENT_URL` | Must end with `/agui`, not `/agent` |

## Next Step

Run `/speckit-tasks` to generate implementation task list from this plan.
