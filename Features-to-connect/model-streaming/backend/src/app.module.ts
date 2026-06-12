// src/app.module.ts — add ModelsModule and ChatModule

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ModelsModule } from './models/models.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ModelsModule,   // ← new
    ChatModule,     // ← new
  ],
})
export class AppModule {}
