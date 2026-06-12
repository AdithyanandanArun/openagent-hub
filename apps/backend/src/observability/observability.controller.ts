import { Controller, Get } from "@nestjs/common";
import { ObservabilityService } from "./observability.service";

@Controller("admin/metrics")
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  list() {
    return this.observability.list();
  }
}
