# Task Tracking API

This document describes the task tracking feature added to the `/api/message` endpoint.

## Overview

Previously, `POST /api/message` was fire-and-forget — it would send a message to an agent and immediately return without any way to track when the agent finished processing. This made it unusable for automation scenarios where you need to wait for task completion, especially for goals that trigger self-prompting (e.g., "build a house").

This feature adds a task tracking system with a polling endpoint so callers can monitor task progress and retrieve the agent's response.

## API Changes

### POST /api/message

**Request:**
```json
{
  "agent": "agent_name",
  "message": "your message here"
}
```

**Response:**
```json
{
  "status": "ok",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

The response now includes a `task_id` UUID that can be used to poll for task status. This is an **additive change** — existing callers that ignore the extra field will continue to work.

### GET /api/tasks/:id (NEW)

Poll this endpoint to check task status.

**Response:**
```json
{
  "status": "running|finished|interrupted",
  "reason": "goal_ended|no_command|interrupted|agent_disconnected|null",
  "chat_history": [
    { "role": "assistant", "content": "...", "turnId": 1 },
    { "role": "system", "content": "...", "turnId": 2 }
  ]
}
```

- **status**: Task state
  - `running` — task is still being processed
  - `finished` — agent has completed the task and returned to idle
  - `interrupted` — task was interrupted (new message arrived or agent disconnected)
- **reason**: Why the task finished (null while running)
  - `goal_ended` — agent completed its goal and called `!endGoal`
  - `no_command` — self-prompter stopped because agent failed to produce commands
  - `interrupted` — a new message was sent, interrupting this task
  - `agent_disconnected` — agent disconnected while task was running
- **chat_history**: Array of conversation turns produced by the agent since the task started

## How It Works

### Completion Detection

A task is considered "finished" when **all** of these conditions hold:
1. Agent is idle (no action currently executing)
2. Self-prompter is not active (state is STOPPED)
3. Self-prompter loop is not running
4. At least one conversation turn has been produced

The last condition prevents a race where a fast poll could see the agent as "idle" before it even starts processing the message.

### Monotonic Turn Counter

To correctly attribute chat history to tasks (especially when interrupting), each conversation turn is assigned a monotonic `turnId` that never decreases, even when history is truncated. When a task is created, the current `turnId` is captured. Only turns with `turnId > startTurnId` are included in that task's chat history.

This solves the attribution problem: if task B interrupts task A, any remaining output from A's finishing action has `turnId <= B.startTurnId` and won't be incorrectly attributed to B.

### Interrupt Behavior

When a new message arrives while a task is running:
1. The old task's **tracking status** is immediately set to `interrupted`
2. A new task is created for the new message
3. The agent's current action **is NOT forcefully cancelled** — it completes naturally
4. The new message then processes after the current action finishes

This is a tracking-only interrupt, not a force-stop.

### Task Expiration

Completed tasks (status `finished` or `interrupted`) are automatically deleted after 10 minutes. Running tasks persist indefinitely until they complete or the server restarts.

**Note:** Task state is in-memory only — it's lost on server restart and won't work across multiple server processes. This is acceptable for the current architecture.

## Usage Example

```bash
# Send a message
curl -X POST http://localhost:8080/api/message \
  -H "Content-Type: application/json" \
  -d '{"agent":"andy","message":"what is in your inventory?"}'
# Response: {"status":"ok","task_id":"550e8400-e29b-41d4-a716-446655440000"}

# Poll for completion
curl http://localhost:8080/api/tasks/550e8400-e29b-41d4-a716-446655440000
# Response (running): {"status":"running","reason":null,"chat_history":[]}
# Response (finished): {"status":"finished","reason":"goal_ended","chat_history":[...]}
```

## Testing

A test script is provided at `test_task_api.js`. To use it:

1. Start the mindcraft server with at least one agent named "andy"
2. Run: `node test_task_api.js`

The script will:
- Send a test message via `/api/message`
- Poll `/api/tasks/:id` every second
- Display the final result when the task completes

## Files Changed

- **`src/agent/history.js`** — Added `turnCounter` and `turnId` to each turn
- **`src/mindcraft/task_registry.js`** (new) — In-memory task store with auto-expiration
- **`src/mindcraft/mindserver.js`** — Updated POST handler, added GET endpoint
- **`src/agent/mindserver_proxy.js`** — Added Socket.IO handlers for querying agent state
