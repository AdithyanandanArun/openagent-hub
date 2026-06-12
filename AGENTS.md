# AGENTS.md

Guidance for AI agents working in the OpenAgent Hub codebase.

## Architecture Overview

OpenAgent Hub is a **monorepo** (NestJS backend + Next.js frontend) orchestrating AI providers through adapters. The critical layer is **ModelRouterService** (`apps/backend/src/models/model-router.service.ts`), which is the single entrypoint for ALL model interactions—no service directly calls provider APIs.

**Data flow**: Frontend → Nginx (port 80) → Backend API → ModelRouter → ProviderAdapter → External Provider.

**Storage**: PostgreSQL (source of truth for all entities), Qdrant (vectors only), Redis (session/caching), filesystem (`/storage`).

## Essential Commands & Workflows

All workspace commands run from root; NestJS/Next.js handle their own builds.

```bash
# Development (watches all apps/packages)
npm run dev

# Build all (required before docker)
npm run build

# Test all workspaces
npm test

# Docker (full stack: frontend, backend, postgres, redis, qdrant, nginx)
npm run docker:up
docker compose down

# Validate schema & apply migrations
DATABASE_URL='postgresql://openagent:openagent@localhost:5432/openagent?schema=public' \
  npx prisma validate --schema apps/backend/prisma/schema.prisma
npx prisma migrate dev --schema apps/backend/prisma/schema.prisma
```

**Backend builds produce `/apps/backend/dist`, frontend produces `/apps/frontend/.next`.**

## Critical Code Patterns

### Provider Abstraction (Non-Negotiable)

Every provider must implement `ProviderAdapter` interface (`apps/backend/src/models/provider-adapter.ts`):

```typescript
interface ProviderAdapter {
  configure(config: ProviderConfig): void;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncIterable<GenerateResponse>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  toolCall(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
```

**Never** let business logic know which provider is active. Use `ModelRouterService.generate()`, `.stream()`, `.embeddings()`.

### Tool Execution (Approval Gate Pattern)

`ToolEngineService` (`apps/backend/src/tools/tool-engine.service.ts`) enforces approval for dangerous permissions:

```typescript
const DANGEROUS_PERMISSIONS = new Set(["shell:execute", "docker:execute", "filesystem:delete", "git:push"]);
```

Tools must check `request.approved` before execution. This is enforced **server-side only**—never trust frontend approval.

### NestJS Modules (Dependency Injection)

Every feature area (chat, tools, agents, etc.) is a NestJS module. Always:
- Inject services through constructor (never instantiate directly)
- Use `@Injectable()` decorator on services
- Register modules in `AppModule` (`apps/backend/src/app.module.ts`)
- Export services needed by other modules via `module.exports`

Example: `ChatService` depends on `ModelRouterService` and `PrismaService`—both injected.

### Database: Prisma Migrations (No Manual SQL)

All schema changes must be migrations. Never execute raw SQL.

```bash
npx prisma migrate dev --name add_feature_name
```

Migrations live in `/apps/backend/prisma/migrations/`. Docker Compose runs migrations automatically on backend startup.

### Frontend: TanStack Query + Server Components

- Use Next.js **Server Components** by default; Client Components only with `"use client"`.
- Use TanStack Query (`@tanstack/react-query`) for async state in client components.
- API calls go through `/apps/frontend/lib/api.ts`; never fetch directly in components.

## Integration Points & Communication

### Backend → Frontend (REST + SSE)

API routes: `/api/{chat,models,tools,agents,memory,mcp,skills,knowledge,settings}`.

Streaming uses Server Sent Events (SSE); example: `ModelRouterService.stream()` yields `GenerateResponse` chunks.

### Inter-Service Boundaries

Services communicate through **shared types** in `packages/types/src/index.ts`, not direct imports. This decouples them:

- `ChatService` calls `ModelRouterService` (abstracted—doesn't know provider)
- `ToolEngineService` registers and executes tools (stateless, receives request → returns result)
- `SkillsModule` loads YAML from `/skills` folder; agents reference skill names, not implementations

## Project-Specific Conventions

### Environment Variables

Backend uses `.env` (set in `docker-compose.yml` or locally):
- `DATABASE_URL`: Postgres connection string
- `REDIS_URL`: Redis connection
- `QDRANT_URL`: Vector DB
- `ENCRYPTION_KEY`: For API key encryption (32 bytes)
- `STORAGE_ROOT`: Filesystem base (`/app/storage` in Docker)
- `SKILLS_ROOT`: Skills directory (`/app/skills` in Docker, read-only)
- `DEFAULT_PROVIDER_BASE_URL`, `DEFAULT_PROVIDER_API_KEY`: Local provider fallback

### Folder Structure Semantics

- `/apps/backend/src/{module}`: Feature modules (each has `.module.ts`, `.service.ts`, `.controller.ts`)
- `/packages`: Shared code (@openagent/types, @openagent/shared, @openagent/sdk, @openagent/ui)
- `/storage`: Persisted files (uploads, documents, images, exports, backups)
- `/skills`: Skill YAML definitions (loaded dynamically)
- `/services`: Documentation/reference (not included in builds)
- `/docker`: Nginx config

### Error Handling

- Services throw exceptions; controllers catch and return HTTP errors
- Return `{ ok: boolean, output?, error? }` for tool results
- Always sanitize responses (never return encrypted API keys via API)

## Common Implementation Sequence

When adding a feature:

1. **Define types** in `packages/types/src/index.ts`
2. **Add Prisma schema** model (if persistent)
3. **Run `npm run build`** to regenerate types in backend
4. **Create NestJS service** with business logic
5. **Create controller** endpoints
6. **Register in module** file and export from `AppModule`
7. **Frontend**: Add client components + TanStack Query hooks
8. **Test**: `npm test` (both unit + manual Docker smoke test)

## Watch Out For

- **Circular dependencies**: NestJS modules importing each other. Refactor into shared service.
- **Direct provider access**: Any code calling provider SDKs outside adapters will break provider swaps.
- **Frontend state duplication**: Never useContext + TanStack Query for same data.
- **Approval bypass**: Frontend cannot approve dangerous tools; that's server-side only.
- **Unencrypted secrets**: Always use `CryptoService` for API keys.

## Definition of Done

Code is production-ready when:
- Implementation complete + tests pass (`npm test`)
- Docker builds without errors (`npm run build && docker compose build`)
- All workspace dependencies built (`npm run build --workspaces`)
- Documentation updated (READMEs in services/, inline comments for complex logic)
- Security reviewed (no API key leaks, dangerous tools require approval)

Do not merge incomplete features; partial implementations break integration.
