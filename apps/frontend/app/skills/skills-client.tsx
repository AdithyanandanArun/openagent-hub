"use client";

import { RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "../../lib/api";

interface SkillRecord {
  name: string;
  description: string;
  version: string;
  instructions: string;
  enabled: boolean;
}

export function SkillsClient() {
  const queryClient = useQueryClient();
  const skills = useQuery({ queryKey: ["skills"], queryFn: () => apiGet<SkillRecord[]>("/skills") });
  const toggle = useMutation({
    mutationFn: (skill: SkillRecord) => apiSend<SkillRecord>(`/skills/${skill.name}`, "PUT", { enabled: !skill.enabled }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["skills"] })
  });

  return (
    <section className="rounded-md border border-border bg-white">
      <header className="flex min-h-12 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold">Loaded Skills</h2>
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border" onClick={() => skills.refetch()} aria-label="Refresh skills">
          <RefreshCw size={15} aria-hidden />
        </button>
      </header>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {(skills.data ?? []).map((skill) => (
          <div key={skill.name} className="rounded-md border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{skill.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">v{skill.version}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={skill.enabled} onChange={() => toggle.mutate(skill)} />
                Enabled
              </label>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{skill.description}</p>
          </div>
        ))}
        {skills.isLoading ? <div className="text-sm text-muted-foreground">Loading skills...</div> : null}
      </div>
    </section>
  );
}
