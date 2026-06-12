import { apiRequest, getApiUrl } from "./api";
import type { Conversation, Message, ModelInfo, StreamEvent } from "../types/chat";

export async function listConversations(token: string): Promise<Conversation[]> {
  const data = await apiRequest<{ conversations: Conversation[]; total: number }>(
    "/conversations",
    token
  );
  return data.conversations;
}

export function createConversation(token: string, title = "New Conversation"): Promise<Conversation> {
  return apiRequest<Conversation>("/conversations", token, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function renameConversation(
  token: string,
  conversationId: string,
  title: string
): Promise<Conversation> {
  return apiRequest<Conversation>(`/conversations/${conversationId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(token: string, conversationId: string): Promise<void> {
  return apiRequest<void>(`/conversations/${conversationId}`, token, { method: "DELETE" });
}

export async function listMessages(token: string, conversationId: string): Promise<Message[]> {
  const data = await apiRequest<{ messages: Message[]; total: number }>(
    `/conversations/${conversationId}/messages`,
    token
  );
  return data.messages;
}

export async function listModels(token: string): Promise<ModelInfo[]> {
  const data = await apiRequest<{ models: ModelInfo[] }>("/models", token);
  return data.models;
}

export async function streamChat(
  token: string,
  conversationId: string,
  message: string,
  model: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(getApiUrl("/chat/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, message, model }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? "Streaming request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const rawChunk of chunks) {
      const event = parseSseChunk(rawChunk);
      if (event) onEvent(event);
    }
  }
}

function parseSseChunk(chunk: string): StreamEvent | null {
  const lines = chunk.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) return null;
  return {
    event: eventLine.replace("event:", "").trim() as StreamEvent["event"],
    data: JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, string>,
  };
}
