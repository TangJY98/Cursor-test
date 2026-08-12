# API Contracts: Agent Chat App（v1）

**Base URL (dev default)**: `http://localhost:7777`  
**Protocol**: AG-UI over HTTP (SSE streaming)  
**Version**: 1.0.0

## Overview

The backend exposes two v1 contract surfaces:

| Endpoint | Method | Purpose | Spec ref |
| --- | --- | --- | --- |
| `/agui` | POST | Stream agent chat (AG-UI protocol) | FR-002, FR-003 |
| `/status` | GET | Health / readiness check | FR-006 |

Frontend connects via `HttpAgent` from `@ag-ui/client` pointed at `{VITE_AGUI_AGENT_URL}` (default `http://localhost:7777/agui`).

---

## GET /status

### Description

Returns health/readiness of the AGUI interface and underlying agent. Used for operational checks without sending a chat message.

### Request

```http
GET /status HTTP/1.1
Host: localhost:7777
```

No request body. No authentication in v1.

### Response

**200 OK** — Service healthy and agent ready:

```json
{
  "status": "ok"
}
```

> **Note**: Exact response fields follow Agno AGUI `/status` implementation. Contract requirement: response MUST include a machine-parseable healthy indicator and MUST be JSON. Implementers MUST document the exact shape in backend README after first integration test.

**503 Service Unavailable** — Agent not ready (e.g., missing API key, model init failure):

```json
{
  "status": "unavailable",
  "detail": "Agent model not configured"
}
```

### Validation

- `make health` MUST exit 0 when status is healthy.
- Non-200 or `status != ok` MUST be treated as unhealthy.

---

## POST /agui

### Description

Main AG-UI entrypoint. Accepts `RunAgentInput` JSON; streams AG-UI protocol events (SSE) until the run completes or errors.

**Content-Type**: `application/json`  
**Accept**: `text/event-stream`

### Request body (RunAgentInput — v1 subset)

```json
{
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "runId": "660e8400-e29b-41d4-a716-446655440001",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "你好"
    }
  ],
  "tools": [],
  "context": [],
  "state": {},
  "forwardedProps": {}
}
```

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `threadId` | string | yes | Client-generated UUID per page session |
| `runId` | string | yes | Unique per send action |
| `messages` | array | yes | Full thread history; last message MUST be `role=user` |
| `messages[].role` | string | yes | `user` \| `assistant` \| `system` |
| `messages[].content` | string | yes | Non-empty for user messages |
| `tools` | array | yes | MUST be `[]` in v1 |
| `context` | array | no | Defaults to `[]` |
| `state` | object | no | Defaults to `{}` |
| `forwardedProps` | object | no | Unused in v1 |

### Response (SSE stream)

**200 OK** with `Content-Type: text/event-stream`

Stream emits AG-UI protocol events. Minimum required for v1 compliance:

| Event category | Required behavior |
| --- | --- |
| Text message start | Signals assistant reply beginning |
| Text content delta | Incremental assistant text chunks (繁體中文) |
| Run finished | Signals stream complete; UI clears "in progress" |
| Run error | Signals failure; UI shows 繁體中文 error |

Full event schema: [ag-ui-protocol specification](https://github.com/ag-ui-protocol/ag-ui).

**Example** (illustrative — actual event format per AG-UI spec):

```text
data: {"type":"TEXT_MESSAGE_CONTENT","delta":"你"}

data: {"type":"TEXT_MESSAGE_CONTENT","delta":"好"}

data: {"type":"RUN_FINISHED"}
```

### Error responses (non-streaming)

| Status | Condition | Body |
| --- | --- | --- |
| 400 | Empty user message or invalid payload | `{"error":"invalid_request","detail":"..."}` |
| 422 | Message exceeds 8,000 characters | `{"error":"message_too_long","detail":"..."}` |
| 500 | Agent execution failure | `{"error":"agent_error","detail":"..."}` |
| 503 | Agent not ready | `{"error":"unavailable","detail":"..."}` |

---

## Frontend Environment Contract

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_AGUI_AGENT_URL` | no | `http://localhost:7777/agui` | Full URL to POST /agui endpoint |

### Backend Environment Contract

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | yes* | — | LLM provider key for Agno agent model |
| `AGENT_OS_HOST` | no | `localhost` | Bind host |
| `AGENT_OS_PORT` | no | `7777` | Bind port |
| `CORS_ORIGINS` | no | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |

\*Required unless using a local/mock model for development.

---

## CORS Requirements

Backend MUST allow:
- `Origin: http://localhost:5173` (Vite)
- `Origin: http://localhost:3000` (alternate)
- Methods: `GET`, `POST`, `OPTIONS`
- Headers: `Content-Type`, `Accept`, `Authorization` (reserved for future; unused v1)

---

## Versioning Policy

- AG-UI protocol version is managed by `@ag-ui/client` and Agno `AGUI` interface compatibility.
- Breaking changes to request/response shapes require a MAJOR bump of this contract document and coordinated frontend/backend update (Principle IV).
