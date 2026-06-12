import { Download, Upload } from "lucide-react";
import { Panel } from "../../components/panel";
import { AgentsClient } from "./agents-client";

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Agents</h1>
        <p className="text-sm text-muted-foreground">Stateless agent configurations with tools, MCPs, skills, and memory permissions.</p>
      </header>
      <AgentsClient />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Portability">
          <div className="flex gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium">
              <Upload size={16} aria-hidden />
              Import
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              <Download size={16} aria-hidden />
              Export
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
