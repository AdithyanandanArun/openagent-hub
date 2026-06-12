export const OPENAGENT_VERSION = "0.1.0";

export const API_ROUTES = {
  chat: "/api/chat",
  models: "/api/models",
  tools: "/api/tools",
  memory: "/api/memory",
  mcp: "/api/mcp",
  agents: "/api/agents",
  documents: "/api/documents"
} as const;

export function assertRequired(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
