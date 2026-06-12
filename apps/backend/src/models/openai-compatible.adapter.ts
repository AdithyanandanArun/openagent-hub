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
import { ProviderAdapter } from "./provider-adapter";

@Injectable()
export class OpenAiCompatibleAdapter implements ProviderAdapter {
  readonly id = "openai-compatible";
  private config?: ProviderConfig;

  configure(config: ProviderConfig): void {
    this.config = config;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const config = this.requireConfig();
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(config),
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        tools: request.tools
      })
    });

    if (!response.ok) {
      throw new Error(`Provider ${config.name} generate failed with ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { role?: string; content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const choice = body.choices?.[0]?.message;

    return {
      providerId: request.providerId,
      model: request.model,
      message: {
        role: "assistant",
        content: choice?.content ?? ""
      },
      usage: body.usage
        ? {
            promptTokens: body.usage.prompt_tokens ?? 0,
            completionTokens: body.usage.completion_tokens ?? 0,
            totalTokens: body.usage.total_tokens ?? 0
          }
        : undefined
    };
  }

  async *stream(request: GenerateRequest): AsyncIterable<GenerateResponse> {
    yield await this.generate(request);
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const config = this.requireConfig();
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers(config),
      body: JSON.stringify({ model: request.model, input: request.input })
    });

    if (!response.ok) {
      throw new Error(`Provider ${config.name} embeddings failed with ${response.status}`);
    }

    const body = (await response.json()) as { data?: Array<{ embedding: number[] }> };
    return {
      providerId: request.providerId,
      model: request.model,
      vectors: body.data?.map((item) => item.embedding) ?? []
    };
  }

  async toolCall(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    return {
      toolId: request.toolId,
      ok: false,
      error: "Provider tool calls are routed through ToolEngine before execution."
    };
  }

  private requireConfig(): ProviderConfig {
    if (!this.config) {
      throw new Error("Provider adapter is not configured");
    }

    return this.config;
  }

  private headers(config: ProviderConfig): Record<string, string> {
    return {
      "content-type": "application/json",
      ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {})
    };
  }
}
