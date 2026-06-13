import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "../types/chat";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
}

export default function ChatWindow({ messages, isLoading, isStreaming }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (isLoading) {
    return (
      <section className="grid min-h-0 flex-1 place-items-center">
        <Loader2 className="animate-spin text-mint-300" size={28} aria-label="Loading chat" />
      </section>
    );
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-lg text-center">
            <h2 className="text-2xl font-semibold text-white">Start a conversation</h2>
            <p className="mt-3 text-slate-400">
              Ask a question, draft a plan, or paste code for review. Responses stream in real time.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} isStreaming={isStreaming && message.role === "assistant" && !message.content} />
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
