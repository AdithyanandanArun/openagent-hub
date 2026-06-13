import { useState, useCallback, useRef } from 'react';
import {
  listConversations,
  getConversation,
  deleteConversation as apiDelete,
  renameConversation as apiRename,
  streamChat,
  Conversation,
  ConversationDetail,
  Message,
} from '../services/chat';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationDetail | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    const list = await listConversations();
    setConversations(list);
    return list;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    const detail = await getConversation(id);
    setCurrentConversation(detail);
    setError(null);
    return detail;
  }, []);

  const startNewChat = useCallback(() => {
    setCurrentConversation(null);
    setStreamingContent('');
    setError(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await apiDelete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) setCurrentConversation(null);
    },
    [currentConversation]
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const updated = await apiRename(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
      if (currentConversation?.id === id) {
        setCurrentConversation((prev) => (prev ? { ...prev, title: updated.title } : prev));
      }
    },
    [currentConversation]
  );

  const sendMessage = useCallback(
    async (message: string, model: string | null) => {
      const token = localStorage.getItem('token');
      if (!token) return;

      setError(null);
      setIsStreaming(true);
      setStreamingContent('');

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };

      setCurrentConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userMessage] } : null
      );

      let resolvedConvId: string | null = currentConversation?.id ?? null;

      const controller = streamChat(
        message,
        resolvedConvId,
        model,
        token,
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        (id) => {
          resolvedConvId = id;
          if (!currentConversation) {
            setCurrentConversation({
              id,
              title: 'New Conversation',
              model,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              messages: [userMessage],
            });
          }
        },
        async () => {
          setIsStreaming(false);
          setStreamingContent('');
          if (resolvedConvId) {
            const detail = await getConversation(resolvedConvId);
            setCurrentConversation(detail);
          }
          const list = await listConversations();
          setConversations(list);
        },
        (err) => {
          setIsStreaming(false);
          setStreamingContent('');
          setError(err);
        }
      );

      abortRef.current = controller;
    },
    [currentConversation]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return {
    conversations,
    currentConversation,
    isStreaming,
    streamingContent,
    error,
    loadConversations,
    selectConversation,
    startNewChat,
    deleteConversation,
    renameConversation,
    sendMessage,
    stopStreaming,
  };
}
