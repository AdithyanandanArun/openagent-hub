import { Panel } from "../../components/panel";
import { SkillsClient } from "./skills-client";

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="text-sm text-muted-foreground">Dynamic instruction packs loaded from metadata, never hardcoded prompts.</p>
      </header>
      <Panel title="Skill Loader">
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Skills use `skill.yaml` with name, description, version, and instructions.
        </div>
      </Panel>
      <SkillsClient />
    </div>
  );
}
