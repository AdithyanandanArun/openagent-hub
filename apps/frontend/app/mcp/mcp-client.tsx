"use client";

import { Cable, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface McpServer {
  id: string;
  name: string;
  transport: "stdio" | "websocket" | "http";
  endpoint: string;
  enabled: boolean;
}

export function McpClient() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpServer["transport"]>("stdio");
  const [endpoint, setEndpoint] = useState("");
  const servers = useQuery({ queryKey: ["mcp"], queryFn: () => apiGet<McpServer[]>("/mcp") });
  const saveServer = useMutation({
    mutationFn: () => apiSend<McpServer>(`/mcp/${slug(name)}`, "PUT", { name, transport, endpoint, enabled: true }),
    onSuccess: async () => {
      setName("");
      setEndpoint("");
      await queryClient.invalidateQueries({ queryKey: ["mcp"] });
    }
  });
  const removeServer = useMutation({
    mutationFn: (id: string) => apiSend<{ removed: boolean }>(`/mcp/${id}`, "DELETE"),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["mcp"] })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveServer.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <form className="rounded-md border border-border bg-white p-4" onSubmit={submit}>
        <h2 className="text-sm font-semibold">Register Server</h2>
        <input className="mt-4 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <select className="mt-3 h-10 w-full rounded-md border border-border bg-white px-3 text-sm" value={transport} onChange={(event) => setTransport(event.target.value as McpServer["transport"])}>
          <option value="stdio">stdio</option>
          <option value="websocket">websocket</option>
          <option value="http">http</option>
        </select>
        <input className="mt-3 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="Endpoint or command" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required />
        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          <Plus size={16} aria-hidden />
          Save Server
        </button>
      </form>
      <section className="grid gap-3 md:grid-cols-2">
        {(servers.data ?? []).map((server) => (
          <div key={server.id} className="rounded-md border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <Cable size={18} aria-hidden />
              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border" onClick={() => removeServer.mutate(server.id)} aria-label="Remove MCP server">
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            <h2 className="mt-3 text-sm font-semibold">{server.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{server.transport}</p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{server.endpoint}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mcp";
}
