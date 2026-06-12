# PROJECT_RULES.md

# OpenAgent Hub

This document defines all technical standards, architecture requirements, coding conventions, database rules, frontend rules, backend rules, memory systems, MCP standards, and development requirements.

These rules apply to every feature and module.

---

# Technology Stack

Frontend

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui
* TanStack Query

Backend

* NestJS
* TypeScript

Database

* PostgreSQL
* Prisma

Vector Database

* Qdrant

Cache / Queue

* Redis

Infrastructure

* Docker Compose
* Nginx

---

# Primary Goal

Build a self-hosted AI workspace supporting:

* OpenAI-compatible APIs
* Chat
* Agents
* MCP
* Skills
* Memory
* RAG
* Tools
* Knowledge Bases
* Conversation History

Everything must work locally through Docker.

---

# OpenAI Compatible Requirement

Assume providers expose:

/chat/completions

/models

/embeddings

Never directly couple business logic to provider SDKs.

All providers must be accessed through:

ProviderAdapter

Required methods:

* generate()
* stream()
* embeddings()
* toolCall()

Supported examples:

* OpenRouter
* LiteLLM
* Ollama OpenAI Endpoint
* LocalAI
* vLLM
* Azure OpenAI
* Custom OpenAI-Compatible APIs

---

# Folder Structure

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
tools/
mcp/
rag/
models/

storage/

uploads/
documents/
images/
exports/

docker/

docs/

---

# Backend Standards

Framework:

NestJS

Requirements:

* Dependency Injection
* Modular architecture
* Service-based design

Avoid:

* global state
* circular dependencies
* business logic inside controllers

Controllers:

Handle requests only.

Services:

Contain business logic.

Repositories:

Contain database access.

---

# Frontend Standards

Framework:

Next.js App Router

Use:

* Server Components by default
* Client Components only when necessary

UI:

* shadcn/ui
* TailwindCSS

State:

* TanStack Query

Avoid:

* unnecessary global state
* duplicated API calls

---

# Database Standards

Primary database:

PostgreSQL

ORM:

Prisma

Required entities:

users

conversations

messages

agents

skills

tools

memories

documents

mcp_servers

settings

attachments

All schema changes must use migrations.

Never manually modify production schemas.

---

# Vector Database Standards

Use Qdrant.

Store:

* embeddings
* memories
* document chunks
* conversation summaries

Do not store primary business data in Qdrant.

PostgreSQL remains source of truth.

---

# Memory System

Three layers required.

Session Memory

Current conversation.

Stored temporarily.

User Memory

Persistent user facts.

Examples:

* preferences
* projects
* workflows

Stored in PostgreSQL.

Semantic Memory

Stored in Qdrant.

Contains:

* summaries
* embeddings
* contextual knowledge

Memory retrieval should be automatic.

---

# Conversation System

Support:

* chat history
* branching
* regeneration
* editing
* search

Messages must persist across restarts.

No conversation loss is acceptable.

---

# Tool System

Every tool must implement:

Tool

Properties:

* id
* name
* description
* permissions

Methods:

* validate()
* execute()

Tools execute only through Tool Engine.

Never allow direct execution.

---

# Initial Tool Categories

Filesystem

* read
* write
* delete
* search

Browser

* search
* scrape

Memory

* save
* retrieve
* delete

Git

* status
* diff
* commit

Terminal

* execute

Terminal execution requires approval.

---

# MCP Standards

Support:

* stdio
* websocket
* http

Users must be able to:

* install
* remove
* configure
* enable
* disable

MCPs should hot reload.

Backend restart should not be required.

---

# Skills Standards

Skills are instruction packs.

Structure:

skill.yaml

Required fields:

* name
* description
* version
* instructions

Skills load dynamically.

Never hardcode skills.

---

# Agent Standards

Agent configuration includes:

* name
* description
* system prompt
* tools
* MCPs
* skills
* memory permissions

Agents must be exportable.

Agents must be importable.

---

# Multi-Agent Standards

Sequential workflows:

Planner

↓

Architect

↓

Developer

↓

Reviewer

Parallel workflows:

Research Agent

Code Agent

Documentation Agent

↓

Aggregator

Use structured outputs.

Avoid freeform communication between agents.

---

# Knowledge Base Standards

Support:

* PDF
* DOCX
* TXT
* Markdown
* Git repositories

Pipeline:

Parse

↓

Chunk

↓

Embed

↓

Store

↓

Retrieve

Knowledge retrieval must support citations.

---

# Authentication Standards

Support:

* local accounts
* API keys

OAuth can be added later.

Passwords must be hashed.

Secrets must be encrypted.

---

# Security Standards

Never expose:

* API keys
* secrets
* credentials

Validate all user input.

Require approval for:

* shell commands
* docker commands
* file deletion
* git push

Security must be enforced server-side.

---

# API Standards

REST-first design.

Examples:

/api/chat

/api/models

/api/tools

/api/memory

/api/mcp

/api/agents

/api/documents

Streaming:

* Server Sent Events preferred
* WebSockets optional

---

# Monitoring Standards

Track:

* token usage
* provider costs
* latency
* tool usage
* failures
* memory retrieval

Expose metrics dashboard.

---

# Docker Standards

Application must start using:

docker compose up -d

Required containers:

frontend

backend

postgres

redis

qdrant

nginx

All services require health checks.

---

# Code Quality Standards

Use strict TypeScript.

Avoid any.

Prefer interfaces.

Prefer composition over inheritance.

Document public APIs.

Use meaningful names.

Avoid overly complex abstractions.

---

# Testing Standards

Required:

* Unit Tests
* Integration Tests

Critical modules:

* Model Router
* Memory Engine
* Tool Engine
* MCP Engine

must have coverage.

---

# Performance Standards

Optimize for maintainability first.

Avoid premature optimization.

Profile before optimizing.

Use caching where beneficial.

---

# Definition Of Done

A task is complete only when:

* code implemented
* tests pass
* documentation updated
* docker build succeeds
* feature manually verified
* security reviewed

Otherwise the task is incomplete.
