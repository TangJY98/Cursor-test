# Research: Agent Chat App（v1）

**Date**: 2026-08-12  
**Feature**: `specs/001-agent-chat-app`

## R1 — Frontend framework: assistant-ui + AG-UI runtime

**Decision**: Use `assistant-ui` with `@assistant-ui/react-ag-ui` and `@ag-ui/client` (`HttpAgent`) as the chat UI and protocol client.

**Rationale**:
- User explicitly requested assistant-ui.
- Agno AgentOS exposes agents via the AG-UI protocol (`AGUI` interface), which is the native wire format for `@assistant-ui/react-ag-ui`.
- `useAgUiRuntime` + `AssistantRuntimeProvider` + `Thread` component delivers streaming chat, in-progress indicators, and composer UX without custom stream parsing.
- Official reference: [assistant-ui AG-UI quickstart](https://www.assistant-ui.com/docs/runtimes/ag-ui/quickstart) and [with-ag-ui example](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-ag-ui).

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| Raw `fetch` + SSE parser | Reimplements AG-UI event handling; violates Principle II (optimize for deletion). |
| CopilotKit frontend | User specified assistant-ui; CopilotKit is a different integration path. |
| Vercel AI SDK `useChat` | Not AG-UI-native; would need a custom adapter layer to Agno. |

## R2 — Backend framework: Agno SDK + AgentOS + AGUI interface

**Decision**: Python backend using `agno[os,agui]`, `AgentOS`, and `AGUI(agent=chat_agent)` to serve a FastAPI app on port `7777` (default).

**Rationale**:
- User explicitly requested Agno SDK with AgentOS enabled.
- `AgentOS` + `AGUI` provides `POST /agui` (streaming AG-UI events) and `GET /status` (health) out of the box — maps directly to spec FR-002, FR-003, FR-006.
- Single Python process; no extra services, queues, or databases (constitution Principle I, spec FR-010).

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| `AGUIApp` (legacy) | Deprecated in Agno v2; migration guide directs to `AgentOS` + `AGUI`. |
| Raw FastAPI + manual SSE | Duplicates Agno's AG-UI router; more code to maintain. |
| `AgentOSClient` only | Client is for calling remote AgentOS, not serving this app. |

## R3 — Frontend build tool: Vite + React

**Decision**: Scaffold frontend with Vite + React + TypeScript; use `@assistant-ui/vite` plugin (`aui()`).

**Rationale**:
- Lighter than Next.js for a v1 dev-only chat shell with no SSR/auth.
- assistant-ui documents Vite plugin support.
- Aligns with constitution Principle I (minimal moving parts).

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| Next.js | SSR/app-router overhead not needed for v1; no SEO requirement. |
| Create React App | Unmaintained; poor assistant-ui ecosystem fit. |

## R4 — Backend URL configuration

**Decision**: Frontend reads `VITE_AGUI_AGENT_URL` (build-time env, exposed to client). Default: `http://localhost:7777/agui`.

**Rationale**:
- Satisfies spec FR-007 and user acceptance criterion #3.
- Vite convention (`VITE_*` prefix) is standard for client-side env injection.
- Points at Agno's `POST /agui` endpoint (not `/agent` used in generic assistant-ui examples).

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| Hardcoded URL | Violates FR-007. |
| Runtime `window.__ENV__` injection | Unnecessary complexity for v1. |

## R5 — Session and thread persistence

**Decision**: No server-side persistence. Conversation history is held in assistant-ui runtime state (browser memory). Backend is stateless across page reloads.

**Rationale**:
- Spec FR-010 explicitly forbids database and cross-session persistence.
- AG-UI `RunAgentInput` carries message history per request; no `session_id` storage required for v1 single-thread UX.
- Page refresh clears thread — matches spec edge case.

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| AgentOS in-memory sessions | Still cross-restart state; spec excludes persistence. |
| SQLite | Explicitly out of scope (FR-010). |

## R6 — Health/status endpoint

**Decision**: Use Agno AGUI interface `GET /status` as the canonical health check. Document `GET http://localhost:7777/status` in quickstart.

**Rationale**:
- Provided by `AGUI` interface per [Agno AG-UI docs](https://docs.agno.com/agent-os/interfaces/ag-ui/introduction).
- Returns explicit ready/not-ready for automation and manual checks (FR-006).

**Alternatives considered**:
| Alternative | Rejected because |
| --- | --- |
| Custom `/health` route | Duplicates built-in `/status`; violates Principle II. |
| Chat-based health probe | Violates spec User Story 2 (must not require sending a message). |

## R7 — Traditional Chinese responses

**Decision**: Configure the Agno `Agent` with a system instruction requiring 繁體中文 replies. No frontend i18n framework in v1.

**Rationale**:
- Spec targets TC users; model instruction is sufficient for v1.
- UI labels/errors will be hardcoded 繁體中文 in frontend components.

## R8 — CORS

**Decision**: Enable `cors_allowed_origins` on `AgentOS` for `http://localhost:5173` (Vite default) and `http://localhost:3000`.

**Rationale**: Browser frontend must call backend AG-UI endpoint cross-origin in local dev.

## R9 — Testing strategy

**Decision**:
- **Backend unit tests** (`pytest`): agent system prompt / message validation helpers (pure transformation).
- **Backend integration tests** (`pytest` + `httpx`): `GET /status`, `POST /agui` streaming contract smoke.
- **Frontend**: Playwright or Vitest component test for empty-message guard and error display (boundary/UI).
- **E2E** (optional v1): manual quickstart validation; automated E2E deferred unless time permits in implement phase.

**Rationale**: Aligns with constitution Principle V (unit = transformation, integration = boundaries).

## R10 — Command surface (Principle X)

**Decision**: Root `Makefile` with canonical commands; `frontend/package.json` and `backend/pyproject.toml` scripts are thin wrappers called by Makefile targets only.

| Command | Action |
| --- | --- |
| `make dev` | Start backend + frontend concurrently |
| `make dev-backend` | `uv run` AgentOS server |
| `make dev-frontend` | `pnpm dev` in frontend |
| `make health` | `curl` GET `/status` |
| `make test` | Run backend + frontend tests |
| `make lint` | Run linters |

**Rationale**: Single discoverable command list per constitution Principle X.
