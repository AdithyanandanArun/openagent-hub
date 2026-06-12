import { Panel } from "../../components/panel";
import { AdminClient } from "./admin-client";

const metrics = ["token usage", "latency", "provider errors", "tool calls", "costs", "memory retrieval"];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Structured metrics and operational visibility.</p>
      </header>
      <Panel title="Metrics">
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric} className="rounded-md border border-border p-4">
              <div className="text-xs uppercase text-muted-foreground">{metric}</div>
              <div className="mt-2 text-xl font-semibold">0</div>
            </div>
          ))}
        </div>
      </Panel>
      <AdminClient />
    </div>
  );
}
