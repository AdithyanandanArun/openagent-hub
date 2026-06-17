# OpenAgent Hub

An open-source AI Operating System that unifies multiple LLM providers, models, agents, tools, and memory into a single self-hosted platform.

Connect Groq, OpenRouter, Google AI Studio, Mistral, NVIDIA NIM, Cohere, Cerebras, Cloudflare Workers AI, or any OpenAI-compatible provider. OpenAgent Hub intelligently routes requests to the best free model for each task, handles failover automatically, and presents a single clean interface — no provider juggling required.

---

## Features

**Chat & workspace**
- **Chat workspace** — ChatGPT-style conversations with streaming responses, markdown rendering, code highlighting (Prism), and KaTeX math
- **Projects** — Organize conversations into projects
- **Message editing & regeneration** — Edit any message or regenerate the last response
- **File & image attachments** — Attach PDFs, images, and files to messages

**Providers & models**
- **Multi-provider support** — Add any number of OpenAI-compatible providers; models are fetched from each
- **20 provider presets** — One-click setup for Groq, OpenRouter, Google AI Studio, Mistral, NVIDIA NIM, Cohere, Cerebras, GitHub Models, HuggingFace, Zhipu AI, OpenCode Zen, LLM7, Pollinations, Ollama Cloud, Kilo Gateway, Cloudflare Workers AI, SambaNova, OVHcloud, DeepInfra, and local Ollama
- **Free-only model catalog** — Only free models are synced and routed; paid models are automatically filtered out using provider-specific rules (`:free` suffix, quota-gated tiers, pricing metadata)
- **Model taxonomy** — 170+ model families classified with speed, coding, knowledge, vision, and reasoning scores
- **Provider health & testing** — Test connectivity, view status, enable/disable providers
- **Grouped model picker** — Models listed by provider with capability badges (vision, reasoning, fast, context window)

**Intelligent routing**
- **Smart Auto mode** — Automatically picks the best free model for each task based on message content analysis (coding, reasoning, vision, long context)
- **4 routing modes** — User-selectable routing preference:
  - **Balanced** — Smart task-aware routing (default)
  - **Speed** — Fastest response time; picks lightweight flash models
  - **Quality** — Best knowledge & reasoning; picks pro/large models
  - **Reliability** — Proven uptime from your request history
- **Reliability tracking** — Aggregates success rates, latency, and error rates per model from actual request logs
- **Priority-based failover** — Automatic 60s cooldown on rate-limited providers with fallback to next in line

**Intelligence layer**
- **Memory system** — Persistent user / project / conversation memory, injected into chats and agent runs
- **Agent framework** — Give a goal; the agent plans, calls tools in a ReAct loop, and streams a live step-by-step timeline
- **Tools** — Built-in tools (calculate, memory read/write, time) plus any tool from connected MCP servers
- **MCP integration** — Register stdio MCP servers; tools are discovered and made available to agents
- **Skills** — Reusable instruction sets (Code Review, Research, Documentation, Refactoring, Testing, + custom)
- **Multi-agent** — Coordinator agents can spawn sub-agents that run in parallel and share memory

**Platform**
- **Authentication** — JWT-based register/login/logout with API token management
- **Request logging & analytics** — Per-model request logs with latency tracking
- **OpenAI-compatible API** — Drop-in `/v1/chat/completions` endpoint for external tool integration
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

> The app runs on port 3000 (frontend) and port 8000 (backend API).

---

## Adding Providers

1. Click your username → **Settings** → **Providers** tab
2. Click **Add Provider** (or use a quick-add preset for any of the 20 supported providers)
3. Enter a name, base URL, and API key
4. Click **Test** to verify connectivity — only free models are synced
5. Models from all enabled providers appear in the model picker

Any OpenAI-compatible endpoint works as a provider. The system automatically filters to free-tier models only.

### Supported Free Providers

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Groq | All models free | Per-model rate limits, no card required |
| Google AI Studio | All models free | Per-project limits, Gemini 2.5/3.x models |
| OpenRouter | `:free` suffix models | ~20 RPM / 200 RPD |
| Mistral | All models free | Experiment plan, phone-verified |
| NVIDIA NIM | Dev credits + free models | Key starts with `nvapi-` |
| Cohere | Trial: 1000 calls/mo | Non-commercial, all models |
| Cerebras | ~1M tokens/day | No card, 8K context cap |
| GitHub Models | All models free | PAT with `models:read` scope |
| Cloudflare Workers AI | 10K Neurons/day | Requires Account ID |
| SambaNova | 200K TPD | No card, fast inference |
| OVHcloud | 2 RPM/model | Anonymous, no signup, EU-hosted |
| DeepInfra | Free serverless tier | Selected open-weight models |

---

## Routing Modes

When using **Auto** model selection, the routing mode controls how models are ranked:

- **Balanced** (default) — Analyzes your message to detect coding, reasoning, vision, or long-context needs, then picks the best-fit free model
- **Speed** — Prioritizes fast inference; picks flash/mini models from providers like Groq and Google
- **Quality** — Prioritizes knowledge and reasoning capability; picks pro/large parameter models
- **Reliability** — Prioritizes models with the best observed success rate from your request history

The routing mode selector appears in the chat input bar between the model picker and tools picker.

---

## Using Agents

1. Switch to the **Agents** tab at the top of the workspace
2. Type a goal, optionally pick a **Skill** and toggle **Multi-agent**, then **Run**
3. Watch the live timeline: thoughts, tool calls, tool results, and the final answer
4. Past runs are saved in the **Run history** panel

### Memory, Skills & MCP

- **Memory** (Settings → Memory) — add facts the AI should always know; they're injected into every chat and agent run
- **Skills** (Settings → Skills) — five built-in skills ship by default; create your own instruction sets
- **MCP** (Settings → MCP) — register stdio MCP servers to give agents more tools

---

## Project Structure

```
openagent-hub/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic (chat, routing, taxonomy, providers)
│   │   └── main.py
│   ├── migrations/       # Alembic migrations (001–012)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (ChatInput, RoutingPicker, etc.)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   └── services/     # API client functions
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | Done | Auth, conversations, streaming chat, markdown |
| 2 — Production UX | Done | Attachments, message editing, projects, themes |
| 3 — Multi-Provider | Done | Provider registry, dynamic models, routing, failover |
| 4 — Unified Model Layer | Done | Model catalog with capability metadata |
| 5 — Memory System | Done | User, project, and conversation memory |
| 6 — Agent Framework | Done | Autonomous agent execution, task planning, tool calls |
| 7 — MCP Integration | Done | stdio MCP servers, dynamic tool discovery, permissions |
| 8 — Multi-Agent | Done | Sub-agents, parallel execution, shared memory |
| 9 — Skills System | Done | Reusable composable agent capabilities |
| 10 — Intelligent Routing | Done | Model taxonomy, 4 routing modes, reliability tracking, free-only catalog |
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
