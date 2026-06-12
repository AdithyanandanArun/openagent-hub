/**
 * FEATURE 4: Chat Controller
 * ============================================================
 * Drop this file at: src/chat/chat.controller.ts
 *
 * AGENT INSTRUCTIONS:
 *   - JwtAuthGuard comes from Feature 1: src/auth/guards/jwt-auth.guard.ts
 *   - @CurrentUser() decorator should come from your auth module.
 *     If it doesn't exist, see the inline stub at the bottom of this file.
 *   - SSE streaming uses Server-Sent Events via @Sse() decorator.
 *     The frontend uses EventSource or fetch with ReadableStream.
 * ============================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddMessageDto,
  EditMessageDto,
  StreamMessageDto,
} from './dto/chat.dto';

// AGENT: Import JwtAuthGuard from Feature 1
// If Feature 1 path differs, adjust the import below
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// AGENT: Import or create a CurrentUser decorator
// If your auth module already has one, replace this with that import
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // JWT strategy attaches user here
  },
);

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── Conversations ─────────────────────────────────────────────────────────

  @Post('conversations')
  createConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.chatService.listConversations(user.id, limit, offset);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.getConversation(user.id, id);
  }

  @Patch('conversations/:id')
  updateConversation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(user.id, id, dto);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConversation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.deleteConversation(user.id, id);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Post('conversations/:id/messages')
  addMessage(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.chatService.addMessage(user.id, id, dto);
  }

  @Post('messages/:id/edit')
  editMessage(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(user.id, id, dto);
  }

  @Post('messages/:id/branch')
  branchConversation(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chatService.branchConversation(user.id, id);
  }

  // ── Streaming (SSE) ───────────────────────────────────────────────────────

  @Sse('conversations/:id/stream')
  streamResponse(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StreamMessageDto,
  ): Observable<MessageEvent> {
    const generator = this.chatService.streamResponse(user.id, id, dto);

    return from(
      (async function* () {
        for await (const chunk of generator) {
          yield chunk;
        }
      })(),
    ).pipe(
      map((chunk) => ({
        data: JSON.stringify({ type: 'chunk', content: chunk }),
      })),
    );
  }
}
