import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { SkillsService } from "./skills.service";

@Controller("skills")
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  list() {
    return this.skills.list();
  }

  @Put(":name")
  setEnabled(@Param("name") name: string, @Body() body: { enabled: boolean }) {
    return this.skills.setEnabled(name, body.enabled);
  }
}
