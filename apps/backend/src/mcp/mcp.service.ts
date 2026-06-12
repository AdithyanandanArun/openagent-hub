import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

export type McpTransport = "stdio" | "websocket" | "http";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  endpoint: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

@Injectable()
export class McpService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<McpServerConfig[]> {
    const servers = await this.prisma.mcpServer.findMany({ orderBy: { updatedAt: "desc" } });
    return servers.map((server) => ({
      id: server.id,
      name: server.name,
      transport: server.transport as McpTransport,
      endpoint: server.endpoint,
      enabled: server.enabled,
      config: server.config as Record<string, unknown> | undefined
    }));
  }

  async upsert(config: McpServerConfig): Promise<McpServerConfig> {
    const saved = await this.prisma.mcpServer.upsert({
      where: { id: config.id },
      update: {
        name: config.name,
        transport: config.transport,
        endpoint: config.endpoint,
        enabled: config.enabled,
        config: config.config as Prisma.InputJsonValue | undefined
      },
      create: {
        id: config.id,
        name: config.name,
        transport: config.transport,
        endpoint: config.endpoint,
        enabled: config.enabled,
        config: config.config as Prisma.InputJsonValue | undefined
      }
    });
    return { ...config, id: saved.id };
  }

  async remove(id: string): Promise<{ removed: boolean }> {
    await this.prisma.mcpServer.delete({ where: { id } });
    return { removed: true };
  }
}
