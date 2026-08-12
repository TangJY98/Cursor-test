# Implementation Plan: Agent Chat App（v1）

**Branch**: `001-agent-chat-app` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agent-chat-app/spec.md`  
**User directive**: Use **assistant-ui** for frontend and **Agno SDK** for backend (enable **AgentOS**).

## Summary

Build a minimal Traditional Chinese agent chat application with streaming replies. The frontend uses **assistant-ui** (`@assistant-ui/react-ag-ui` + `HttpAgent`) connected to an **Agno AgentOS** backend exposing the **AG-UI** interface (`POST /agui`, `GET /status`). v1 is a single in-memory chat thread with no auth, database, tools, or production deployment.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend)  
**Primary Dependencies**:
- Backend: `agno[os,agui]`, `openai` (or configured model provider)
- Frontend: `@assistant-ui/react`, `@assistant-ui/react-ag-ui`, `@ag-ui/client`, `@assistant-ui/vite`, React 19, Vite 6

**Storage**: N/A — no persistence (in-browser memory only)  
**Testing**: `pytest` + `httpx` (backend); `vitest` (frontend unit); manual E2E via [quickstart.md](./quickstart.md)  
**Target Platform**: Local development (Linux/macOS/Windows); browser (Chrome/Firefox/Safari latest)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: First stream chunk < 3s (SC-002); full round-trip < 30s (SC-001)  
**Constraints**: Single chat thread; 繁體中文 UI/errors; 8,000 char message limit; no tools/RAG/auth  
**Scale/Scope**: Single developer session; 1 agent; 2 processes in dev (frontend + backend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Notes |
| --- | --- | --- | --- |
| I. Do Not Distribute by Default | ✅ PASS | ✅ PASS | Two processes (browser + Python server) are required for a web app, not microservice distribution. No queues, workers, or separate services. |
| II. Optimize for Deletion | ✅ PASS | ✅ PASS | Thin wrappers: `app.py` (AgentOS boot), `AgUiRuntimeProvider.tsx` (HttpAgent wiring). No plugin frameworks. |
| III. Make Dependencies Explicit | ✅ PASS | ✅ PASS | `HttpAgent` URL injected via env; agent model/API key via constructor/env, not globals. |
| IV. Contract at Boundary | ✅ PASS | ✅ PASS | AG-UI protocol at `POST /agui`; versioned contract in [contracts/api.md](./contracts/api.md). |
| V. Test the Transformation | ✅ PASS | ✅ PASS | Unit tests for validation helpers; integration tests for `/status` and `/agui` stream. |
| VI. Structured Events | ✅ PASS | ✅ PASS | AG-UI events are structured; frontend logs via `useAgUiRuntime` logger with `request_id`/`threadId` correlation. |
| VII. Recovery Over Prevention | ✅ PASS | ✅ PASS | Env-based config; no irreversible migrations; backend restart recovers statelessly. |
| VIII. Attention Is Finite | ✅ PASS | ✅ PASS | `/status` endpoint with documented `make health` runbook in quickstart. |
| IX. Value at User | ✅ PASS | ✅ PASS | Quickstart defines deploy-verify steps; instrumentation via AG-UI logger. |
| X. Commands Discoverable | ✅ PASS | ✅ PASS | Root `Makefile` canonical command surface (see research R10). |

**Gate result**: ✅ All principles satisfied. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-chat-app/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entities and validation
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── api.md           # Phase 1 — AG-UI + health contracts
└── tasks.md             # Phase 2 — /speckit-tasks output
```

### Source Code (repository root)

```text
Makefile                         # Canonical commands (Principle X)

backend/
├── pyproject.toml
├── src/
│   └── agent_chat/
│       ├── __init__.py
│       ├── app.py               # AgentOS + AGUI interface setup
│       ├── agent.py             # Agent definition + TC system prompt
│       └── validation.py        # Message length / empty checks (pure)
└── tests/
    ├── unit/
    │   └── test_validation.py
    └── integration/
        └── test_agui.py         # /status + /agui smoke

frontend/
├── package.json
├── vite.config.ts               # aui() plugin
├── .env.example                 # VITE_AGUI_AGENT_URL
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── providers/
│   │   └── AgUiRuntimeProvider.tsx
│   ├── components/
│   │   └── assistant-ui/        # Thread, composer primitives (scaffolded)
│   └── lib/
│       └── errors.ts            # 繁體中文 error messages
└── tests/
    └── composer.test.tsx        # Empty-message guard
```

**Structure Decision**: Web application monorepo with `backend/` (Python/Agno) and `frontend/` (Vite/React/assistant-ui). Two dev processes, one repo — not distributed microservices. Root `Makefile` orchestrates both.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Browser (assistant-ui)                                  │
│  ┌─────────────┐    ┌──────────────────────────────┐   │
│  │ Thread UI   │───►│ useAgUiRuntime(HttpAgent)    │   │
│  └─────────────┘    └──────────────┬───────────────┘   │
└────────────────────────────────────┼────────────────────┘
                                     │ POST /agui (SSE)
                                     │ VITE_AGUI_AGENT_URL
                                     ▼
┌─────────────────────────────────────────────────────────┐
│  Agno AgentOS (Python, port 7777)                        │
│  ┌──────────┐    ┌─────────┐    ┌──────────────────┐   │
│  │ AGUI     │───►│ Agent   │───►│ LLM (OpenAI etc) │   │
│  │ interface│    │ (TC sys │    └──────────────────┘   │
│  └────┬─────┘    │ prompt) │                           │
│       │          └─────────┘                           │
│  GET /status                                           │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases (high-level)

### Phase A — Backend bootstrap
1. `uv init` backend with `agno[os,agui]`
2. Define `Agent` with 繁體中文 system instruction
3. Wire `AgentOS(agents=[...], interfaces=[AGUI(...)])` with CORS
4. Verify `GET /status` and `POST /agui` manually

### Phase B — Frontend bootstrap
1. Scaffold Vite + React via `npx assistant-ui@latest create` (with-ag-ui pattern) or manual setup
2. Configure `AgUiRuntimeProvider` with `VITE_AGUI_AGENT_URL`
3. Render `Thread` component; 繁體中文 error handling via `onError`
4. Disable send on empty input

### Phase C — Integration & validation
1. Root `Makefile` with `dev`, `health`, `test`, `lint`
2. Integration tests for contracts
3. Run [quickstart.md](./quickstart.md) validation scenarios VS-1 through VS-4

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| — | — | — |

## Generated Artifacts

| Artifact | Path | Status |
| --- | --- | --- |
| Research | [research.md](./research.md) | ✅ Complete |
| Data model | [data-model.md](./data-model.md) | ✅ Complete |
| API contracts | [contracts/api.md](./contracts/api.md) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |

## Next Step

Run `/speckit-tasks` to break this plan into actionable implementation tasks.
