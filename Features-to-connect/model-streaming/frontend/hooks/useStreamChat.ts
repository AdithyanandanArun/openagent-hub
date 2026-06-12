// hooks/useStreamChat.ts
// React hook for streaming LLM responses from POST /chat/stream (SSE)
//
// Usage:
//   const { messages, sendMessage, isStreaming, error, abort } = useStreamChat();
//   await sendMessage({ model: 'gpt-4o', content: 'Hello!' });

import { useState, useCallback, useRef } from 'react';
import { getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:       string;
  role:     'user' | 'assistant';
  content:  string;
  model?:   string;
  provider?: string;
  durationMs?: number;
  isStreaming?: boolean;
  error?:   string;
}

export interface SendMessageOptions {
  model:        string;
  content:      string;
  providerId?:  string;
  temperature?: number;
  maxTokens?:   number;
  systemPrompt?: string;
}

export interface UseStreamChatReturn {
  messages:    ChatMessage[];
  isStreaming: boolean;
  error:       string | null;
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  abort:       () => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreamChat(conversationId?: string): UseStreamChatReturn {
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const abortRef                      = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (options: SendMessageOptions) => {
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);

      // Add user message
      const userMsg: ChatMessage = {
        id:      crypto.randomUUID(),
        role:    'user',
        content: options.content,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Placeholder for streaming assistant message
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);

      // Build conversation history for the API
      const history = [...messages, userMsg].map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/chat/stream`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            model:         options.model,
            messages:      history,
            providerId:    options.providerId,
            temperature:   options.temperature,
            maxTokens:     options.maxTokens,
            systemPrompt:  options.systemPrompt,
            conversationId,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ message: 'Stream failed' }));
          throw new Error(errBody.message || `HTTP ${res.status}`);
        }

        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            try {
              const event = JSON.parse(trimmed.slice(6));

              if (event.type === 'token') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta }
                      : m,
                  ),
                );
              }

              if (event.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          isStreaming: false,
                          model:       event.model,
                          provider:    event.provider,
                          durationMs:  event.durationMs,
                        }
                      : m,
                  ),
                );
              }

              if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (parseErr: any) {
              if (parseErr.message !== 'Unexpected end of JSON input') {
                // Real error from server
                throw parseErr;
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User aborted — mark message as complete
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m,
            ),
          );
          return;
        }

        const errorMessage = err.message || 'Something went wrong';
        setError(errorMessage);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, error: errorMessage, content: m.content || '⚠️ Failed to get response' }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, conversationId],
  );

  return { messages, isStreaming, error, sendMessage, abort, clearMessages, setMessages };
}
