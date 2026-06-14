# REST API

MindServer exposes an HTTP endpoint for sending instructions to bots without a Minecraft client.

## POST /api/message

Send a natural-language message to a named bot. The message is forwarded to the agent's LLM pipeline (same path as in-game chat). The response is fire-and-forget — 200 means the message was dispatched, not that the bot completed the action.

Both `agent` and `message` are trimmed before processing.

```
POST http://localhost:8080/api/message
Content-Type: application/json

{ "agent": "Andy", "message": "go mine some wood" }
```

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Dispatched | `{"status": "ok"}` |
| 400 | Missing/empty `agent` | `{"error": "'agent' is required"}` |
| 400 | Missing/empty `message` | `{"error": "'message' is required"}` |
| 400 | Malformed JSON body | `{"error": "invalid JSON body"}` |
| 404 | Agent not registered | `{"error": "agent 'Andy' not found"}` |
| 404 | Agent not in game | `{"error": "agent 'Andy' not in game"}` |

The sender label is `ADMIN` (matching the browser UI), so `only_chat_with` profile rules apply identically to REST and UI messages.
