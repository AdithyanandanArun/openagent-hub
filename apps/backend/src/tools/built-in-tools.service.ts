import { execFile } from "child_process";
import { access, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { promisify } from "util";
import { Injectable, OnModuleInit } from "@nestjs/common";
import type { ToolExecutionRequest, ToolExecutionResult } from "@openagent/types";
import { Tool } from "./tool.interface";
import { ToolEngineService } from "./tool-engine.service";

const execFileAsync = promisify(execFile);

@Injectable()
export class BuiltInToolsService implements OnModuleInit {
  private readonly storageRoot = resolve(process.env.STORAGE_ROOT ?? "storage");

  constructor(private readonly toolEngine: ToolEngineService) {}

  onModuleInit() {
    this.toolEngine.register(this.readFileTool());
    this.toolEngine.register(this.writeFileTool());
    this.toolEngine.register(this.searchFilesTool());
    this.toolEngine.register(this.deleteFileTool());
    this.toolEngine.register(this.gitStatusTool());
    this.toolEngine.register(this.gitDiffTool());
    this.toolEngine.register(this.terminalTool());
  }

  private readFileTool(): Tool {
    return {
      definition: {
        id: "filesystem.read",
        name: "Read file",
        description: "Reads a text file from the configured storage root.",
        permissions: ["filesystem:read"]
      },
      validate: (request) => this.requireString(request, "path"),
      execute: async (request) => {
        const path = this.safePath(String(request.input.path));
        const content = await readFile(path, "utf8");
        return this.ok(request, { path, content });
      }
    };
  }

  private writeFileTool(): Tool {
    return {
      definition: {
        id: "filesystem.write",
        name: "Write file",
        description: "Writes a text file under the configured storage root.",
        permissions: ["filesystem:write"]
      },
      validate: (request) => {
        this.requireString(request, "path");
        this.requireString(request, "content");
      },
      execute: async (request) => {
        const path = this.safePath(String(request.input.path));
        await mkdir(resolve(path, ".."), { recursive: true });
        await writeFile(path, String(request.input.content), "utf8");
        return this.ok(request, { path });
      }
    };
  }

  private searchFilesTool(): Tool {
    return {
      definition: {
        id: "filesystem.search",
        name: "Search files",
        description: "Searches file names under the configured storage root.",
        permissions: ["filesystem:read"]
      },
      validate: (request) => this.requireString(request, "query"),
      execute: async (request) => {
        const query = String(request.input.query).toLowerCase();
        const results = await this.walk(this.storageRoot, query);
        return this.ok(request, { results });
      }
    };
  }

  private deleteFileTool(): Tool {
    return {
      definition: {
        id: "filesystem.delete",
        name: "Delete file",
        description: "Deletes a file under the configured storage root.",
        permissions: ["filesystem:delete"]
      },
      validate: (request) => this.requireString(request, "path"),
      execute: async (request) => {
        const path = this.safePath(String(request.input.path));
        await rm(path, { force: true });
        return this.ok(request, { path });
      }
    };
  }

  private gitStatusTool(): Tool {
    return {
      definition: {
        id: "git.status",
        name: "Git status",
        description: "Returns git status for the app workspace.",
        permissions: ["git:read"]
      },
      validate: () => undefined,
      execute: async (request) => this.execTool(request, "git", ["status", "--short"])
    };
  }

  private gitDiffTool(): Tool {
    return {
      definition: {
        id: "git.diff",
        name: "Git diff",
        description: "Returns git diff for the app workspace.",
        permissions: ["git:read"]
      },
      validate: () => undefined,
      execute: async (request) => this.execTool(request, "git", ["diff", "--"])
    };
  }

  private terminalTool(): Tool {
    return {
      definition: {
        id: "terminal.execute",
        name: "Terminal execute",
        description: "Runs an approved command inside the backend container.",
        permissions: ["shell:execute"]
      },
      validate: (request) => this.requireString(request, "command"),
      execute: async (request) => {
        const command = String(request.input.command);
        const args = Array.isArray(request.input.args) ? request.input.args.map(String) : [];
        return this.execTool(request, command, args);
      }
    };
  }

  private async execTool(request: ToolExecutionRequest, command: string, args: string[]): Promise<ToolExecutionResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd: process.cwd(),
        timeout: 15_000,
        maxBuffer: 1024 * 1024
      });
      return this.ok(request, { stdout, stderr });
    } catch (error) {
      return { toolId: request.toolId, ok: false, error: error instanceof Error ? error.message : "Execution failed" };
    }
  }

  private safePath(path: string): string {
    const resolved = resolve(this.storageRoot, path);
    const pathRelative = relative(this.storageRoot, resolved);
    if (pathRelative.startsWith("..") || pathRelative === "") {
      throw new Error("Path must stay inside storage root");
    }
    return resolved;
  }

  private requireString(request: ToolExecutionRequest, key: string): void {
    if (typeof request.input[key] !== "string" || !request.input[key]) {
      throw new Error(`${key} is required`);
    }
  }

  private ok(request: ToolExecutionRequest, output: unknown): ToolExecutionResult {
    return { toolId: request.toolId, ok: true, output };
  }

  private async walk(root: string, query: string): Promise<string[]> {
    try {
      await access(root);
    } catch {
      return [];
    }
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(root, entry.name);
        if (entry.isDirectory()) {
          return this.walk(fullPath, query);
        }
        return entry.name.toLowerCase().includes(query) ? [relative(this.storageRoot, fullPath)] : [];
      })
    );
    return nested.flat();
  }
}
