import type { GenerateRequest, GenerateResponse } from "@openagent/types";

export class OpenAgentClient {
  constructor(private readonly baseUrl: string) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/chat/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Generate failed with ${response.status}`);
    }

    return response.json() as Promise<GenerateResponse>;
  }
}
