import { Injectable, NotFoundException } from "@nestjs/common";
import type { ProviderConfig } from "@openagent/types";
import { PrismaService } from "../common/prisma.service";
import { CryptoService } from "../common/crypto.service";

export interface UpsertProviderInput {
  id?: string;
  userId?: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  enabled?: boolean;
}

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService
  ) {}

  async list(userId?: string): Promise<ProviderConfig[]> {
    const providers = await this.prisma.provider.findMany({
      where: {
        enabled: true,
        ...(userId ? { userId } : {})
      },
      orderBy: { createdAt: "asc" }
    });

    const defaultProvider = this.defaultProvider();
    return [
      {
        id: defaultProvider.id,
        name: defaultProvider.name,
        baseUrl: defaultProvider.baseUrl
      },
      ...providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl
      }))
    ];
  }

  async getConfig(id: string): Promise<ProviderConfig> {
    if (id === "default") {
      return this.defaultProvider();
    }

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider || !provider.enabled) {
      throw new NotFoundException(`Unknown provider: ${id}`);
    }

    return {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.encryptedApiKey ? this.crypto.decrypt(provider.encryptedApiKey) : undefined
    };
  }

  async upsert(input: UpsertProviderInput): Promise<ProviderConfig> {
    const data = {
      userId: input.userId,
      name: input.name,
      baseUrl: input.baseUrl.replace(/\/$/, ""),
      enabled: input.enabled ?? true,
      ...(input.apiKey ? { encryptedApiKey: this.crypto.encrypt(input.apiKey) } : {})
    };

    const provider = input.id
      ? await this.prisma.provider.update({ where: { id: input.id }, data })
      : await this.prisma.provider.create({ data });

    return {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl
    };
  }

  async remove(id: string): Promise<{ removed: boolean }> {
    if (id === "default") {
      return { removed: false };
    }

    await this.prisma.provider.update({ where: { id }, data: { enabled: false } });
    return { removed: true };
  }

  private defaultProvider(): ProviderConfig {
    return {
      id: "default",
      name: "Default OpenAI-Compatible Provider",
      baseUrl: process.env.DEFAULT_PROVIDER_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.DEFAULT_PROVIDER_API_KEY
    };
  }
}
