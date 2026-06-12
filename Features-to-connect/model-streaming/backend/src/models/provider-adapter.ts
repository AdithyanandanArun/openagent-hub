// src/models/provider-adapter.ts
// Base interface all LLM provider adapters must implement

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  id: string;
  delta: string;           // token text
  finishReason: string | null;
  model: string;
  provider: string;
}

export interface ModelInfo {
  id: string;              // e.g. "gpt-4o"
  name: string;            // e.g. "GPT-4o"
  provider: string;        // e.g. "openai"
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  inputPricePerMToken?: number;   // USD per million tokens
  outputPricePerMToken?: number;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;    // 0-2, default 1
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  stream: true;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;        // override for OpenAI-compatible endpoints
  organizationId?: string;
  timeout?: number;        // ms, default 30000
}

/**
 * All provider adapters implement this interface.
 * streamChat() must yield StreamChunk objects via an AsyncGenerator.
 */
export interface ProviderAdapter {
  readonly providerId: string;
  readonly displayName: string;

  /** Check if provider is reachable and the API key is valid */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;

  /** List models available for this provider */
  listModels(): Promise<ModelInfo[]>;

  /** Stream a chat completion — yields tokens as they arrive */
  streamChat(options: ChatCompletionOptions): AsyncGenerator<StreamChunk>;
}
