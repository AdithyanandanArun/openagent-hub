/**
 * FEATURE 4: useChat Hook
 * ============================================================
 * Drop this file at: hooks/useChat.ts
 *
 * AGENT INSTRUCTIONS:
 *   - This hook talks to the NestJS backend at process.env.NEXT_PUBLIC_API_URL
 *   - Auth token is read from localStorage key 'auth_token'
 *     (matches the token storage from Feature 1 lib/auth.ts)
 *   - If your token key is different, update TOKEN_KEY below.
 * ============================================================
 */

'use client';

import { useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'auth_token'; // AGENT: match this to Feature 1's lib/auth.ts

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parentMessageId?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  systemPrompt: string | null;
  modelId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

interface UseChatOptions {
  onError?: (error: Error) => void;
}

// ── API helpers ───────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...getHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json();
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useChat(options?: UseChatOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      options?.onError?.(error);
      console.error('[useChat]', error);
    },
    [options],
  );

  // ── Conversations ─────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiFetch<{ data: Conversation[]; total: number }>(
        '/chat/conversations',
      );
      setConversations(data);
    } catch (e) {
      handleError(e);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const createConversation = useCallback(
    async (opts?: { title?: string; modelId?: string; systemPrompt?: string }) => {
      setIsLoading(true);
      try {
        const conv = await apiFetch<Conversation>('/chat/conversations', {
          method: 'POST',
          body: JSON.stringify(opts ?? {}),
        });
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
        return conv;
      } catch (e) {
        handleError(e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const conv = await apiFetch<Conversation>(
          `/chat/conversations/${id}`,
        );
        setActiveConversation(conv);
        return conv;
      } catch (e) {
        handleError(e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/chat/conversations/${id}`, { method: 'DELETE' });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversation?.id === id) setActiveConversation(null);
      } catch (e) {
        handleError(e);
      }
    },
    [activeConversation, handleError],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await apiFetch<Conversation>(
          `/chat/conversations/${id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ title }),
          },
        );
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c)),
        );
        if (activeConversation?.id === id) {
          setActiveConversation((prev) => (prev ? { ...prev, title } : prev));
        }
        return updated;
      } catch (e) {
        handleError(e);
        return null;
      }
    },
    [activeConversation, handleError],
  );

  // ── Streaming send ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, modelId?: string) => {
      if (!activeConversation) return;

      // Optimistically add user message to UI
      const optimisticUserMsg: Message = {
        id: `temp_${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setActiveConversation((prev) =>
        prev
          ? { ...prev, messages: [...(prev.messages ?? []), optimisticUserMsg] }
          : prev,
      );

      setStreamingContent('');
      abortRef.current = new AbortController();

      try {
        const res = await fetch(
          `${API_URL}/chat/conversations/${activeConversation.id}/stream`,
          {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ content, modelId }),
            signal: abortRef.current.signal,
          },
        );

        if (!res.ok || !res.body) {
          throw new Error(`Stream error ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });

          // SSE format: "data: {...}\n\n"
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.type === 'chunk') {
                  full += payload.content;
                  setStreamingContent(full);
                }
              } catch {
                // ignore parse errors mid-stream
              }
            }
          }
        }

        // Commit streamed message to conversation
        const assistantMsg: Message = {
          id: `streamed_${Date.now()}`,
          role: 'assistant',
          content: full,
          createdAt: new Date().toISOString(),
        };
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...(prev.messages ?? []), assistantMsg],
              }
            : prev,
        );
      } catch (e: unknown) {
        if ((e as Error)?.name !== 'AbortError') handleError(e);
      } finally {
        setStreamingContent('');
        abortRef.current = null;
      }
    },
    [activeConversation, handleError],
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ── Message operations ────────────────────────────────────────────────────

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        await apiFetch(`/chat/messages/${messageId}/edit`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        setActiveConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages?.map((m) =>
                  m.id === messageId ? { ...m, content } : m,
                ),
              }
            : prev,
        );
      } catch (e) {
        handleError(e);
      }
    },
    [handleError],
  );

  const branchFromMessage = useCallback(
    async (messageId: string) => {
      try {
        const newConv = await apiFetch<Conversation>(
          `/chat/messages/${messageId}/branch`,
          { method: 'POST' },
        );
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversation(newConv);
        return newConv;
      } catch (e) {
        handleError(e);
        return null;
      }
    },
    [handleError],
  );

  return {
    // State
    conversations,
    activeConversation,
    isLoading,
    streamingContent,
    // Conversation actions
    fetchConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    renameConversation,
    // Message actions
    sendMessage,
    cancelStream,
    editMessage,
    branchFromMessage,
  };
}
