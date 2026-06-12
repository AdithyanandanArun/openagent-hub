"use client";

import { Bot, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface AgentRecord {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  mcps: string[];
  skills: string[];
  memoryPermissions: string[];
}

export function AgentsClient() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const agents = useQuery({ queryKey: ["agents"], queryFn: () => apiGet<AgentRecord[]>("/agents") });
  const saveAgent = useMutation({
    mutationFn: () =>
      apiSend<AgentRecord>(`/agents/${slug(name)}`, "PUT", {
        name,
        description,
        systemPrompt,
        tools: [],
        mcps: [],
        skills: [],
        memoryPermissions: ["user"]
      }),
    onSuccess: async () => {
      setName("");
      setDescription("");
      setSystemPrompt("");
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) {
      saveAgent.mutate();
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <form className="rounded-md border border-border bg-white p-4" onSubmit={submit}>
        <h2 className="text-sm font-semibold">Create Agent</h2>
        <input className="mt-4 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <input className="mt-3 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <textarea className="mt-3 min-h-28 w-full resize-none rounded-md border border-border px-3 py-2 text-sm" placeholder="System prompt" value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} />
        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" disabled={saveAgent.isPending}>
          <Plus size={16} aria-hidden />
          Save Agent
        </button>
      </form>
      <section className="grid gap-3 md:grid-cols-2">
        {(agents.data ?? []).map((agent) => (
          <div key={agent.id} className="rounded-md border border-border bg-white p-4">
            <Bot size={18} aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{agent.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
            <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{agent.systemPrompt}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";
}
