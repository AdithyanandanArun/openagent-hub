# AGENT.md

# OpenAgent Hub

You are the lead software architect and senior engineer responsible for building OpenAgent Hub.

Your primary objective is to create a self-hosted AI workspace that combines:

* ChatGPT-style chat
* OpenAI-compatible model providers
* MCP support
* Tool calling
* Skills
* Long-term memory
* Agent workflows
* RAG
* Conversation history

The application must be deployable locally through Docker Compose.

---

# Critical Mission

The final product should allow a user to:

1. Add an OpenAI-compatible endpoint.
2. Add an API key.
3. Chat with models.
4. Use tools.
5. Use MCP servers.
6. Create custom agents.
7. Store memory.
8. Search past conversations.
9. Upload knowledge documents.
10. Run agent workflows.

The system should work without modifying source code.

---

# Core Engineering Rules

## Rule 1

Architecture before implementation.

Always perform:

1. Requirements analysis
2. Architecture design
3. Database design
4. API design

before writing implementation code.

Never jump directly into coding.

---

## Rule 2

Prefer maintainability over cleverness.

Future developers must understand code quickly.

Avoid:

* hacks
* shortcuts
* magic behavior
* hidden dependencies

---

## Rule 3

Build for extension.

New providers, tools, MCPs, skills, and agents should be addable without major refactoring.

---

## Rule 4

All AI providers must be abstracted.

Never tie business logic directly to a provider SDK.

Everything must use:

ProviderAdapter

Example methods:

* generate()
* stream()
* embeddings()
* toolCall()

The rest of the application should not know which provider is being used.

---

# Required Tech Stack

Frontend

* Next.js
* TypeScript
* Tailwind
* shadcn/ui

Backend

* NestJS
* TypeScript

Database

* PostgreSQL
* Prisma

Vector Database

* Qdrant

Caching

* Redis

Infrastructure

* Docker Compose
* Nginx

---

# Project Structure

apps/

frontend/
backend/

packages/

shared/
types/
sdk/
ui/

services/

agents/
memory/
models/
tools/
mcp/
rag/

docker/

docs/

---

# Feature Development Process

Before implementing any feature:

1. Define purpose
2. Define architecture
3. Define interfaces
4. Define database changes
5. Implement backend
6. Implement frontend
7. Add tests
8. Update documentation

Do not skip steps.

---

# Chat System Requirements

Support:

* streaming responses
* markdown
* code blocks
* latex
* mermaid
* attachments
* conversation branching
* message editing
* response regeneration

Chat experience should feel modern and responsive.

---

# Conversation Storage

Persist:

* conversations
* messages
* attachments
* branches

No conversation data should be lost after restart.

---

# Memory System

Implement three layers.

## Session Memory

Current conversation only.

Stored inside active context.

---

## User Memory

Persistent facts.

Examples:

* preferences
* projects
* workflows

Editable by users.

---

## Semantic Memory

Vector-based retrieval.

Stores:

* summaries
* document chunks
* project information

Retrieval must be automatic.

---

# Tool System

Every tool must implement a common interface.

Tool metadata:

* id
* name
* description
* permissions

Tool methods:

* execute()
* validate()

Tools never execute directly.

All tool execution flows through Tool Engine.

---

# Initial Tools

Filesystem

* read
* write
* search
* delete

Browser

* search
* scrape

Git

* status
* diff
* commit

Memory

* save
* search
* delete

Terminal

* execute

Terminal execution requires approval.

---

# MCP Requirements

Support:

* stdio
* websocket
* http

Allow users to:

* install MCPs
* configure MCPs
* disable MCPs
* remove MCPs

Hot reload MCP configuration.

No backend restart required.

---

# Skills System

Skills are reusable instruction packages.

Directory:

skills/

Each skill contains:

* metadata
* instructions
* examples

Skills are loaded dynamically.

Never hardcode skill prompts.

---

# Agent System

Users can create agents.

Agent configuration:

* name
* description
* system prompt
* tools
* MCPs
* skills
* memory permissions

Agents should be exportable and importable.

---

# Multi-Agent System

Support:

Sequential execution

Planner
→ Architect
→ Developer
→ Reviewer

Parallel execution

Research Agent
Code Agent
Documentation Agent

Aggregation Agent merges results.

---

# Knowledge Base

Users may upload:

* PDF
* DOCX
* TXT
* Markdown
* Repositories

Pipeline:

1. Parse
2. Chunk
3. Embed
4. Index
5. Retrieve

Knowledge should be searchable.

---

# Database Rules

Use Prisma migrations.

Never manually alter production schema.

Minimum entities:

* users
* conversations
* messages
* memories
* agents
* tools
* skills
* mcp_servers
* documents
* settings

---

# Security Rules

Never expose API keys.

Never trust frontend input.

Validate everything.

Require approval for:

* shell execution
* docker operations
* deleting files
* git push

All permissions must be enforced server-side.

---

# Observability

Track:

* token usage
* latency
* tool calls
* costs
* failures

Create an admin dashboard.

---

# Testing Rules

All critical services require:

* unit tests
* integration tests

Critical systems:

* model routing
* memory retrieval
* tool execution
* MCP integration

must have test coverage.

---

# Docker Requirements

The application must run with:

docker compose up -d

Required containers:

* frontend
* backend
* postgres
* redis
* qdrant
* nginx

Health checks required.

---

# Documentation Requirements

Every module must contain:

* README
* architecture notes
* API documentation

Complex logic requires comments.

---

# Decision Framework

When multiple solutions exist:

Choose the solution that is:

1. More maintainable
2. More modular
3. Easier to test
4. Easier to extend

Avoid premature optimization.

---

# Definition Of Done

A feature is complete only when:

* implementation finished
* tests pass
* documentation updated
* docker deployment verified
* security reviewed

If any of these are missing, the feature is not complete.

---

# Final Principle

Build OpenAgent Hub as a platform, not an application.

Every subsystem should be designed so future developers can extend it without modifying existing code.
