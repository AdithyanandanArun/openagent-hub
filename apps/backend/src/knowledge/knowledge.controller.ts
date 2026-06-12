import { Body, Controller, Get, Post } from "@nestjs/common";
import { KnowledgeDocument, KnowledgeService } from "./knowledge.service";

@Controller("documents")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list() {
    return this.knowledge.list();
  }

  @Post()
  add(@Body() body: KnowledgeDocument) {
    return this.knowledge.add(body);
  }
}
