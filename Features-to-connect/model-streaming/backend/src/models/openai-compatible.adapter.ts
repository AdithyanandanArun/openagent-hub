// src/models/openai-compatible.adapter.ts
// Works with OpenAI, Ollama, LM Studio, Together AI, Groq, Mistral, and any
// server that speaks the OpenAI chat-completions API.

import {
  ProviderAdapter,
  ProviderConfig,
  ChatCompletionOptions,
  StreamChunk,
  ModelInfo,
} from './provider-adapter';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

/** Static model catalogue per provider (supplemented by live /models call) */
const KNOWN_MODELS: Record<string, Omit<ModelInfo, 'provider'>[]> = {
  openai: [
    { id: 'gpt-4o',           name: 'GPT-4o',            contextWindow: 128_000, maxOutputTokens: 4_096, supportsStreaming: true, inputPricePerMToken: 5,    outputPricePerMToken: 15   },
    { id: 'gpt-4o-mini',      name: 'GPT-4o Mini',       contextWindow: 128_000, maxOutputTokens: 4_096, supportsStreaming: true, inputPricePerMToken: 0.15, outputPricePerMToken: 0.6  },
    { id: 'gpt-4-turbo',      name: 'GPT-4 Turbo',       contextWindow: 128_000, maxOutputTokens: 4_096, supportsStreaming: true, inputPricePerMToken: 10,   outputPricePerMToken: 30   },
    { id: 'gpt-3.5-turbo',    name: 'GPT-3.5 Turbo',     contextWindow: 16_385,  maxOutputTokens: 4_096, supportsStreaming: true, inputPricePerMToken: 0.5,  outputPricePerMToken: 1.5  },
  ],
  ollama: [
    { id: 'llama3.2',         name: 'Llama 3.2',          contextWindow: 128_000, maxOutputTokens: 4_096, supportsStreaming: true },
    { id: 'mistral',          name: 'Mistral 7B',          contextWindow: 32_768,  maxOutputTokens: 4_096, supportsStreaming: true },
    { id: 'codellama',        name: 'Code Llama',          contextWindow: 16_384,  maxOutputTokens: 4_096, supportsStreaming: true },
    { id: 'phi3',             name: 'Phi-3',               contextWindow: 128_000, maxOutputTokens: 4_096, supportsStreaming: true },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextWindow: 128_000, maxOutputTokens: 32_768, supportsStreaming: true, inputPricePerMToken: 0.59, outputPricePerMToken: 0.79 },
    { id: 'mixtral-8x7b-32768',      name: 'Mixtral 8x7B',  contextWindow: 32_768,  maxOutputTokens: 32_768, supportsStreaming: true, inputPricePerMToken: 0.27, outputPricePerMToken: 0.27 },
    { id: 'gemma2-9b-it',            name: 'Gemma 2 9B',    contextWindow: 8_192,   maxOutputTokens: 8_192,  supportsStreaming: true, inputPricePerMToken: 0.2,  outputPricePerMToken: 0.2  },
  ],
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  ollama: 'http://localhost:11434/v1',
  groq:   'https://api.groq.com/openai/v1',
  lmstudio: 'http://localhost:1234/v1',
  together: 'https://api.together.xyz/v1',
};

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly providerId: string;
  readonly displayName: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly logger: Logger;

  constructor(providerId: string, displayName: string, config: ProviderConfig) {
    this.providerId  = providerId;
    this.displayName = displayName;
    this.apiKey      = config.apiKey;
    this.baseUrl     = (config.baseUrl || DEFAULT_BASE_URLS[providerId] || 'http://localhost:11434/v1').replace(/\/$/, '');
    this.timeout     = config.timeout ?? 30_000;
    this.logger      = new Logger(`${displayName}Adapter`);
  }

  // ─── Health Check ───────────────────────────────────────────────────────────

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await this.fetch('/models', { method: 'GET' });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { ok: false, latencyMs, error: `HTTP ${res.status}` };
      }
      return { ok: true, latencyMs };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  // ─── List Models ────────────────────────────────────────────────────────────

  async listModels(): Promise<ModelInfo[]> {
    const known = (KNOWN_MODELS[this.providerId] ?? []).map((m) => ({
      ...m,
      provider: this.providerId,
    }));

    // Try to enrich with live /models (best effort)
    try {
      const res  = await this.fetch('/models', { method: 'GET' });
      const data = await res.json();
      const liveIds: Set<string> = new Set(
        (data.data ?? []).map((m: any) => m.id as string),
      );

      // Merge: prefer known metadata, add any live-only models
      const knownIds = new Set(known.map((m) => m.id));
      const extras: ModelInfo[] = [...liveIds]
        .filter((id) => !knownIds.has(id))
        .map((id) => ({
          id,
          name: id,
          provider: this.providerId,
          contextWindow: 4_096,
          maxOutputTokens: 4_096,
          supportsStreaming: true,
        }));

      return [...known, ...extras];
    } catch {
      return known;
    }
  }

  // ─── Stream Chat ────────────────────────────────────────────────────────────

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const messages = options.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...options.messages]
      : options.messages;

    const body = JSON.stringify({
      model:       options.model,
      messages,
      temperature: options.temperature ?? 1,
      max_tokens:  options.maxTokens,
      top_p:       options.topP,
      stream:      true,
    });

    let response: Response;
    try {
      response = await this.fetch('/chat/completions', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      throw new Error(`${this.displayName} connection failed: ${err.message}`);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`${this.displayName} API error ${response.status}: ${errBody}`);
    }

    const reader  = response.body!.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';   // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json  = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content ?? '';
            const finishReason = json.choices?.[0]?.finish_reason ?? null;

            if (delta || finishReason) {
              yield {
                id:           json.id ?? uuid(),
                delta,
                finishReason,
                model:        json.model ?? options.model,
                provider:     this.providerId,
              };
            }
          } catch {
            // Malformed SSE line — skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private fetch(path: string, init: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };

    if (this.apiKey && this.apiKey !== 'none') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  }
}
