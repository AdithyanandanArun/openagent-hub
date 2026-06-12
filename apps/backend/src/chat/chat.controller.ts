import { Body, Controller, Get, Param, Post, Query, Sse } from "@nestjs/common";
import type { GenerateRequest } from "@openagent/types";
import { Observable } from "rxjs";
import { ChatService, CreateConversationInput, CreateMessageInput } from "./chat.service";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("conversations")
  listConversations(@Query("userId") userId?: string) {
    return this.chatService.listConversations(userId);
  }

  @Post("conversations")
  createConversation(@Body() body: CreateConversationInput) {
    return this.chatService.createConversation(body);
  }

  @Get("conversations/:id/messages")
  listMessages(@Param("id") id: string) {
    return this.chatService.listMessages(id);
  }

  @Post("conversations/:id/messages")
  addMessage(@Param("id") id: string, @Body() body: CreateMessageInput) {
    return this.chatService.addMessage(id, body);
  }

  @Post("generate")
  generate(@Body() body: GenerateRequest & { conversationId?: string }) {
    return this.chatService.generate(body);
  }

  @Sse("stream")
  stream(): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      subscriber.next({ data: { ready: true } } as MessageEvent);
      subscriber.complete();
    });
  }
}
