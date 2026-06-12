import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import type { EmbeddingRequest, GenerateRequest } from "@openagent/types";
import { ModelRouterService } from "./model-router.service";
import type { UpsertProviderInput } from "./providers.service";

@Controller("models")
export class ModelsController {
  constructor(private readonly modelRouter: ModelRouterService) {}

  @Get("providers")
  providers(@Query("userId") userId?: string) {
    return this.modelRouter.listProviders(userId);
  }

  @Post("providers")
  createProvider(@Body() body: UpsertProviderInput) {
    return this.modelRouter.upsertProvider(body);
  }

  @Put("providers/:id")
  updateProvider(@Param("id") id: string, @Body() body: Omit<UpsertProviderInput, "id">) {
    return this.modelRouter.upsertProvider({ id, ...body });
  }

  @Delete("providers/:id")
  removeProvider(@Param("id") id: string) {
    return this.modelRouter.removeProvider(id);
  }

  @Post("generate")
  generate(@Body() body: GenerateRequest) {
    return this.modelRouter.generate(body);
  }

  @Post("embeddings")
  embeddings(@Body() body: EmbeddingRequest) {
    return this.modelRouter.embeddings(body);
  }
}
