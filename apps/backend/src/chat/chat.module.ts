import { Module } from "@nestjs/common";
import { ModelsModule } from "../models/models.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [ModelsModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
