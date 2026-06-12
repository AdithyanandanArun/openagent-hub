import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { MemoryRecord, MemoryService } from "./memory.service";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Get()
  search(@Query("userId") userId = "default", @Query("q") query?: string) {
    return this.memory.search(userId, query);
  }

  @Post()
  save(@Body() body: MemoryRecord) {
    return this.memory.save(body);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.memory.delete(id);
  }
}
