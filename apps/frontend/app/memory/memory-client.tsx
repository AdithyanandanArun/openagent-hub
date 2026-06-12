"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface MemoryRecord {
  id: string;
  layer: "session" | "user" | "semantic";
  content: string;
}

export function MemoryClient() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [layer, setLayer] = useState<MemoryRecord["layer"]>("user");
  const memories = useQuery({
    queryKey: ["memory"],
    queryFn: () => apiGet<MemoryRecord[]>("/memory?userId=default")
  });
  const saveMemory = useMutation({
    mutationFn: () => apiSend<MemoryRecord>("/memory", "POST", { userId: "default", layer, content }),
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
    }
  });
  const deleteMemory = useMutation({
    mutationFn: (id: string) => apiSend<{ deleted: boolean }>(`/memory/${id}`, "DELETE"),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["memory"] })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (content.trim()) {
      saveMemory.mutate();
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <form className="rounded-md border border-border bg-white p-4" onSubmit={submit}>
        <h2 className="text-sm font-semibold">Save Memory</h2>
        <label className="mt-4 block text-sm">
          <span className="text-xs text-muted-foreground">Layer</span>
          <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3" value={layer} onChange={(event) => setLayer(event.target.value as MemoryRecord["layer"])}>
            <option value="session">Session</option>
            <option value="user">User</option>
            <option value="semantic">Semantic</option>
          </select>
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-xs text-muted-foreground">Content</span>
          <textarea className="mt-1 min-h-28 w-full resize-none rounded-md border border-border px-3 py-2" value={content} onChange={(event) => setContent(event.target.value)} />
        </label>
        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" disabled={saveMemory.isPending}>
          <Plus size={16} aria-hidden />
          Save
        </button>
      </form>
      <section className="rounded-md border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Saved Memories</h2>
        </header>
        <div className="divide-y divide-border">
          {(memories.data ?? []).map((memory) => (
            <div key={memory.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <span className="rounded border border-border px-2 py-1 text-xs">{memory.layer}</span>
                <p className="mt-2 text-sm">{memory.content}</p>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border" onClick={() => deleteMemory.mutate(memory.id)} aria-label="Delete memory">
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          ))}
          {memories.isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading memories...</div> : null}
        </div>
      </section>
    </div>
  );
}
