# ARCHITECT.md

# OpenAgent Hub Architecture

This document defines the system architecture.

All implementation decisions must follow this architecture unless explicitly approved.

---

# Architecture Philosophy

The platform must be:

* Modular
* Provider Agnostic
* Extensible
* Self Hosted
* Docker First

The architecture should support future additions without major rewrites.

Examples:

* New model providers
* New MCP servers
* New tools
* New memory systems
* New agents
* New UI features

---

# System Overview

Frontend

↓

Backend API

↓

Core Services

↓

Storage + External Systems

---

# High Level Components

Frontend

* Chat Interface
* Agent Manager
* MCP Manager
* Skill Manager
* Settings
* Memory Explorer

Backend

* API Layer
* Authentication
* Chat Service
* Model Router
* Tool Engine
* MCP Engine
* Memory Engine
* Agent Engine
* Knowledge Engine

Storage

* PostgreSQL
* Qdrant
* Redis
* Local Files

---

# Service Boundaries

Services must not access each other's internal implementation.

Communication occurs through interfaces.

Example:

Good

ChatService
→ ModelRouter

Bad

ChatService
→ OpenRouter SDK

---

# Core Services

## Chat Service

Responsible for:

* conversations
* messages
* branches
* streaming

Must not know provider details.

Uses:

Model Router

---

## Model Router

Single entry point for all AI models.

Responsibilities:

* routing
* retries
* failover
* streaming
* provider selection

Public API:

generate()

stream()

embed()

toolCall()

No other service may directly call model providers.

---

## Tool Engine

Responsible for:

* tool registration
* validation
* execution
* permissions

Tools are plugins.

Tool Engine owns all execution.

---

## MCP Engine

Responsible for:

* discovery
* registration
* execution
* lifecycle management

Supports:

* stdio
* websocket
* http

MCPs are treated as plugins.

---

## Memory Engine

Responsible for:

* memory creation
* retrieval
* summarization
* ranking

Memory retrieval should be automatic.

---

## Agent Engine

Responsible for:

* agent configuration
* orchestration
* workflow execution

Supports:

* single agent
* multi-agent

---

## Knowledge Engine

Responsible for:

* document parsing
* chunking
* embeddings
* retrieval

Knowledge storage is independent from memory.

---

# Provider Architecture

All providers implement:

ProviderAdapter

Methods:

generate()

stream()

embeddings()

toolCall()

Supported Providers

* OpenAI Compatible APIs
* OpenRouter
* LocalAI
* LiteLLM
* Ollama
* vLLM
* Azure OpenAI

The application should not care which provider is active.

---

# OpenAI Compatible Requirement

Primary target is OpenAI-compatible APIs.

Assume providers expose:

/chat/completions

/models

/embeddings

Provider-specific logic must remain inside adapters.

---

# Memory Architecture

Three Layers

Session Memory

* active conversation

User Memory

* persistent facts

Semantic Memory

* vector retrieval

Storage

Session

Redis

User

PostgreSQL

Semantic

Qdrant

---

# Database Architecture

PostgreSQL is source of truth.

Stores:

* users
* chats
* messages
* settings
* agents
* skills
* memories
* MCP configs

Qdrant stores vectors only.

Never duplicate ownership.

---

# File Architecture

Local Storage

/storage

Subfolders

/uploads

/documents

/images

/exports

/backups

Files are referenced from database.

Never store large binaries in PostgreSQL.

---

# Event Architecture

Long operations should use events.

Examples

Document Uploaded

↓

Parse Document

↓

Chunk Document

↓

Generate Embeddings

↓

Store In Qdrant

Use Redis queues.

---

# Agent Architecture

Agent

Contains:

* Prompt
* Skills
* Tools
* MCPs
* Memory Access

Execution Context

Contains:

* Conversation
* User
* Session
* Memory

Agents must be stateless.

State belongs in storage.

---

# Multi Agent Architecture

Sequential

Planner

↓

Architect

↓

Developer

↓

Reviewer

Parallel

Research Agent

Code Agent

Documentation Agent

↓

Aggregator

Agent communication occurs through structured outputs.

---

# Frontend Architecture

Pages

/chat

/agents

/memory

/skills

/mcp

/settings

/admin

State Management

TanStack Query

Server Components where possible.

Client Components only when needed.

---

# API Architecture

REST First

Examples

/api/chat

/api/models

/api/memory

/api/agents

/api/mcp

/api/tools

Streaming

Server Sent Events

or

WebSockets

---

# Security Architecture

API keys encrypted.

Secrets never exposed.

Permissions enforced server-side.

Dangerous actions require approval.

Examples

* shell execution
* docker execution
* file deletion

---

# Observability Architecture

Metrics

* token usage
* latency
* provider errors
* tool execution
* memory retrieval

Logs must be structured.

No console.log in production.

---

# Docker Architecture

Containers

frontend

backend

postgres

redis

qdrant

nginx

All services communicate through internal docker network.

Only nginx exposed publicly.

---

# Scaling Philosophy

Optimize for simplicity first.

Single machine first.

Scale vertically before horizontally.

Avoid Kubernetes until truly necessary.

---

# Architectural Rule

If a feature introduces tight coupling between services, redesign it.

Loose coupling is always preferred.
