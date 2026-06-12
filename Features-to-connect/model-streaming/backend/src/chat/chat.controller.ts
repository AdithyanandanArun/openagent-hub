// src/chat/chat.controller.ts
// POST /chat/stream — streams LLM tokens via Server-Sent Events (SSE)
// POST /chat/complete — non-streaming, returns full response

import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModelRouterService } from '../models/model-router.service';
import { StreamChatDto } from './dto/stream-chat.dto';

// SSE event types sent to the client
// data: {"type":"token","delta":"hello"}\n\n
// data: {"type":"done","model":"gpt-4o","provider":"openai"}\n\n
// data: {"type":"error","message":"..."}\n\n

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly modelRouter: ModelRouterService) {}

  /**
   * POST /chat/stream
   * Streams tokens via Server-Sent Events.
   *
   * Client usage:
   *   const es = new EventSource(url);  // or fetch with ReadableStream
   *   es.onmessage = (e) => { const { type, delta } = JSON.parse(e.data); }
   */
  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async streamChat(
    @Body() dto: StreamChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // Disable nginx buffering
    res.flushHeaders();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Detect client disconnect
    let aborted = false;
    req.on('close',   () => { aborted = true; });
    req.on('aborted', () => { aborted = true; });

    const startTime = Date.now();
    let totalTokens = 0;

    try {
      const generator = this.modelRouter.streamChat({
        model:        dto.model,
        messages:     dto.messages,
        providerId:   dto.providerId,
        temperature:  dto.temperature,
        maxTokens:    dto.maxTokens,
        systemPrompt: dto.systemPrompt,
        stream:       true,
      });

      for await (const chunk of generator) {
        if (aborted) break;

        if (chunk.delta) {
          totalTokens++;
          sendEvent({ type: 'token', delta: chunk.delta, id: chunk.id });
        }

        if (chunk.finishReason) {
          sendEvent({
            type:         'done',
            model:        chunk.model,
            provider:     chunk.provider,
            finishReason: chunk.finishReason,
            durationMs:   Date.now() - startTime,
            tokens:       totalTokens,
          });
          break;
        }
      }
    } catch (err: any) {
      this.logger.error(`Stream error: ${err.message}`, err.stack);
      if (!aborted) {
        sendEvent({ type: 'error', message: err.message || 'Stream failed' });
      }
    } finally {
      res.end();
    }
  }

  /**
   * POST /chat/complete
   * Collects the full streamed response and returns it at once.
   * Useful for server-side processing, testing, and non-streaming clients.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeChat(@Body() dto: StreamChatDto) {
    let fullText    = '';
    let model       = dto.model;
    let provider    = dto.providerId ?? '';
    let finishReason: string | null = null;
    const startTime = Date.now();

    const generator = this.modelRouter.streamChat({
      model:        dto.model,
      messages:     dto.messages,
      providerId:   dto.providerId,
      temperature:  dto.temperature,
      maxTokens:    dto.maxTokens,
      systemPrompt: dto.systemPrompt,
      stream:       true,
    });

    for await (const chunk of generator) {
      fullText    += chunk.delta;
      model        = chunk.model;
      provider     = chunk.provider;
      finishReason = chunk.finishReason ?? finishReason;
    }

    return {
      content:      fullText,
      model,
      provider,
      finishReason,
      durationMs:   Date.now() - startTime,
    };
  }
}
