import type { ToolDefinition, ToolExecutionRequest, ToolExecutionResult } from "@openagent/types";

export interface Tool {
  definition: ToolDefinition;
  validate(request: ToolExecutionRequest): Promise<void> | void;
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
