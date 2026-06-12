import type {
  EmbeddingRequest,
  EmbeddingResponse,
  GenerateRequest,
  GenerateResponse,
  ProviderConfig,
  ToolExecutionRequest,
  ToolExecutionResult
} from "@openagent/types";

export interface ProviderAdapter {
  readonly id: string;
  configure(config: ProviderConfig): void;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncIterable<GenerateResponse>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  toolCall(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
