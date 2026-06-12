import { Body, Controller, Delete, Get, Param, Put } from "@nestjs/common";
import { McpServerConfig, McpService } from "./mcp.service";

@Controller("mcp")
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Get()
  list() {
    return this.mcp.list();
  }

  @Put(":id")
  upsert(@Param("id") id: string, @Body() body: Omit<McpServerConfig, "id">) {
    return this.mcp.upsert({ id, ...body });
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.mcp.remove(id);
  }
}
