import { describe, expect, it } from "vitest";
import { ToolEngineService } from "../src/tools/tool-engine.service";
import type { Tool } from "../src/tools/tool.interface";

const dangerousTool: Tool = {
  definition: {
    id: "terminal.execute",
    name: "Terminal Execute",
    description: "Runs a shell command",
    permissions: ["shell:execute"]
  },
  validate: () => undefined,
  execute: async (request) => ({ toolId: request.toolId, ok: true, output: "done" })
};

describe("ToolEngineService", () => {
  it("blocks dangerous tools until server-side approval is present", async () => {
    const engine = new ToolEngineService();
    engine.register(dangerousTool);

    await expect(engine.execute({ toolId: "terminal.execute", input: {} })).resolves.toMatchObject({
      ok: false,
      error: "Approval required"
    });
  });

  it("executes approved dangerous tools", async () => {
    const engine = new ToolEngineService();
    engine.register(dangerousTool);

    await expect(engine.execute({ toolId: "terminal.execute", input: {}, approved: true })).resolves.toMatchObject({
      ok: true,
      output: "done"
    });
  });
});
