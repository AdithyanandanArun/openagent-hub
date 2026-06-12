import { ToolsClient } from "./tools-client";

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Tools</h1>
        <p className="text-sm text-muted-foreground">Registered backend tools with validation, execution, and approval gates.</p>
      </header>
      <ToolsClient />
    </div>
  );
}
