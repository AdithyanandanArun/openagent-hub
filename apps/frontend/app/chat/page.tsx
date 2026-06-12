import { SlidersHorizontal } from "lucide-react";
import { StatusGrid } from "../../components/status-grid";
import { ChatClient } from "./chat-client";

export default function ChatPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chat</h1>
          <p className="text-sm text-muted-foreground">Model conversations with tools, memory, branches, and knowledge retrieval.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium">
          <SlidersHorizontal size={16} aria-hidden />
          Controls
        </button>
      </header>
      <StatusGrid />
      <ChatClient />
    </div>
  );
}
