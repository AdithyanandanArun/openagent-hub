import { Injectable } from "@nestjs/common";
import type { GenerateRequest } from "@openagent/types";
import { MessageRole } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ModelRouterService } from "../models/model-router.service";

export interface CreateConversationInput {
  userId?: string;
  title: string;
  parentId?: string;
}

export interface CreateMessageInput {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  parentId?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly modelRouter: ModelRouterService,
    private readonly prisma: PrismaService
  ) {}

  async listConversations(userId = "default") {
    await this.ensureUser(userId);
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } }
    });
  }

  async createConversation(input: CreateConversationInput) {
    const userId = input.userId ?? "default";
    await this.ensureUser(userId);
    return this.prisma.conversation.create({
      data: {
        userId,
        title: input.title,
        parentId: input.parentId
      }
    });
  }

  async listMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { attachments: true }
    });
  }

  async addMessage(conversationId: string, input: CreateMessageInput) {
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        role: this.toMessageRole(input.role),
        content: input.content,
        toolCallId: input.toolCallId,
        parentId: input.parentId
      }
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });
    return message;
  }

  async generate(request: GenerateRequest & { conversationId?: string }) {
    const response = await this.modelRouter.generate(request);
    if (request.conversationId) {
      await this.addMessage(request.conversationId, {
        role: response.message.role,
        content: response.message.content,
        toolCallId: response.message.toolCallId
      });
    }
    return response;
  }

  stream(request: GenerateRequest) {
    return this.modelRouter.stream(request);
  }

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@local.openagent`,
        passwordHash: "local-development-user"
      }
    });
  }

  private toMessageRole(role: CreateMessageInput["role"]): MessageRole {
    return role as MessageRole;
  }
}
