import { KeyRound, Menu, PanelLeftClose } from "lucide-react";
import { useState } from "react";
import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import ModelSelector from "../components/ModelSelector";
import ProviderSettingsDialog from "../components/ProviderSettingsDialog";
import Sidebar from "../components/Sidebar";
import { useChat } from "../hooks/useChat";
import { useProviderSettings } from "../hooks/useProviderSettings";
import type { AuthUser } from "../types/auth";
import type { ProviderSettings } from "../types/provider";

interface ChatPageProps {
  token: string;
  user: AuthUser;
  onLogout: () => void;
}

export default function ChatPage({ token, user, onLogout }: ChatPageProps) {
  const provider = useProviderSettings();
  const chat = useChat(token, provider.settings, provider.isConfigured);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProviderOpen, setIsProviderOpen] = useState(!provider.isConfigured);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  async function refreshProviderModels(settings?: ProviderSettings) {
    setIsRefreshingModels(true);
    try {
      await chat.refreshModels(settings);
    } finally {
      setIsRefreshingModels(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-ink-950 text-slate-100">
      <Sidebar
        isOpen={isSidebarOpen}
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId}
        user={user}
        onSelect={chat.setActiveConversationId}
        onNew={chat.startConversation}
        onDelete={chat.removeConversation}
        onRename={chat.updateTitle}
        onLogout={onLogout}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-ink-900/80 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
              className="grid h-11 w-11 place-items-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={() => setIsSidebarOpen((value) => !value)}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">AI Chat</h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Streaming responses saved to PostgreSQL
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open provider settings"
              title="Provider settings"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-md transition ${
                provider.isConfigured
                  ? "text-mint-300 hover:bg-white/10"
                  : "bg-coral-500/10 text-coral-400 hover:bg-coral-500/20"
              }`}
              onClick={() => setIsProviderOpen(true)}
            >
              <KeyRound size={19} />
            </button>
            <ModelSelector
              models={chat.models}
              selectedModel={chat.selectedModel}
              disabled={!provider.isConfigured}
              onChange={chat.setSelectedModel}
            />
          </div>
        </header>

        {!provider.isConfigured && (
          <div className="border-b border-coral-400/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-400">
            Add your OpenAI-compatible API key and fetch models before sending messages.
          </div>
        )}

        {chat.error && (
          <div className="border-b border-coral-400/30 bg-coral-500/10 px-4 py-2 text-sm text-coral-400">
            {chat.error}
          </div>
        )}

        <ChatWindow messages={chat.messages} isLoading={chat.isLoading} isStreaming={chat.isStreaming} />
        <ChatInput
          disabled={!chat.activeConversationId || !provider.isConfigured || !chat.selectedModel}
          isStreaming={chat.isStreaming}
          onSend={chat.sendMessage}
          onStop={chat.stopStreaming}
        />
      </main>

      <ProviderSettingsDialog
        isOpen={isProviderOpen}
        settings={provider.settings}
        isConfigured={provider.isConfigured}
        isRefreshing={isRefreshingModels}
        onClose={() => setIsProviderOpen(false)}
        onSave={provider.setSettings}
        onClear={provider.clearSettings}
        onRefreshModels={refreshProviderModels}
      />
    </div>
  );
}
