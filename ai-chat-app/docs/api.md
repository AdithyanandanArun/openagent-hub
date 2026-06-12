# API Reference

Base URL: `http://localhost:8000`

All endpoints except `/auth/register`, `/auth/login`, and `/health` require:

```text
Authorization: Bearer <token>
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

Returns configured model metadata for the selector.

## Health

`GET /health`

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```
