import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { ModelSelector } from '../components/ModelSelector';
import { ProviderSettingsDialog } from '../components/ProviderSettingsDialog';
import { useChat } from '../hooks/useChat';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { User } from '../services/auth';
import { ProviderConfig } from '../services/chat';

interface Props {
  user: User;
  onLogout: () => void;
}

export function ChatPage({ user, onLogout }: Props) {
  const {
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
  } = useChat();

  const { config, availableModels, saveConfig, loadModels, loadConfig } = useProviderSettings();
  const [selectedModel, setSelectedModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (config?.model && !selectedModel) setSelectedModel(config.model);
  }, [config, selectedModel]);

  const handleSend = (message: string) => {
    sendMessage(message, selectedModel || null);
  };

  const handleSettingsSave = async (data: Partial<ProviderConfig>) => {
    await saveConfig(data);
    await loadConfig();
    if (data.model) setSelectedModel(data.model);
  };

  const notConfigured = !config?.model && !selectedModel;

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentId={currentConversation?.id}
        onSelect={selectConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        onRename={renameConversation}
        username={user.username}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
          <ModelSelector
            model={selectedModel}
            availableModels={availableModels}
            onChange={setSelectedModel}
          />
          <button
            onClick={() => { loadModels().catch(() => {}); setShowSettings(true); }}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Provider settings"
          >
            <Settings size={17} />
          </button>
        </div>

        <ChatWindow
          conversation={currentConversation}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          error={error}
        />

        <ChatInput
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={notConfigured}
        />
      </div>

      {showSettings && (
        <ProviderSettingsDialog
          config={config}
          onSave={handleSettingsSave}
          onFetchModels={loadModels}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
