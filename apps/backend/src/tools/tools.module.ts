import { Module } from "@nestjs/common";
import { BuiltInToolsService } from "./built-in-tools.service";
import { ToolEngineService } from "./tool-engine.service";
import { ToolsController } from "./tools.controller";

@Module({
  controllers: [ToolsController],
  providers: [ToolEngineService, BuiltInToolsService],
  exports: [ToolEngineService]
})
export class ToolsModule {}
