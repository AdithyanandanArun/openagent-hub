import { describe, expect, it } from "vitest";
import type { EmbeddingRequest, GenerateRequest, ProviderConfig, ToolExecutionRequest } from "@openagent/types";
import { ModelRouterService } from "../src/models/model-router.service";
import { ProviderAdapter } from "../src/models/provider-adapter";
import type { ProvidersService } from "../src/models/providers.service";

class FakeAdapter implements ProviderAdapter {
  readonly id = "fake";
  config?: ProviderConfig;

  configure(config: ProviderConfig): void {
    this.config = config;
  }

  async generate(request: GenerateRequest) {
    return {
      providerId: request.providerId,
      model: request.model,
      message: { role: "assistant" as const, content: "ok" }
    };
  }

  async *stream(request: GenerateRequest) {
    yield await this.generate(request);
  }

  async embeddings(request: EmbeddingRequest) {
    return { providerId: request.providerId, model: request.model, vectors: [[1, 2, 3]] };
  }

  async toolCall(request: ToolExecutionRequest) {
    return { toolId: request.toolId, ok: true };
  }
}

describe("ModelRouterService", () => {
  it("routes generation through the selected provider adapter", async () => {
    const adapter = new FakeAdapter();
    const providers = {
      list: async () => [],
      getConfig: async () => ({ id: "test", name: "Test", baseUrl: "http://example.test" }),
      upsert: async () => ({ id: "test", name: "Test", baseUrl: "http://example.test" }),
      remove: async () => ({ removed: true })
    } as unknown as ProvidersService;
    const router = new ModelRouterService(providers, adapter);
    router.registerProvider({ id: "test", name: "Test", baseUrl: "http://example.test" }, adapter);

    const result = await router.generate({
      providerId: "test",
      model: "demo",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result.message.content).toBe("ok");
    expect(adapter.config?.id).toBe("test");
  });
});
