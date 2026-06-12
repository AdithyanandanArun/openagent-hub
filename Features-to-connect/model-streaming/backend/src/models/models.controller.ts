// src/models/models.controller.ts

import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModelRouterService } from './model-router.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('models')
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(private readonly modelRouter: ModelRouterService) {}

  /** GET /models — all models from all configured providers */
  @Get()
  async listAllModels() {
    const models = await this.modelRouter.listAllModels();
    return {
      count: models.length,
      models,
    };
  }

  /** GET /models/providers — list active providers */
  @Get('providers')
  listProviders() {
    const adapters = this.modelRouter.listAdapters();
    return {
      count: adapters.length,
      providers: adapters.map((a) => ({
        id:          a.providerId,
        displayName: a.displayName,
      })),
    };
  }

  /** GET /models/health — connectivity check for all providers */
  @Get('health')
  async healthCheck() {
    const results = await this.modelRouter.healthCheckAll();
    const allOk   = Object.values(results).every((r) => r.ok);
    return { allOk, providers: results };
  }

  /** GET /models/:providerId — models for a specific provider */
  @Get(':providerId')
  async listProviderModels(@Param('providerId') providerId: string) {
    const models = await this.modelRouter.listModelsForProvider(providerId);
    return { provider: providerId, count: models.length, models };
  }
}
