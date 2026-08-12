---
description: "Task list for Agent Chat App v1 implementation"
---

# Tasks: Agent Chat App（v1）

**Input**: Design documents from `/specs/001-agent-chat-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included where defined in plan.md (validation unit tests, integration smoke tests). No TDD-first ordering required.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3)
- All descriptions include exact file paths

## Path Conventions

- **Backend**: `backend/src/agent_chat/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Root**: `Makefile`, `README.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo structure and dependencies

- [x] T001 Create monorepo directory structure per plan.md (`backend/src/agent_chat/`, `backend/tests/unit/`, `backend/tests/integration/`, `frontend/src/`, `frontend/tests/`)
- [x] T002 Initialize `backend/pyproject.toml` with uv, `agno[os,agui]`, `openai` (OpenAI-compatible client for `OpenAILike` only), `pytest`, `httpx` dependencies and `[project.scripts]` entry for AgentOS serve
- [x] T002a [P] Create `backend/.env.example` with `AI_GATEWAY_API_KEY`, `AI_GATEWAY_BASE_URL=https://ai-gateway.vercel.sh/v1`, `AGENT_MODEL_ID=google/gemini-2.5-flash-lite`
- [x] T003 [P] Initialize `frontend/package.json` with React 19, Vite 6, TypeScript, `@assistant-ui/react`, `@assistant-ui/react-ag-ui`, `@ag-ui/client`, `@assistant-ui/vite` dependencies
- [x] T004 [P] Create root `Makefile` with placeholder targets (`dev`, `dev-backend`, `dev-frontend`, `health`, `test`, `lint`)
- [x] T005 [P] Create `frontend/.env.example` with `VITE_AGUI_AGENT_URL=http://localhost:7777/agui`
- [x] T006 [P] Configure `frontend/vite.config.ts` with `aui()` plugin from `@assistant-ui/vite`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend agent + AGUI server and frontend provider skeleton. MUST complete before user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create `backend/src/agent_chat/__init__.py` package marker
- [x] T008 Create `backend/src/agent_chat/agent.py` with Agno `Agent`, `OpenAILike` model via Vercel AI Gateway (`base_url` from `AI_GATEWAY_BASE_URL`, `id` from `AGENT_MODEL_ID` defaulting to `google/gemini-2.5-flash-lite`, `api_key` from `AI_GATEWAY_API_KEY`), and 繁體中文 system instruction
- [x] T009 Create `backend/src/agent_chat/app.py` wiring `AgentOS(agents=[...], interfaces=[AGUI(...)])` with `cors_allowed_origins` for `http://localhost:5173` and `http://localhost:3000`
- [x] T010 [P] Create `backend/src/agent_chat/validation.py` with pure `validate_message(content: str) -> str | None` (empty/whitespace and 8000-char limit checks)
- [x] T011 [P] Create `frontend/src/lib/errors.ts` with 繁體中文 error constants (`CONNECTION_FAILED`, `MESSAGE_TOO_LONG`, `EMPTY_MESSAGE`, `STREAM_INTERRUPTED`)
- [x] T012 [P] Create `frontend/src/providers/AgUiRuntimeProvider.tsx` skeleton with `HttpAgent` and `useAgUiRuntime` imports (no env wiring yet)
- [x] T013 [P] Create `frontend/src/main.tsx` and `frontend/index.html` Vite entry points
- [x] T014 Wire `make dev-backend` in `Makefile` to run `uv run` AgentOS from `backend/src/agent_chat/app.py` on port 7777

**Checkpoint**: Backend starts; `GET http://localhost:7777/status` returns healthy response

---

## Phase 3: User Story 1 - 送出訊息並即時看到串流回覆 (Priority: P1) 🎯 MVP

**Goal**: User sends 繁體中文 message in web UI and sees streaming agent reply in a single thread with multi-turn support.

**Independent Test**: Open `http://localhost:5173`, send「你好」, observe streaming reply; send second message, both visible in order (quickstart VS-2).

### Implementation for User Story 1

- [x] T015 [US1] Complete `frontend/src/providers/AgUiRuntimeProvider.tsx` with `useAgUiRuntime`, structured `logger` callbacks (`threadId`/`runId` correlation), and `AssistantRuntimeProvider` wrapper
- [x] T016 [P] [US1] Scaffold assistant-ui `Thread` and composer primitives in `frontend/src/components/assistant-ui/thread.tsx` (use `npx assistant-ui@latest` component init or copy from with-ag-ui example)
- [x] T017 [US1] Create `frontend/src/App.tsx` rendering `AgUiRuntimeProvider` + `Thread` with 繁體中文 UI labels
- [x] T018 [US1] Implement empty-message guard in `frontend/src/components/assistant-ui/thread.tsx` composer (block send, show `errors.EMPTY_MESSAGE`)
- [x] T019 [US1] Implement 8000-character limit check in `frontend/src/components/assistant-ui/thread.tsx` composer before send
- [x] T020 [US1] Configure disable-send-while-streaming in `frontend/src/providers/AgUiRuntimeProvider.tsx` (consistent with data-model `ChatThread.status=streaming`)
- [x] T021 [US1] Implement stream-interruption handling via `onError` in `frontend/src/providers/AgUiRuntimeProvider.tsx` showing `errors.STREAM_INTERRUPTED` with partial content preserved
- [x] T022 [US1] Add POST `/agui` streaming smoke test in `backend/tests/integration/test_agui.py` asserting SSE events received for a user message
- [x] T023 [US1] Wire `make dev-frontend` in `Makefile` to run `pnpm dev` in `frontend/` on port 5173

**Checkpoint**: `make dev` → full streaming chat works end-to-end (MVP complete)

---

## Phase 4: User Story 2 - 檢查 backend 健康狀態 (Priority: P2)

**Goal**: Operators can verify backend readiness via health/status endpoint without using chat UI.

**Independent Test**: Run `make health` with backend up → exit 0; stop backend → non-zero (quickstart VS-1).

### Implementation for User Story 2

- [x] T024 [US2] Implement `make health` target in `Makefile` calling `curl -sf http://localhost:7777/status` with clear pass/fail output
- [x] T025 [US2] Add GET `/status` contract test in `backend/tests/integration/test_agui.py` asserting JSON healthy indicator per `contracts/api.md`
- [x] T026 [US2] Add unhealthy-agent test case in `backend/tests/integration/test_agui.py` verifying non-200 or explicit unavailable status when `AI_GATEWAY_API_KEY` is missing

**Checkpoint**: `make health` passes when backend running; fails when stopped

---

## Phase 5: User Story 3 - 以環境設定切換 backend 位址 (Priority: P3)

**Goal**: Frontend backend URL configurable via environment variable without code changes.

**Independent Test**: Set `VITE_AGUI_AGENT_URL` in `frontend/.env`, restart frontend, chat works; set invalid URL, see 繁體中文 error within 5s (quickstart VS-3).

### Implementation for User Story 3

- [x] T027 [US3] Wire `import.meta.env.VITE_AGUI_AGENT_URL` with fallback `http://localhost:7777/agui` in `frontend/src/providers/AgUiRuntimeProvider.tsx` `HttpAgent` constructor
- [x] T028 [US3] Implement connection-failure handler in `frontend/src/providers/AgUiRuntimeProvider.tsx` `onError` displaying `errors.CONNECTION_FAILED` within 5 seconds (no infinite spinner)
- [x] T029 [US3] Document `VITE_AGUI_AGENT_URL` usage and examples in `frontend/.env.example` and root `README.md`

**Checkpoint**: Changing `.env` and restarting frontend switches backend target without code edits

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tests, documentation, and full validation across all stories

- [x] T030 [P] Add unit tests for `validate_message` in `backend/tests/unit/test_validation.py` (empty, whitespace, 8000-char boundary, valid message)
- [x] T031 [P] Add Vitest test for empty-message guard in `frontend/tests/composer.test.tsx`
- [x] T032 Wire `make test` in `Makefile` to run `uv run pytest` in `backend/` and `pnpm test` in `frontend/`
- [x] T033 Wire `make lint` in `Makefile` to run `ruff check` in `backend/` and `pnpm lint` in `frontend/`
- [x] T034 Create root `README.md` with prerequisites, env setup, canonical `make` commands, and link to `specs/001-agent-chat-app/quickstart.md`
- [x] T035 Run all quickstart.md validation scenarios VS-1 through VS-4 and fix any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    └──► Phase 2 (Foundational) ──► BLOCKS all user stories
              ├──► Phase 3 (US1 P1) 🎯 MVP
              ├──► Phase 4 (US2 P2)  [can parallel after Phase 2 if US1 backend done]
              └──► Phase 5 (US3 P3)  [depends on US1 AgUiRuntimeProvider from T015]
                        └──► Phase 6 (Polish)
```

### User Story Dependencies

| Story | Depends on | Independent test |
| --- | --- | --- |
| US1 (P1) | Phase 2 complete | Browser streaming chat (VS-2) |
| US2 (P2) | Phase 2 complete (backend `/status`) | `make health` (VS-1) |
| US3 (P3) | US1 `AgUiRuntimeProvider` (T015) | Env var switch (VS-3) |

- **US1**: No dependency on US2/US3
- **US2**: No dependency on US1 frontend; only backend `/status` from Phase 2
- **US3**: Builds on US1 provider; can start after T015

### Parallel Opportunities

**Phase 1** (after T001):
```text
T002a + T003 + T005 + T006  (all [P])
```

**Phase 2** (after T009):
```text
T010 + T011 + T012 + T013  (all [P])
```

**Phase 3 US1** (after T015):
```text
T016  (parallel with T018/T019 prep)
```

**Phase 6**:
```text
T030 + T031  (all [P])
```

**Cross-story** (after Phase 2):
```text
Developer A: Phase 3 (US1 frontend)
Developer B: Phase 4 (US2 health/Makefile)
```

---

## Parallel Example: User Story 1

```bash
# After T015 completes, launch in parallel:
# Task T016: Scaffold Thread in frontend/src/components/assistant-ui/thread.tsx
# Task T022: Integration test in backend/tests/integration/test_agui.py

# Sequential within US1:
# T015 → T017 → T018 → T019 → T020 → T021 → T023
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T014)
3. Complete Phase 3: User Story 1 (T015–T023)
4. **STOP and VALIDATE**: Run quickstart VS-2
5. Demo streaming 繁體中文 chat

### Incremental Delivery

1. Setup + Foundational → backend `/status` + `/agui` live
2. Add US1 → MVP streaming chat
3. Add US2 → `make health` operational check
4. Add US3 → env-based backend URL switching
5. Polish → full test suite + quickstart validation

### Suggested MVP Scope

**Phases 1–3 only** (23 tasks: T001–T023) delivers all three acceptance criteria minimally:
- AC-1: US1 streaming chat
- AC-2: US2 health (T014 checkpoint + T024)
- AC-3: US3 env var (can defer T027–T029 to post-MVP if hardcoding URL temporarily)

For full spec compliance, complete through Phase 5 before polish.

---

## Notes

- Agno endpoint is `POST /agui` (not `/agent` from generic assistant-ui examples)
- LLM routes through Vercel AI Gateway (`https://ai-gateway.vercel.sh/v1`) with model `google/gemini-2.5-flash-lite` — not OpenAI direct
- No database, auth, tools, or RAG in any task (spec FR-009–FR-012)
- All `make` commands are the canonical interface (constitution Principle X)
- Commit after each phase checkpoint
- [P] tasks = different files, safe to parallelize
