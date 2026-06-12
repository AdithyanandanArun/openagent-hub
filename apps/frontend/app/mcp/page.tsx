import { Cable } from "lucide-react";
import { Panel } from "../../components/panel";
import { McpClient } from "./mcp-client";

export default function McpPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">MCP</h1>
        <p className="text-sm text-muted-foreground">stdio, websocket, and HTTP servers with hot-reloadable configuration.</p>
      </header>
      <Panel title="Server Registry">
        <div className="grid gap-3 md:grid-cols-3">
          {["stdio", "websocket", "http"].map((transport) => (
            <div key={transport} className="rounded-md border border-border p-4">
              <Cable size={18} aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">{transport}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Install, configure, enable, disable, and remove.</p>
            </div>
          ))}
        </div>
      </Panel>
      <McpClient />
    </div>
  );
}
