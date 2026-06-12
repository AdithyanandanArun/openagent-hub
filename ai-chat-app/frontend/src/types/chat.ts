export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  created_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  context_window: number;
}

export interface StreamEvent {
  event: "message_start" | "content_delta" | "message_end" | "error";
  data: Record<string, string>;
}
