# AI Chat App

A production-ready ChatGPT-style application with a React + TypeScript frontend, FastAPI backend, PostgreSQL persistence, Alembic migrations, JWT authentication, and an OpenAI-compatible streaming chat API.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS
- Backend: FastAPI, Python 3.13, SQLAlchemy 2.x async ORM
- Database: PostgreSQL 16
- Auth: JWT bearer tokens
- AI provider: OpenAI-compatible `/v1/chat/completions`
- Runtime: Docker Compose

## Quick Start

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set `OPENAI_API_KEY` and a strong `JWT_SECRET`.

3. Start the stack:

```bash
docker compose up --build
```

4. Open the app:

```text
http://localhost:3000
```

The backend API is available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

For local backend development, set `DATABASE_URL` to a reachable PostgreSQL instance, for example:

```text
postgresql+asyncpg://chatuser:chatpassword@localhost:5432/chatdb
```

## Features

- Register and sign in with JWT-backed sessions
- Create, rename, delete, and browse conversations
- Persist all conversations and messages in PostgreSQL
- Select from configured AI models
- Add an OpenAI-compatible provider key/base URL in the app
- Fetch and select models exposed by that provider's `/models` endpoint
- Stream assistant responses token-by-token with Server-Sent Events
- Render markdown, tables, lists, and syntax-highlighted code blocks
- Copy code blocks from assistant responses
- Responsive dark UI for desktop and mobile-sized screens

## Project Structure

The implementation follows the requested `ai-chat-app/` structure. Backend code is organized around routers, schemas, SQLAlchemy models, and services. Frontend code is organized around typed API clients, hooks, pages, and focused UI components.

## Configuration

Required environment variables:

- `DATABASE_URL`
- `OPENAI_API_KEY` optional fallback if users do not enter a provider key in the app
- `OPENAI_BASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`

Docker Compose also uses:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `VITE_API_URL`
- `VITE_PROVIDER_BASE_URL`

## Provider Settings In The App

After signing in, open the key button in the header. Add:

- Base URL, for example `http://localhost:3001/v1`
- API key from your OpenAI-compatible provider

Click **Fetch models** to load the models available to that key. The browser stores these provider settings locally and sends them to the backend on `/models`, `/chat`, and `/chat/stream` requests.

## Migrations

Migrations run automatically when the backend container starts:

```bash
alembic upgrade head
```

To create a new migration during development:

```bash
cd backend
alembic revision --autogenerate -m "Describe schema change"
```
