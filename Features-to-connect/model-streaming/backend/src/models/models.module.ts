// src/models/models.module.ts

import { Module } from '@nestjs/common';
import { ModelRouterService } from './model-router.service';
import { ModelsController } from './models.controller';

@Module({
  controllers: [ModelsController],
  providers:   [ModelRouterService],
  exports:     [ModelRouterService],
})
export class ModelsModule {}
