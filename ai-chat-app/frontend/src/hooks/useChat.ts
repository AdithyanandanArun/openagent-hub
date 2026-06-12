import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  listModels,
  renameConversation,
  streamChat,
} from "../services/chat";
import type { Conversation, Message, ModelInfo } from "../types/chat";

export function useChat(token: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    const items = await listConversations(token);
    setConversations(items);
    return items;
  }, [token]);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      setIsLoading(true);
      setError(null);
      try {
        const [conversationItems, modelItems] = await Promise.all([
          listConversations(token),
          listModels(token),
        ]);
        if (!mounted) return;
        setModels(modelItems);
        setSelectedModel(modelItems[0]?.id ?? "gpt-4o-mini");
        setConversations(conversationItems);
        if (conversationItems[0]) {
          setActiveConversationId(conversationItems[0].id);
        } else {
          const conversation = await createConversation(token);
          if (!mounted) return;
          setConversations([conversation]);
          setActiveConversationId(conversation.id);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void boot();
    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [token]);

  useEffect(() => {
    let mounted = true;
    async function loadMessages() {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }
      try {
        const items = await listMessages(token, activeConversationId);
        if (mounted) setMessages(items);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    }
    void loadMessages();
    return () => {
      mounted = false;
    };
  }, [activeConversationId, token]);

  const startConversation = useCallback(async () => {
    const conversation = await createConversation(token);
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setMessages([]);
  }, [token]);

  const removeConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(token, conversationId);
      setConversations((current) => current.filter((item) => item.id !== conversationId));
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter((item) => item.id !== conversationId);
        setActiveConversationId(remaining[0]?.id ?? null);
      }
    },
    [activeConversationId, conversations, token]
  );

  const updateTitle = useCallback(
    async (conversationId: string, title: string) => {
      const updated = await renameConversation(token, conversationId, title);
      setConversations((current) =>
        current.map((item) => (item.id === conversationId ? updated : item))
      );
    },
    [token]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId || isStreaming) return;
      setError(null);
      setIsStreaming(true);
      const now = new Date().toISOString();
      const userMessage: Message = {
        id: `local-user-${now}`,
        conversation_id: activeConversationId,
        role: "user",
        content,
        created_at: now,
      };
      const assistantMessage: Message = {
        id: `local-assistant-${now}`,
        conversation_id: activeConversationId,
        role: "assistant",
        content: "",
        model: selectedModel,
        created_at: now,
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await streamChat(
          token,
          activeConversationId,
          content,
          selectedModel,
          (event) => {
            if (event.event === "content_delta") {
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: message.content + event.data.content }
                    : message
                )
              );
            }
            if (event.event === "message_end") {
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, id: event.data.message_id }
                    : message
                )
              );
              void refreshConversations();
            }
            if (event.event === "error") {
              setError(event.data.message ?? "The AI provider returned an error");
            }
          },
          controller.signal
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeConversationId, isStreaming, refreshConversations, selectedModel, token]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    models,
    selectedModel,
    isLoading,
    isStreaming,
    error,
    setActiveConversationId,
    setSelectedModel,
    startConversation,
    removeConversation,
    updateTitle,
    sendMessage,
    stopStreaming,
  };
}
