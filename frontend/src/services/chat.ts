import api from './api';

export interface MessageAttachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ProviderConfig {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  is_default: boolean;
}

export async function listConversations(projectId?: string | null): Promise<Conversation[]> {
  const params = projectId ? { project_id: projectId } : {};
  const { data } = await api.get('/conversations', { params });
  return data;
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const { data } = await api.get(`/conversations/${id}`);
  return data;
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const { data } = await api.patch(`/conversations/${id}`, { title });
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`);
}

export async function getProviderConfig(): Promise<ProviderConfig> {
  const { data } = await api.get('/provider/config');
  return data;
}

export async function updateProviderConfig(config: Partial<ProviderConfig>): Promise<ProviderConfig> {
  const { data } = await api.put('/provider/config', config);
  return data;
}

export async function truncateConversation(conversationId: string, fromMessageId: string): Promise<void> {
  await api.post(`/conversations/${conversationId}/truncate`, { from_message_id: fromMessageId });
}

export async function fetchModels(): Promise<string[]> {
  const { data } = await api.get('/provider/models');
  return data.models;
}

export function streamChat(
  message: string,
  conversationId: string | null,
  model: string | null,
  token: string,
  onChunk: (chunk: string) => void,
  onConversationId: (id: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  attachmentIds?: string[]
): AbortController {
  const controller = new AbortController();

  fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversation_id: conversationId, model, attachment_ids: attachmentIds }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError(`Server error: ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) { onError('No response body'); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'chunk') onChunk(evt.content);
            else if (evt.type === 'conversation_id') onConversationId(evt.conversation_id);
            else if (evt.type === 'done') onDone();
            else if (evt.type === 'error') onError(evt.message);
          } catch {
            // skip malformed lines
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}
