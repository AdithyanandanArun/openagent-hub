import { useCallback, useEffect, useState } from 'react';
import {
  createMCPServer, deleteMCPServer, listMCPServers, MCPServer, MCPServerInput, syncMCPServer, updateMCPServer,
} from '../services/mcp';

export function useMCP() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setServers(await listMCPServers()); } catch { /* unavailable until deployment enables remote MCP */ }
  }, []);

  const add = useCallback(async (payload: MCPServerInput) => {
    const server = await createMCPServer(payload);
    setServers((current) => [...current, server]);
    return server;
  }, []);

  const edit = useCallback(async (id: string, payload: Parameters<typeof updateMCPServer>[1]) => {
    const server = await updateMCPServer(id, payload);
    setServers((current) => current.map((item) => item.id === id ? server : item));
    return server;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteMCPServer(id);
    setServers((current) => current.filter((item) => item.id !== id));
  }, []);

  const sync = useCallback(async (id: string) => {
    setSyncingId(id);
    try {
      const server = await syncMCPServer(id);
      setServers((current) => current.map((item) => item.id === id ? server : item));
      return server;
    } finally {
      setSyncingId(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { servers, syncingId, add, edit, remove, sync };
}
