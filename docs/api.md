# API Notes

The backend is REST-first.

## Initial Routes

- `GET /health`
- `GET /models/providers`
- `POST /models/generate`
- `POST /models/embeddings`
- `POST /chat/generate`
- `GET /chat/stream`
- `GET /tools`
- `POST /tools/execute`
- `GET /skills`
- `PUT /skills/:name`
- `GET /memory`
- `POST /memory`
- `DELETE /memory/:id`
- `GET /mcp`
- `PUT /mcp/:id`
- `DELETE /mcp/:id`
- `GET /agents`
- `PUT /agents/:id`
- `GET /agents/:id/export`
- `GET /documents`
- `POST /documents`
- `GET /settings`
- `PUT /settings`
- `GET /admin/metrics`

Streaming should use Server-Sent Events unless a workflow needs bidirectional WebSocket behavior.
