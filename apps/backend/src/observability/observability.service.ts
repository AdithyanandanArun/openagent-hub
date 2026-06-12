import { Injectable } from "@nestjs/common";

export interface MetricEvent {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

@Injectable()
export class ObservabilityService {
  private readonly events: MetricEvent[] = [];

  track(event: MetricEvent): void {
    this.events.push(event);
  }

  list(): MetricEvent[] {
    return this.events;
  }
}
