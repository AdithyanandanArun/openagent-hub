import api from './api';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPServer {
  id: string;
  name: string;
  transport: 'streamable_http';
  command: null;
  args: null;
  url: string;
  enabled: boolean;
  auto_approve: false;
  auth_type: 'none' | 'bearer' | 'header' | 'oauth';
  read_only_tools: string[] | null;
  requires_confirmation: boolean;
  status: 'unknown' | 'healthy' | 'error';
  tools_cache: MCPTool[] | null;
  last_checked_at: string | null;
}

export interface MCPServerInput {
  name: string;
  url: string;
  auth_type: 'none' | 'bearer' | 'header' | 'oauth';
  auth_value?: string;
  auth_header_name?: string;
  read_only_tools?: string[];
}

export async function listMCPServers(): Promise<MCPServer[]> {
  const { data } = await api.get('/mcp/servers');
  return data;
}

export async function createMCPServer(payload: MCPServerInput): Promise<MCPServer> {
  const { data } = await api.post('/mcp/servers', payload);
  return data;
}

export async function updateMCPServer(id: string, payload: Partial<MCPServerInput & { enabled: boolean }>): Promise<MCPServer> {
  const { data } = await api.patch(`/mcp/servers/${id}`, payload);
  return data;
}

export async function deleteMCPServer(id: string): Promise<void> {
  await api.delete(`/mcp/servers/${id}`);
}

export async function syncMCPServer(id: string): Promise<MCPServer> {
  const { data } = await api.post(`/mcp/servers/${id}/sync`);
  return data;
}
