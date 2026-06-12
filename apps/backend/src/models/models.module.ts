import { Module } from "@nestjs/common";
import { CryptoService } from "../common/crypto.service";
import { ModelRouterService } from "./model-router.service";
import { ModelsController } from "./models.controller";
import { OpenAiCompatibleAdapter } from "./openai-compatible.adapter";
import { ProvidersService } from "./providers.service";

@Module({
  controllers: [ModelsController],
  providers: [ModelRouterService, OpenAiCompatibleAdapter, ProvidersService, CryptoService],
  exports: [ModelRouterService, ProvidersService]
})
export class ModelsModule {}
