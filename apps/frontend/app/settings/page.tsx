import { Panel } from "../../components/panel";
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Provider endpoints, encrypted API keys, and workspace defaults.</p>
      </header>
      <SettingsClient />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Security Gates">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Shell execution requires approval.</li>
            <li>Docker operations require approval.</li>
            <li>File deletion requires approval.</li>
            <li>Git push requires approval.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
