import { Body, Controller, Get, Put } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const records = await this.prisma.setting.findMany({ where: { userId: null } });
    return records.reduce<Record<string, unknown>>(
      (settings, record) => ({ ...settings, [record.key]: record.value }),
      {
        providerContract: "openai-compatible",
        streaming: "sse"
      }
    );
  }

  @Put()
  async update(@Body() body: Record<string, unknown>) {
    await Promise.all(
      Object.entries(body).map(async ([key, value]) => {
        const existing = await this.prisma.setting.findFirst({ where: { userId: null, key } });
        if (existing) {
          await this.prisma.setting.update({
            where: { id: existing.id },
            data: { value: value as Prisma.InputJsonValue }
          });
          return;
        }

        await this.prisma.setting.create({
          data: { key, value: value as Prisma.InputJsonValue }
        });
      })
    );
    return this.get();
  }
}
