"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";

interface MetricEvent {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export function AdminClient() {
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => apiGet<MetricEvent[]>("/admin/metrics") });
  const grouped = new Map<string, number>();
  for (const metric of metrics.data ?? []) {
    grouped.set(metric.name, (grouped.get(metric.name) ?? 0) + metric.value);
  }

  return (
    <section className="rounded-md border border-border bg-white">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Live Metrics</h2>
      </header>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {Array.from(grouped.entries()).map(([name, value]) => (
          <div key={name} className="rounded-md border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">{name}</div>
            <div className="mt-2 text-xl font-semibold">{value}</div>
          </div>
        ))}
        {!metrics.isLoading && grouped.size === 0 ? <div className="text-sm text-muted-foreground">No metrics recorded yet.</div> : null}
      </div>
    </section>
  );
}
