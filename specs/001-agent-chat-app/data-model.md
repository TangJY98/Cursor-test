# Data Model: Agent Chat App（v1）

**Date**: 2026-08-12  
**Feature**: `specs/001-agent-chat-app`  
**Persistence**: None (in-browser memory only for v1)

## Overview

v1 has no database. Entities exist as in-memory structures in the frontend runtime and as transient request payloads on the AG-UI boundary. The backend does not retain conversation state across page reloads.

## Entities

### ChatThread

Represents the single conversation session in the browser.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string (UUID) | yes | Client-generated thread identifier; one per page load. |
| `messages` | Message[] | yes | Ordered list of messages; append-only during session. |
| `status` | enum | yes | `idle` \| `streaming` \| `error` |

**Validation rules**:
- Only one active thread per page (FR-004).
- `messages` MUST be ordered by `createdAt` ascending (FR-005).
- `status` MUST be `streaming` while an AG-UI run is in progress; composer disabled during streaming (edge case).

**State transitions**:

```text
idle ──(user sends)──► streaming ──(run complete)──► idle
  │                        │
  │                        └──(stream error)──► error ──(user retries)──► idle
  └──(page reload)──► [thread destroyed]
```

**Lifecycle**: Created on page load; destroyed on refresh/close. No server-side record.

---

### Message

A single utterance in the thread.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Unique within thread. |
| `role` | enum | yes | `user` \| `assistant` |
| `content` | string | yes | Plain text; Traditional Chinese expected for user input and assistant output. |
| `createdAt` | ISO 8601 datetime | yes | Client-assigned timestamp for ordering. |
| `status` | enum | no | `complete` \| `streaming` \| `incomplete` (assistant only) |

**Validation rules**:
- `content` MUST NOT be empty or whitespace-only for `role=user` (edge case).
- `content` MUST NOT exceed **8,000 characters** for user messages; reject before send with 繁體中文 error.
- `role=assistant` messages with `status=streaming` MAY have growing `content` until run completes.
- `role=assistant` with `status=incomplete` indicates stream interruption (edge case).

**Relationships**:
- Message `N` → 1 ChatThread (embedded in `messages` array).

---

### HealthStatus (read-only, not persisted)

Response shape from `GET /status` (backend boundary).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | yes | `ok` or non-ok indicator per Agno AGUI `/status` response. |
| `detail` | string | no | Human-readable reason when not healthy. |

---

## AG-UI Boundary Payload (transient)

Not stored server-side in v1. Documented here for contract alignment.

### RunAgentInput (client → `POST /agui`)

Subset relevant to v1 (full schema: [ag-ui-protocol](https://github.com/ag-ui-protocol/ag-ui)):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `threadId` | string | yes | Matches client `ChatThread.id`. |
| `runId` | string | yes | Unique per user send action. |
| `messages` | AG-UI Message[] | yes | Full conversation history for this run. |
| `state` | object | no | Unused in v1. |
| `tools` | array | no | Empty in v1 (no tools, FR-011). |
| `context` | array | no | Unused in v1. |
| `forwardedProps` | object | no | Optional; no `user_id` in v1 (no auth). |

### AG-UI Stream Events (server → client)

Handled by `@assistant-ui/react-ag-ui`; v1 requires at minimum:
- Text content delta events (streaming assistant reply)
- Run lifecycle events (start, complete, error)

## Entity Relationship Diagram

```text
┌─────────────────────────────────────┐
│           ChatThread (client)        │
│  id, status, messages[]             │
└──────────────┬──────────────────────┘
               │ 1..*
               ▼
┌─────────────────────────────────────┐
│            Message                   │
│  id, role, content, createdAt, status│
└──────────────┬──────────────────────┘
               │ serialized in
               ▼
┌─────────────────────────────────────┐
│     RunAgentInput (POST /agui)       │  ← transient, not stored
└─────────────────────────────────────┘
```

## Out of Scope Entities (v1)

- User / Account
- Session (server-persisted)
- Attachment / File
- ToolCall / ToolResult
- KnowledgeDocument (RAG)
