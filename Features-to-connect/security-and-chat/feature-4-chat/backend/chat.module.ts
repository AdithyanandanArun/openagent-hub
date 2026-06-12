/**
 * FEATURE 4: Chat Module
 * ============================================================
 * Drop this file at: src/chat/chat.module.ts
 *
 * AGENT INSTRUCTIONS:
 *   Add ChatModule to AppModule imports array:
 *
 *   // src/app.module.ts
 *   import { ChatModule } from './chat/chat.module';
 *   @Module({ imports: [..., ChatModule] })
 *
 *   PrismaModule must be global OR imported here directly.
 *   If your PrismaModule uses @Global(), you don't need to import it.
 *   If not, add: imports: [PrismaModule]
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

// AGENT: Uncomment when Feature 2 ModelRouterService is available
// import { ModelsModule } from '../models/models.module';

@Module({
  imports: [
    // AGENT: add ModelsModule here when Feature 2 is ready
    // ModelsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // export if other modules need chat operations
})
export class ChatModule {}
