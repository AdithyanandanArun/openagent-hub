"use client";

import { KeyRound, Plus, Server, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface ProviderRecord {
  id: string;
  name: string;
  baseUrl: string;
}

export function SettingsClient() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => apiGet<ProviderRecord[]>("/models/providers")
  });
  const createProvider = useMutation({
    mutationFn: () => apiSend<ProviderRecord>("/models/providers", "POST", { name, baseUrl, apiKey }),
    onSuccess: async () => {
      setName("");
      setBaseUrl("");
      setApiKey("");
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
    }
  });
  const removeProvider = useMutation({
    mutationFn: (id: string) => apiSend<{ removed: boolean }>(`/models/providers/${id}`, "DELETE"),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["providers"] })
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createProvider.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-md border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Provider Endpoint</h2>
        </header>
        <form className="space-y-3 p-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">Name</span>
            <input className="mt-1 h-10 w-full rounded-md border border-border px-3" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Server size={14} aria-hidden /> Base URL</span>
            <input className="mt-1 h-10 w-full rounded-md border border-border px-3" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://provider.example/v1" required />
          </label>
          <label className="block text-sm">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><KeyRound size={14} aria-hidden /> API key</span>
            <input className="mt-1 h-10 w-full rounded-md border border-border px-3" value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder="Stored encrypted by backend" />
          </label>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" disabled={createProvider.isPending}>
            <Plus size={16} aria-hidden />
            Add Provider
          </button>
          {createProvider.error ? <p className="text-sm text-red-600">{createProvider.error.message}</p> : null}
        </form>
      </section>
      <section className="rounded-md border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Configured Providers</h2>
        </header>
        <div className="divide-y divide-border">
          {(providers.data ?? []).map((provider) => (
            <div key={provider.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{provider.name}</div>
                <div className="truncate text-xs text-muted-foreground">{provider.baseUrl}</div>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border disabled:opacity-40" disabled={provider.id === "default" || removeProvider.isPending} onClick={() => removeProvider.mutate(provider.id)} aria-label={`Remove ${provider.name}`}>
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          ))}
          {providers.isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading providers...</div> : null}
        </div>
      </section>
    </div>
  );
}
