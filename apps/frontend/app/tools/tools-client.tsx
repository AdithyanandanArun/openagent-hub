"use client";

import { Play } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface ToolRecord {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface ToolResult {
  toolId: string;
  ok: boolean;
  output?: unknown;
  error?: string;
}

export function ToolsClient() {
  const [selectedToolId, setSelectedToolId] = useState("filesystem.search");
  const [input, setInput] = useState("{\"query\":\"tool\"}");
  const [approved, setApproved] = useState(false);
  const tools = useQuery({ queryKey: ["tools"], queryFn: () => apiGet<ToolRecord[]>("/tools") });
  const executeTool = useMutation({
    mutationFn: () => apiSend<ToolResult>("/tools/execute", "POST", { toolId: selectedToolId, input: JSON.parse(input), approved })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    executeTool.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="grid gap-3 md:grid-cols-2">
        {(tools.data ?? []).map((tool) => (
          <button
            key={tool.id}
            className={`rounded-md border border-border bg-white p-4 text-left ${selectedToolId === tool.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedToolId(tool.id)}
          >
            <h2 className="text-sm font-semibold">{tool.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">{tool.permissions.join(", ")}</p>
          </button>
        ))}
      </section>
      <form className="rounded-md border border-border bg-white p-4" onSubmit={submit}>
        <h2 className="text-sm font-semibold">Execute Tool</h2>
        <label className="mt-4 block text-sm">
          <span className="text-xs text-muted-foreground">Tool ID</span>
          <input className="mt-1 h-10 w-full rounded-md border border-border px-3" value={selectedToolId} onChange={(event) => setSelectedToolId(event.target.value)} />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-xs text-muted-foreground">Input JSON</span>
          <textarea className="mt-1 min-h-32 w-full resize-none rounded-md border border-border px-3 py-2 font-mono text-xs" value={input} onChange={(event) => setInput(event.target.value)} />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
          Approved
        </label>
        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          <Play size={16} aria-hidden />
          Run
        </button>
        {executeTool.data ? (
          <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(executeTool.data, null, 2)}</pre>
        ) : null}
        {executeTool.error ? <p className="mt-3 text-sm text-red-600">{executeTool.error.message}</p> : null}
      </form>
    </div>
  );
}
