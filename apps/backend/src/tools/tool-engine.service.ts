import { Injectable } from "@nestjs/common";
import type { ToolDefinition, ToolExecutionRequest, ToolExecutionResult } from "@openagent/types";
import { Tool } from "./tool.interface";

const DANGEROUS_PERMISSIONS = new Set(["shell:execute", "docker:execute", "filesystem:delete", "git:push"]);

@Injectable()
export class ToolEngineService {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.definition.id, tool);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition);
  }

  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const tool = this.tools.get(request.toolId);
    if (!tool) {
      return { toolId: request.toolId, ok: false, error: "Unknown tool" };
    }

    const requiresApproval = tool.definition.permissions.some((permission) => DANGEROUS_PERMISSIONS.has(permission));
    if (requiresApproval && !request.approved) {
      return { toolId: request.toolId, ok: false, error: "Approval required" };
    }

    await tool.validate(request);
    return tool.execute(request);
  }
}
