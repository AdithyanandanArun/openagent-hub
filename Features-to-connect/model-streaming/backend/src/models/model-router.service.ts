// src/models/model-router.service.ts
// Central registry. Instantiates adapters from DB/env config and routes
// streamChat() calls to the right provider.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderAdapter, ModelInfo, ChatCompletionOptions, StreamChunk } from './provider-adapter';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

/** Shape of the Provider row in DB */
interface ProviderRow {
  id: string;
  name: string;         // "openai" | "ollama" | "groq" | "lmstudio" | etc.
  displayName: string;
  apiKey: string;
  baseUrl: string | null;
  enabled: boolean;
}

@Injectable()
export class ModelRouterService implements OnModuleInit {
  private readonly logger = new Logger(ModelRouterService.name);
  private adapters = new Map<string, ProviderAdapter>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadAdapters();
  }

  // ─── Adapter Registry ───────────────────────────────────────────────────────

  async loadAdapters(): Promise<void> {
    this.adapters.clear();

    // Load from DB
    const providers = await this.getProvidersFromDb();

    for (const p of providers) {
      if (!p.enabled) continue;
      const adapter = this.buildAdapter(p);
      if (adapter) {
        this.adapters.set(p.name, adapter);
        this.logger.log(`Loaded provider: ${p.displayName}`);
      }
    }

    // Fallback: load from environment variables if DB is empty
    if (this.adapters.size === 0) {
      this.loadAdaptersFromEnv();
    }

    this.logger.log(`${this.adapters.size} provider(s) active`);
  }

  private loadAdaptersFromEnv() {
    const envProviders: Array<{ id: string; name: string; envKey: string; baseUrl?: string }> = [
      { id: 'openai',   name: 'OpenAI',    envKey: 'OPENAI_API_KEY' },
      { id: 'groq',     name: 'Groq',      envKey: 'GROQ_API_KEY' },
      { id: 'ollama',   name: 'Ollama',    envKey: 'OLLAMA_API_KEY', baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1' },
      { id: 'lmstudio', name: 'LM Studio', envKey: 'LMSTUDIO_API_KEY', baseUrl: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1' },
    ];

    for (const p of envProviders) {
      const apiKey = process.env[p.envKey];
      if (!apiKey && !['ollama', 'lmstudio'].includes(p.id)) continue;

      const adapter = new OpenAICompatibleAdapter(p.id, p.name, {
        apiKey: apiKey || 'none',
        baseUrl: p.baseUrl,
      });
      this.adapters.set(p.id, adapter);
      this.logger.log(`Loaded from env: ${p.name}`);
    }
  }

  private buildAdapter(p: ProviderRow): ProviderAdapter | null {
    // All supported providers use the OpenAI-compatible API
    return new OpenAICompatibleAdapter(p.name, p.displayName, {
      apiKey:  p.apiKey,
      baseUrl: p.baseUrl ?? undefined,
    });
  }

  private async getProvidersFromDb(): Promise<ProviderRow[]> {
    try {
      // @ts-ignore — Provider model added by migration
      return await this.prisma.provider.findMany({ where: { enabled: true } });
    } catch {
      // Provider table may not exist yet in early dev
      return [];
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  getAdapter(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new NotFoundException(
        `Provider "${providerId}" not found. Available: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    return adapter;
  }

  listAdapters(): ProviderAdapter[] {
    return [...this.adapters.values()];
  }

  async listAllModels(): Promise<ModelInfo[]> {
    const results = await Promise.allSettled(
      [...this.adapters.values()].map((a) => a.listModels()),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ModelInfo[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }

  async listModelsForProvider(providerId: string): Promise<ModelInfo[]> {
    return this.getAdapter(providerId).listModels();
  }

  async healthCheckAll(): Promise<Record<string, { ok: boolean; latencyMs: number; error?: string }>> {
    const entries = await Promise.all(
      [...this.adapters.entries()].map(async ([id, adapter]) => {
        const result = await adapter.healthCheck();
        return [id, result] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  /**
   * Route a streaming request to the correct adapter.
   * Determines provider from the model id prefix or explicit providerId.
   */
  async *streamChat(
    options: ChatCompletionOptions & { providerId?: string },
  ): AsyncGenerator<StreamChunk> {
    const providerId = options.providerId ?? this.inferProvider(options.model);
    const adapter    = this.getAdapter(providerId);

    this.logger.debug(`Streaming ${options.model} via ${providerId}`);
    yield* adapter.streamChat(options);
  }

  /** Best-effort: infer provider from model name */
  private inferProvider(model: string): string {
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('mixtral') || model.startsWith('llama') || model.startsWith('gemma')) {
      // Could be ollama or groq — prefer whichever is registered
      if (this.adapters.has('groq'))   return 'groq';
      if (this.adapters.has('ollama')) return 'ollama';
    }
    // Default to first available adapter
    const first = this.adapters.keys().next().value;
    if (!first) throw new BadRequestException('No providers configured');
    return first;
  }
}
