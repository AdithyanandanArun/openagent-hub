# OpenAgent Hub

OpenAgent Hub is a Docker-first, self-hosted AI workspace for OpenAI-compatible providers, persistent chat, tools, MCP configuration, skills, memory, agents, and knowledge workflows.

## Run Locally

```bash
docker compose up -d
```

Open `http://localhost`.

## Development

```bash
npm install
npm test
npm run build
```

The stack uses Next.js, NestJS, PostgreSQL with Prisma, Redis, Qdrant, and Nginx.

See [instructions.md](instructions.md) for implementation status, verified features, and remaining work.
