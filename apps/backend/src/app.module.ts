import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AgentsModule } from "./agents/agents.module";
import { ChatModule } from "./chat/chat.module";
import { DatabaseModule } from "./common/database.module";
import { HealthModule } from "./health/health.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { McpModule } from "./mcp/mcp.module";
import { MemoryModule } from "./memory/memory.module";
import { ModelsModule } from "./models/models.module";
import { ObservabilityModule } from "./observability/observability.module";
import { SettingsModule } from "./settings/settings.module";
import { SkillsModule } from "./skills/skills.module";
import { ToolsModule } from "./tools/tools.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    ObservabilityModule,
    ModelsModule,
    ChatModule,
    ToolsModule,
    McpModule,
    MemoryModule,
    AgentsModule,
    KnowledgeModule,
    SettingsModule,
    SkillsModule
  ]
})
export class AppModule {}
