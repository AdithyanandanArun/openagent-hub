import { Injectable } from "@nestjs/common";
import type {
  EmbeddingRequest,
  EmbeddingResponse,
  GenerateRequest,
  GenerateResponse,
  ProviderConfig,
  ToolExecutionRequest,
  ToolExecutionResult
} from "@openagent/types";
import { OpenAiCompatibleAdapter } from "./openai-compatible.adapter";
import { ProviderAdapter } from "./provider-adapter";
import { ProvidersService } from "./providers.service";

@Injectable()
export class ModelRouterService {
  private readonly adapters = new Map<string, ProviderAdapter>();

  constructor(
    private readonly providers: ProvidersService,
    openAiCompatibleAdapter: OpenAiCompatibleAdapter
  ) {
    this.registerProvider({
      id: "default",
      name: "Default OpenAI-Compatible Provider",
      baseUrl: process.env.DEFAULT_PROVIDER_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.DEFAULT_PROVIDER_API_KEY
    }, openAiCompatibleAdapter);
  }

  registerProvider(config: ProviderConfig, adapter: ProviderAdapter): void {
    adapter.configure(config);
    this.adapters.set(config.id, adapter);
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return (await this.getAdapter(request.providerId)).generate(request);
  }

  async *stream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    const adapter = await this.getAdapter(request.providerId);
    yield* adapter.stream(request);
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.embeddings(request);
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return (await this.getAdapter(request.providerId)).embeddings(request);
  }

  async toolCall(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    return (await this.getAdapter("default")).toolCall(request);
  }

  listProviders(userId?: string): Promise<ProviderConfig[]> {
    return this.providers.list(userId);
  }

  async upsertProvider(config: { id?: string; userId?: string; name: string; baseUrl: string; apiKey?: string; enabled?: boolean }) {
    const provider = await this.providers.upsert(config);
    const adapter = new OpenAiCompatibleAdapter();
    adapter.configure(await this.providers.getConfig(provider.id));
    this.adapters.set(provider.id, adapter);
    return provider;
  }

  removeProvider(id: string) {
    this.adapters.delete(id);
    return this.providers.remove(id);
  }

  private async getAdapter(providerId: string): Promise<ProviderAdapter> {
    const adapter = this.adapters.get(providerId);
    if (adapter) {
      return adapter;
    }

    const config = await this.providers.getConfig(providerId);
    const resolvedAdapter = new OpenAiCompatibleAdapter();
    resolvedAdapter.configure(config);
    this.adapters.set(providerId, resolvedAdapter);
    return resolvedAdapter;
  }
}
