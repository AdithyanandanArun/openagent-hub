# OpenAgent Hub

An open-source AI Operating System that unifies multiple LLM providers, models, agents, tools, and memory into a single self-hosted platform.

Connect Groq, OpenRouter, Ollama, Google AI Studio, or any OpenAI-compatible provider. OpenAgent Hub routes requests intelligently, handles failover automatically, and presents a single clean interface — no provider juggling required.

---

## Features (current — Phase 3)

- **Chat workspace** — ChatGPT-style conversations with streaming responses, markdown rendering, code highlighting (Prism), and KaTeX math
- **Projects** — Organize conversations into projects
- **Message editing & regeneration** — Edit any message or regenerate the last response
- **File & image attachments** — Attach PDFs, images, and files to messages
- **Multi-provider support** — Add any number of OpenAI-compatible providers; models are fetched from each
- **Provider health & testing** — Test connectivity, view status (healthy / error / rate_limited), enable/disable
- **Priority-based routing** — Requests route through providers in priority order with automatic 60s cooldown on rate limits
- **Grouped model picker** — Models listed by provider; switch providers inline
- **Authentication** — JWT-based register/login/logout
- **Light & dark theme**
- **Fully self-hosted** — Docker Compose, no external dependencies

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Rendering | react-markdown, remark-gfm, KaTeX, Prism |
| Auth | JWT (python-jose), bcrypt |
| Serving | nginx (frontend), uvicorn (backend) |
| Runtime | Docker Compose |

---

## Quick Start

**Prerequisites:** Docker and Docker Compose installed.

```bash
git clone https://github.com/AdithyanandanArun/openagent-hub.git
cd openagent-hub
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000), register an account, and add your first provider.

> The app runs on port 3000 (frontend) and port 8000 (backend API). Port 3001 is intentionally left free for a local LLM container (e.g. Ollama or LM Studio at `http://host.docker.internal:3001/v1`).

---

## Adding Providers

1. Click your username → **Settings** → **Providers** tab
2. Click **Add Provider** (or use a quick-add button for Groq, OpenRouter, Ollama, Google AI Studio)
3. Enter a name, base URL, and API key
4. Click **Test** (⚡) to verify connectivity
5. Models from all enabled providers appear in the model picker in chat

Any OpenAI-compatible endpoint works as a provider.

---

## Project Structure

```
openagent-hub/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic (chat, routing, providers)
│   │   └── main.py
│   ├── migrations/       # Alembic migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   └── services/     # API client functions
│   └── package.json
├── docker-compose.yml
├── Idea.md               # Vision & product spec
└── Implementaion.md      # Phase-by-phase implementation plan
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Complete | Auth, conversations, streaming chat, markdown |
| 2 — Production UX | ✅ Complete | Attachments, message editing, projects, themes |
| 3 — Multi-Provider | ✅ Complete | Provider registry, dynamic models, routing, failover |
| 4 — Unified Model Layer | Planned | Model catalog with capability metadata |
| 5 — Memory System | Planned | User, project, and conversation memory |
| 6 — Agent Framework | Planned | Autonomous agent execution, task planning, tool calls |
| 7 — MCP Integration | Planned | GitHub, filesystem, browser, database, Notion, and more |
| 8 — Multi-Agent | Planned | Sub-agents, parallel execution, shared memory |
| 9 — Skills System | Planned | Reusable composable agent capabilities |
| 10 — Intelligent Routing | Planned | Latency/cost/quality-aware routing profiles |
| 11 — Automatic Failover | Planned | Zero-downtime fallback chains |
| 12 — AI Operating System | Planned | Unified API, quota pooling, developer platform |

---

## Development

To run with live reload (backend mounts `./backend` as a volume):

```bash
docker compose up
```

Backend API is available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

To rebuild only the frontend after UI changes:

```bash
docker compose up -d --build frontend
```

---

## License

MIT
