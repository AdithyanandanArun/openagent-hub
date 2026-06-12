import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import type { AgentConfig } from "@openagent/types";
import { AgentsService } from "./agents.service";

@Controller("agents")
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    return this.agents.list(userId);
  }

  @Put(":id")
  upsert(@Param("id") id: string, @Body() body: Omit<AgentConfig, "id">) {
    return this.agents.upsert({ id, ...body });
  }

  @Get(":id/export")
  export(@Param("id") id: string) {
    return this.agents.export(id);
  }
}
