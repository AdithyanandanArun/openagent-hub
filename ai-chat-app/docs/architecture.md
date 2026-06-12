# Architecture

## Overview

The app has three services managed by Docker Compose:

- PostgreSQL stores users, conversations, and messages.
- FastAPI exposes authentication, conversation, model, and chat routes.
- React serves the chat workspace and streams assistant responses from the API.

## Backend

FastAPI routes live in `backend/app/api`. Each route delegates to a service in `backend/app/services`, keeping persistence and AI-provider behavior outside HTTP handlers.

SQLAlchemy models live in `backend/app/models` and use async sessions from `backend/app/core/database.py`. Alembic migrations live under `backend/migrations/alembic` and run on backend startup.

JWT helpers live in `backend/app/core/security.py`. Protected routes use `get_current_user_id`, so every conversation and message query is scoped to the authenticated user.

## Streaming Flow

1. The frontend posts to `/chat/stream` with a conversation id, message, and model.
2. The backend verifies conversation ownership.
3. The user message is saved and committed before streaming starts.
4. The backend forwards conversation history to the OpenAI-compatible provider.
5. Provider deltas are emitted as SSE `content_delta` events.
6. The complete assistant response is saved at the end of the stream.

## Frontend

The frontend keeps API calls in `src/services`, stateful orchestration in `src/hooks`, and UI in `src/components` and `src/pages`.

`useAuth` persists the JWT and user identity in local storage. `useChat` loads conversations, messages, models, and manages optimistic streaming updates with an abort controller.

The UI uses TailwindCSS, lucide icons, markdown rendering, syntax highlighting, and accessible labels on icon-only controls.
