/**
 * FEATURE 4: Chat Service
 * ============================================================
 * Drop this file at: src/chat/chat.service.ts
 *
 * AGENT INSTRUCTIONS — Dependencies this service expects:
 *   - PrismaService  injected from your existing prisma module
 *   - ModelRouterService  from Feature 2 (src/models/model-router.service.ts)
 *     If Feature 2 isn't done yet, see the STUB section at the bottom.
 *
 * This service is self-contained. Import it via ChatModule.
 * ============================================================
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // adjust path if needed
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddMessageDto,
  EditMessageDto,
  StreamMessageDto,
  MessageRole,
} from './dto/chat.dto';

// ── Types (mirrors Prisma generated types — adjust if your schema differs) ────
interface ConversationWithMessages {
  id: string;
  title: string | null;
  systemPrompt: string | null;
  modelId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: MessageRecord[];
}

interface MessageRecord {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  parentMessageId: string | null;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    // AGENT: inject ModelRouterService here when Feature 2 is available
    // private readonly modelRouter: ModelRouterService,
  ) {}

  // ── Conversations ─────────────────────────────────────────────────────────

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationWithMessages> {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: dto.title ?? 'New Conversation',
        systemPrompt: dto.systemPrompt,
        modelId: dto.modelId,
      },
      include: { messages: true },
    });
  }

  async listConversations(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ data: ConversationWithMessages[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // latest message preview only
          },
        },
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);
    return { data, total };
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationWithMessages> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException();
    return conv;
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationWithMessages> {
    await this.assertOwner(userId, conversationId);
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: dto,
      include: { messages: true },
    });
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.assertOwner(userId, conversationId);
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async addMessage(
    userId: string,
    conversationId: string,
    dto: AddMessageDto,
  ): Promise<MessageRecord> {
    await this.assertOwner(userId, conversationId);

    // Touch updatedAt on conversation so list stays sorted
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return this.prisma.message.create({
      data: {
        conversationId,
        role: dto.role,
        content: dto.content,
        parentMessageId: dto.parentMessageId ?? null,
      },
    });
  }

  async editMessage(
    userId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<MessageRecord> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if ((message as any).conversation.userId !== userId)
      throw new ForbiddenException();

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content },
    });
  }

  async branchConversation(
    userId: string,
    messageId: string,
  ): Promise<ConversationWithMessages> {
    // Creates a new conversation forked at the given message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!message) throw new NotFoundException('Message not found');
    const parent = (message as any).conversation;
    if (parent.userId !== userId) throw new ForbiddenException();

    // Collect all messages up to and including the branch point
    const messagesToCopy = parent.messages.filter(
      (m: MessageRecord) =>
        new Date(m.createdAt) <= new Date(message.createdAt),
    );

    const newConv = await this.prisma.conversation.create({
      data: {
        userId,
        title: `Branch of: ${parent.title ?? 'Conversation'}`,
        systemPrompt: parent.systemPrompt,
        modelId: parent.modelId,
        messages: {
          create: messagesToCopy.map((m: MessageRecord) => ({
            role: m.role,
            content: m.content,
          })),
        },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return newConv;
  }

  // ── Streaming (SSE) ───────────────────────────────────────────────────────
  // AGENT: This method returns an async generator.
  // The controller pipes it to an SSE response.
  // Requires ModelRouterService from Feature 2.

  async *streamResponse(
    userId: string,
    conversationId: string,
    dto: StreamMessageDto,
  ): AsyncGenerator<string> {
    const conv = await this.getConversation(userId, conversationId);

    // Save user message first
    await this.addMessage(userId, conversationId, {
      role: MessageRole.USER,
      content: dto.content,
      parentMessageId: dto.parentMessageId,
    });

    // ── AGENT: Uncomment when ModelRouterService (Feature 2) is available ──
    // const modelId = dto.modelId ?? conv.modelId ?? 'default';
    // const history = conv.messages.map(m => ({ role: m.role, content: m.content }));
    // if (conv.systemPrompt) history.unshift({ role: 'system', content: conv.systemPrompt });
    // history.push({ role: 'user', content: dto.content });
    //
    // let fullResponse = '';
    // for await (const chunk of this.modelRouter.stream(modelId, history)) {
    //   fullResponse += chunk;
    //   yield chunk;
    // }
    //
    // await this.addMessage(userId, conversationId, {
    //   role: MessageRole.ASSISTANT,
    //   content: fullResponse,
    // });

    // ── STUB: Remove when Feature 2 is connected ──────────────────────────
    this.logger.warn('streamResponse: ModelRouterService not connected yet');
    const stub = 'Model router not connected. See CONNECT_TO_APP.md.';
    for (const char of stub) {
      yield char;
      await new Promise((r) => setTimeout(r, 20));
    }
    await this.addMessage(userId, conversationId, {
      role: MessageRole.ASSISTANT,
      content: stub,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertOwner(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException();
  }
}
