// src/chat/chat.module.ts

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ModelsModule } from '../models/models.module';

@Module({
  imports:     [ModelsModule],
  controllers: [ChatController],
})
export class ChatModule {}
