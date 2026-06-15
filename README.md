# OpenAgent Hub

An open-source AI Operating System that unifies multiple LLM providers, models, agents, tools, and memory into a single self-hosted platform.

Connect Groq, OpenRouter, Ollama, Google AI Studio, or any OpenAI-compatible provider. OpenAgent Hub routes requests intelligently, handles failover automatically, and presents a single clean interface — no provider juggling required.

---

## Features (current — Phase 9)

**Chat & workspace**
- **Chat workspace** — ChatGPT-style conversations with streaming responses, markdown rendering, code highlighting (Prism), and KaTeX math
- **Projects** — Organize conversations into projects
- **Message editing & regeneration** — Edit any message or regenerate the last response
- **File & image attachments** — Attach PDFs, images, and files to messages

**Providers & models**
- **Multi-provider support** — Add any number of OpenAI-compatible providers; models are fetched from each
- **Provider health & testing** — Test connectivity, view status (healthy / error / rate_limited), enable/disable
- **Priority-based routing** — Requests route through providers in priority order with automatic 60s cooldown on rate limits
- **Unified model catalog** — Models normalized with capability metadata (context window, vision, reasoning, coding/speed scores)
- **Grouped model picker** — Models listed by provider with capability badges; switch providers inline

**Intelligence layer**
- **Memory system** — Persistent user / project / conversation memory, injected into chats and agent runs (cross-chat memory)
- **Agent framework** — Give a goal; the agent plans, calls tools in a ReAct loop, and streams a live step-by-step timeline
- **Tools** — Built-in tools (calculate, memory read/write, time) plus any tool from connected MCP servers
- **MCP integration** — Register stdio MCP servers; tools are discovered and made available to agents (a dependency-free example server ships built-in)
- **Skills** — Reusable instruction sets (Code Review, Research, Documentation, Refactoring, Testing, + custom) that shape agent behaviour
- **Multi-agent** — Coordinator agents can spawn sub-agents that run in parallel and share memory

**Platform**
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

> Agents require a **tool-calling capable** model (e.g. GPT-4o / 4o-mini, Claude 3.5, Gemini 2.0). The agent view auto-selects a suitable default from your providers.

---

## Using Agents

1. Switch to the **Agents** tab at the top of the workspace
2. Type a goal, optionally pick a **Skill** and toggle **Multi-agent**, then **Run**
3. Watch the live timeline: thoughts, tool calls, tool results, and the final answer
4. Past runs are saved in the **Run history** panel

### Memory, Skills & MCP

- **Memory** (Settings → Memory) — add facts the AI should always know; they're injected into every chat and agent run
- **Skills** (Settings → Skills) — five built-in skills ship by default; create your own instruction sets
- **MCP** (Settings → MCP) — register stdio MCP servers to give agents more tools. A dependency-free **Example Tools** server is added automatically; click **↻** to connect and discover its tools. To add a real server, set a command (e.g. `npx`) and args (e.g. `-y @modelcontextprotocol/server-filesystem /path`).

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
| 4 — Unified Model Layer | ✅ Complete | Model catalog with capability metadata |
| 5 — Memory System | ✅ Complete | User, project, and conversation memory |
| 6 — Agent Framework | ✅ Complete | Autonomous agent execution, task planning, tool calls |
| 7 — MCP Integration | ✅ Complete | stdio MCP servers, dynamic tool discovery, permissions |
| 8 — Multi-Agent | ✅ Complete | Sub-agents, parallel execution, shared memory |
| 9 — Skills System | ✅ Complete | Reusable composable agent capabilities |
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
