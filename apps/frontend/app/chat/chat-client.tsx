"use client";

import { Plus, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface Conversation {
  id: string;
  title: string;
}

interface Message {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface ProviderRecord {
  id: string;
  name: string;
}

export function ChatClient() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => apiGet<ProviderRecord[]>("/models/providers")
  });
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiGet<Conversation[]>("/chat/conversations")
  });
  const selectedConversationId = activeConversationId ?? conversations.data?.[0]?.id ?? null;
  const messages = useQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: () => apiGet<Message[]>(`/chat/conversations/${selectedConversationId}/messages`),
    enabled: Boolean(selectedConversationId)
  });
  const createConversation = useMutation({
    mutationFn: () => apiSend<Conversation>("/chat/conversations", "POST", { title: "New conversation" }),
    onSuccess: async (conversation) => {
      setActiveConversationId(conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });
  const sendMessage = useMutation({
    mutationFn: async () => {
      const conversationId = selectedConversationId ?? (await apiSend<Conversation>("/chat/conversations", "POST", { title: draft.slice(0, 48) || "New conversation" })).id;
      setActiveConversationId(conversationId);
      return apiSend<Message>(`/chat/conversations/${conversationId}/messages`, "POST", { role: "user", content: draft });
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
    }
  });
  const activeTitle = useMemo(
    () => conversations.data?.find((conversation) => conversation.id === selectedConversationId)?.title ?? "Conversation",
    [conversations.data, selectedConversationId]
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim()) {
      sendMessage.mutate();
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr_320px]">
      <section className="rounded-md border border-border bg-white">
        <header className="flex min-h-12 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border" onClick={() => createConversation.mutate()} aria-label="New conversation">
            <Plus size={15} aria-hidden />
          </button>
        </header>
        <div className="max-h-[520px] divide-y divide-border overflow-auto">
          {(conversations.data ?? []).map((conversation) => (
            <button
              key={conversation.id}
              className={`block w-full px-4 py-3 text-left text-sm ${conversation.id === selectedConversationId ? "bg-muted font-semibold" : ""}`}
              onClick={() => setActiveConversationId(conversation.id)}
            >
              {conversation.title}
            </button>
          ))}
          {conversations.isLoading ? <div className="p-4 text-sm text-muted-foreground">Loading...</div> : null}
        </div>
      </section>
      <section className="rounded-md border border-border bg-white">
        <header className="flex min-h-12 items-center border-b border-border px-4">
          <h2 className="text-sm font-semibold">{activeTitle}</h2>
        </header>
        <div className="flex min-h-[520px] flex-col justify-between gap-4 p-4">
          <div className="space-y-3">
            {(messages.data ?? []).map((message) => (
              <div key={message.id} className={`max-w-[82%] rounded-md p-3 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                {message.content}
              </div>
            ))}
            {!selectedConversationId ? <div className="rounded-md bg-muted p-3 text-sm">Create a conversation or send a message to start.</div> : null}
          </div>
          <form className="flex gap-2" onSubmit={submit}>
            <textarea
              className="min-h-12 flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Message the selected model"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50" disabled={sendMessage.isPending || !draft.trim()} aria-label="Send message">
              <Send size={18} aria-hidden />
            </button>
          </form>
        </div>
      </section>
      <section className="rounded-md border border-border bg-white">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Run Context</h2>
        </header>
        <div className="space-y-4 p-4 text-sm">
          <label className="block">
            <span className="text-xs text-muted-foreground">Provider</span>
            <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3">
              {(providers.data ?? []).map((provider) => (
                <option key={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Model</span>
            <input className="mt-1 h-10 w-full rounded-md border border-border px-3" defaultValue="gpt-compatible" />
          </label>
          <div className="rounded-md bg-muted p-3">
            Messages are persisted in PostgreSQL. Model generation is ready to call through the backend router once a provider endpoint is reachable.
          </div>
        </div>
      </section>
    </div>
  );
}
