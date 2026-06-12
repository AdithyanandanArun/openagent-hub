import { mkdir, readFile, readdir } from "fs/promises";
import { join, resolve } from "path";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

export interface SkillRecord {
  name: string;
  description: string;
  version: string;
  instructions: string;
  path: string;
  enabled?: boolean;
}

@Injectable()
export class SkillsService {
  private readonly skillsRoot = resolve(process.env.SKILLS_ROOT ?? "skills");

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    await this.syncFromDisk();
    return this.prisma.skill.findMany({ orderBy: { name: "asc" } });
  }

  async setEnabled(name: string, enabled: boolean) {
    return this.prisma.skill.update({ where: { name }, data: { enabled } });
  }

  async syncFromDisk() {
    await mkdir(this.skillsRoot, { recursive: true });
    const entries = await readdir(this.skillsRoot, { withFileTypes: true });
    const skillDirs = entries.filter((entry) => entry.isDirectory());

    await Promise.all(
      skillDirs.map(async (entry) => {
        const skillPath = join(this.skillsRoot, entry.name, "skill.yaml");
        const content = await readFile(skillPath, "utf8").catch(() => "");
        if (!content) {
          return;
        }
        const parsed = this.parseSkill(content, join(this.skillsRoot, entry.name));
        await this.prisma.skill.upsert({
          where: { name: parsed.name },
          update: parsed,
          create: parsed
        });
      })
    );
  }

  private parseSkill(content: string, path: string): SkillRecord {
    const fields = new Map<string, string>();
    let currentKey: string | null = null;
    const currentBlock: string[] = [];

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (match) {
        if (currentKey && currentBlock.length) {
          fields.set(currentKey, currentBlock.join("\n").trim());
          currentBlock.length = 0;
        }
        currentKey = match[1];
        const value = match[2].trim();
        if (value && value !== "|") {
          fields.set(currentKey, value.replace(/^["']|["']$/g, ""));
          currentKey = null;
        }
        continue;
      }

      if (currentKey) {
        currentBlock.push(line.replace(/^  /, ""));
      }
    }

    if (currentKey && currentBlock.length) {
      fields.set(currentKey, currentBlock.join("\n").trim());
    }

    return {
      name: this.requireField(fields, "name"),
      description: this.requireField(fields, "description"),
      version: fields.get("version") ?? "0.1.0",
      instructions: this.requireField(fields, "instructions"),
      path,
      enabled: true
    };
  }

  private requireField(fields: Map<string, string>, key: string): string {
    const value = fields.get(key);
    if (!value) {
      throw new Error(`Skill is missing ${key}`);
    }
    return value;
  }
}
