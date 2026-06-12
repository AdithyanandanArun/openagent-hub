import { Injectable } from "@nestjs/common";
import { MemoryLayer as PrismaMemoryLayer, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

export type MemoryLayer = "session" | "user" | "semantic";

export interface MemoryRecord {
  id?: string;
  userId: string;
  layer: MemoryLayer;
  content: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: MemoryRecord) {
    await this.ensureUser(record.userId);
    const data = {
      userId: record.userId,
      layer: record.layer as PrismaMemoryLayer,
      content: record.content,
      metadata: record.metadata as Prisma.InputJsonValue | undefined
    };

    return record.id
      ? this.prisma.memory.update({ where: { id: record.id }, data })
      : this.prisma.memory.create({ data });
  }

  async search(userId: string, query?: string) {
    await this.ensureUser(userId);
    return this.prisma.memory.findMany({
      where: {
        userId,
        ...(query ? { content: { contains: query, mode: "insensitive" } } : {})
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    await this.prisma.memory.delete({ where: { id } });
    return { deleted: true };
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
