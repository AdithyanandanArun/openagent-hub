export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  id?: string;
  role: Role;
  content: string;
  toolCallId?: string;
  createdAt?: string;
}

export interface GenerateRequest {
  providerId: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface GenerateResponse {
  message: ChatMessage;
  usage?: TokenUsage;
  providerId: string;
  model: string;
}

export interface EmbeddingRequest {
  providerId: string;
  model: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  vectors: number[][];
  providerId: string;
  model: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inputSchema?: Record<string, unknown>;
}

export interface ToolExecutionRequest {
  toolId: string;
  input: Record<string, unknown>;
  approved?: boolean;
}

export interface ToolExecutionResult {
  toolId: string;
  ok: boolean;
  output?: unknown;
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  mcps: string[];
  skills: string[];
  memoryPermissions: string[];
}
