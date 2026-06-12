# Feature 2: Model Streaming

Real-time LLM streaming via SSE. Supports OpenAI, Ollama, Groq, LM Studio, and any OpenAI-compatible API.

## Files

### Backend
```
backend/
├── prisma/schema.prisma              # + Provider, Conversation, Message models
└── src/
    ├── app.module.ts                 # Updated: adds ModelsModule + ChatModule
    ├── models/
    │   ├── provider-adapter.ts       # Interface all adapters implement
    │   ├── openai-compatible.adapter.ts  # Works with OpenAI / Ollama / Groq / etc.
    │   ├── model-router.service.ts   # Registry: loads providers, routes requests
    │   ├── models.controller.ts      # GET /models, GET /models/health, etc.
    │   └── models.module.ts
    └── chat/
        ├── chat.controller.ts        # POST /chat/stream (SSE), POST /chat/complete
        ├── chat.module.ts
        └── dto/stream-chat.dto.ts
```

### Frontend
```
frontend/
├── hooks/
│   ├── useStreamChat.ts     # Core streaming hook
│   └── useModels.ts         # Fetch available models
└── app/chat/page.tsx        # Example chat UI
```

## Setup

### 1. Migrate database
```bash
cd backend
npx prisma migrate dev --name add_streaming
```

### 2. Configure providers (pick any)

**Option A — OpenAI:**
```bash
echo "OPENAI_API_KEY=sk-..." >> .env
```

**Option B — Ollama (free, local):**
```bash
# Install: https://ollama.com
ollama serve
ollama pull llama3.2
# No API key needed
```

**Option C — Groq (free tier):**
```bash
# Get key at console.groq.com
echo "GROQ_API_KEY=gsk_..." >> .env
```

### 3. Add a provider via DB (optional, overrides env)
```sql
INSERT INTO providers (id, name, display_name, api_key, base_url, enabled)
VALUES (gen_random_uuid(), 'ollama', 'Ollama', 'none', 'http://localhost:11434/v1', true);
```

## API Endpoints

### Models
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/models | All models from all providers |
| GET | /api/v1/models/providers | Active provider list |
| GET | /api/v1/models/health | Connectivity check |
| GET | /api/v1/models/:providerId | Models for one provider |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/chat/stream | Stream tokens via SSE |
| POST | /api/v1/chat/complete | Full response (non-streaming) |

All endpoints require `Authorization: Bearer <jwt>`.

## SSE Event Format

```
data: {"type":"token","delta":"Hello","id":"chatcmpl-..."}

data: {"type":"done","model":"gpt-4o","provider":"openai","durationMs":1200,"tokens":42}

data: {"type":"error","message":"Connection refused"}
```

## Frontend Usage

```tsx
import { useStreamChat } from '@/hooks/useStreamChat';
import { useModels } from '@/hooks/useModels';

function ChatComponent() {
  const { messages, sendMessage, isStreaming, abort } = useStreamChat();
  const { models } = useModels();

  return (
    <button onClick={() => sendMessage({ model: 'gpt-4o', content: 'Hello!' })}>
      Send
    </button>
  );
}
```

## Adding a New Provider

1. Any OpenAI-compatible API works out of the box — just set the `baseUrl`:
```typescript
// Automatically handled by OpenAICompatibleAdapter
new OpenAICompatibleAdapter('myprovider', 'My Provider', {
  apiKey:  'sk-...',
  baseUrl: 'https://api.myprovider.com/v1',
});
```

2. For non-OpenAI APIs, implement `ProviderAdapter` from `provider-adapter.ts`.

## Running Tests

```bash
cd backend
npm run test:e2e -- --testPathPattern=streaming
```

Live LLM tests are skipped by default (marked `.skip`).
Remove `.skip` and set your API key to run them.
