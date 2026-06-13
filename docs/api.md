# API Reference

Base URL: `http://localhost:8000`

All endpoints except `/auth/register`, `/auth/login`, and `/health` require:

```text
Authorization: Bearer <token>
```

Chat and model endpoints can also receive per-request OpenAI-compatible provider settings:

```text
X-Provider-Api-Key: <provider-api-key>
X-Provider-Base-Url: http://localhost:3001/v1
```

## Authentication

`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Both return:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user_id": "...",
  "email": "user@example.com"
}
```

## Conversations

`GET /conversations`

Returns the current user's conversations ordered by most recent update.

`POST /conversations`

```json
{
  "title": "New Conversation"
}
```

`PATCH /conversations/{conversation_id}`

```json
{
  "title": "Renamed conversation"
}
```

`DELETE /conversations/{conversation_id}`

Deletes the conversation and all messages.

`GET /conversations/{conversation_id}/messages`

Returns all messages for a conversation.

## Chat

`POST /chat`

```json
{
  "conversation_id": "...",
  "message": "Explain SQLAlchemy async sessions",
  "model": "gpt-4o-mini"
}
```

Returns the saved assistant message.

`POST /chat/stream`

Streams Server-Sent Events:

```text
event: message_start
data: {"message_id":"...","conversation_id":"..."}

event: content_delta
data: {"content":"partial token text"}

event: message_end
data: {"message_id":"...","conversation_id":"...","title":"..."}
```

## Models

`GET /models`

Returns model metadata from the configured provider. Example:

```bash
curl http://localhost:8000/models \
  -H "Authorization: Bearer <app-token>" \
  -H "X-Provider-Api-Key: <provider-api-key>" \
  -H "X-Provider-Base-Url: http://localhost:3001/v1"
```

## Health

`GET /health`

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```
