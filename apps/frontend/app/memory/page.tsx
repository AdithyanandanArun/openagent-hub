import { Panel } from "../../components/panel";
import { MemoryClient } from "./memory-client";

const layers = [
  ["Session", "Active conversation context"],
  ["User", "Persistent preferences, projects, and workflows"],
  ["Semantic", "Vector retrieval for summaries and contextual knowledge"]
];

export default function MemoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Memory</h1>
        <p className="text-sm text-muted-foreground">Session, user, and semantic memory with automatic retrieval.</p>
      </header>
      <Panel title="Memory Layers">
        <div className="grid gap-3 md:grid-cols-3">
          {layers.map(([name, description]) => (
            <div key={name} className="rounded-md border border-border p-4">
              <h2 className="text-sm font-semibold">{name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Panel>
      <MemoryClient />
    </div>
  );
}
