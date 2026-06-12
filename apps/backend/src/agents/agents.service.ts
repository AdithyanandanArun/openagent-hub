import { Injectable } from "@nestjs/common";
import type { AgentConfig } from "@openagent/types";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId = "default"): Promise<AgentConfig[]> {
    await this.ensureUser(userId);
    const agents = await this.prisma.agent.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools as string[],
      mcps: agent.mcps as string[],
      skills: agent.skills as string[],
      memoryPermissions: agent.memoryPermissions as string[]
    }));
  }

  async upsert(agent: AgentConfig & { userId?: string }): Promise<AgentConfig> {
    const userId = agent.userId ?? "default";
    await this.ensureUser(userId);
    const saved = await this.prisma.agent.upsert({
      where: { id: agent.id },
      update: {
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools as Prisma.InputJsonValue,
        mcps: agent.mcps as Prisma.InputJsonValue,
        skills: agent.skills as Prisma.InputJsonValue,
        memoryPermissions: agent.memoryPermissions as Prisma.InputJsonValue
      },
      create: {
        id: agent.id,
        userId,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools as Prisma.InputJsonValue,
        mcps: agent.mcps as Prisma.InputJsonValue,
        skills: agent.skills as Prisma.InputJsonValue,
        memoryPermissions: agent.memoryPermissions as Prisma.InputJsonValue
      }
    });
    return { ...agent, id: saved.id };
  }

  async export(id: string): Promise<AgentConfig | null> {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools as string[],
      mcps: agent.mcps as string[],
      skills: agent.skills as string[],
      memoryPermissions: agent.memoryPermissions as string[]
    };
  }

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@local.openagent`,
        passwordHash: "local-development-user"
      }
    });
  }
}
