import { Body, Controller, Get, Post } from "@nestjs/common";
import type { ToolExecutionRequest } from "@openagent/types";
import { ToolEngineService } from "./tool-engine.service";

@Controller("tools")
export class ToolsController {
  constructor(private readonly toolEngine: ToolEngineService) {}

  @Get()
  list() {
    return this.toolEngine.list();
  }

  @Post("execute")
  execute(@Body() body: ToolExecutionRequest) {
    return this.toolEngine.execute(body);
  }
}
