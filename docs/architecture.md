# OpenAgent Hub Architecture

OpenAgent Hub is a Docker-first, self-hosted AI workspace. The application is split into a Next.js frontend, a NestJS backend, PostgreSQL for source-of-truth data, Qdrant for vectors, Redis for cache and queues, and Nginx as the only public entrypoint.

## Core Rules

- Backend business logic belongs in services, not controllers.
- Model access always flows through `ModelRouterService`.
- Provider-specific logic always lives inside a `ProviderAdapter`.
- Tool execution always flows through `ToolEngineService`.
- MCP servers, skills, tools, and agents are plugin-style extension points.
- PostgreSQL owns business records. Qdrant owns vectors only.
- Long-running work should be expressed as events and Redis-backed jobs.

## Feature Workflow

1. Requirements analysis
2. Architecture design
3. Database design
4. API design
5. Backend implementation
6. Frontend implementation
7. Tests
8. Documentation
9. Docker verification
10. Security review

## Public API Areas

- `/chat`
- `/models`
- `/tools`
- `/memory`
- `/mcp`
- `/agents`
- `/documents`
- `/settings`
- `/admin/metrics`
