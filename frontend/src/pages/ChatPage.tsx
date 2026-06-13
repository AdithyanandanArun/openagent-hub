import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { ProviderSettingsDialog } from '../components/ProviderSettingsDialog';
import { useChat } from '../hooks/useChat';
import { useProjects } from '../hooks/useProjects';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { useProviders } from '../hooks/useProviders';
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
    editMessage,
    regenerateResponse,
  } = useChat();

  const { projects, loadProjects, addProject, renameProject, removeProject } = useProjects();
  const { config, availableModels, saveConfig, loadModels, loadConfig } = useProviderSettings();
  const { providerModels, refreshModels } = useProviders();

  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [thinkingLabel, setThinkingLabel] = useState('Thinking');

  useEffect(() => {
    loadConversations(selectedProjectId);
    loadProjects();
  }, [loadConversations, loadProjects, selectedProjectId]);

  // Set initial model from single config if no provider model selected yet
  useEffect(() => {
    if (config?.model && !selectedModel) setSelectedModel(config.model);
  }, [config, selectedModel]);

  const handleModelChange = (model: string, providerId?: string | null) => {
    setSelectedModel(model);
    setSelectedProviderId(providerId ?? null);
  };

  const handleSend = (message: string, attachmentIds: string[]) => {
    setThinkingLabel(attachmentIds.length > 0 ? 'Analysing' : 'Thinking');
    sendMessage(
      message,
      selectedModel || null,
      attachmentIds.length ? attachmentIds : undefined,
      selectedProviderId,
    );
  };

  const handleSettingsSave = async (data: Partial<ProviderConfig>) => {
    await saveConfig(data);
    await loadConfig();
    if (data.model) setSelectedModel(data.model);
  };

  const handleSelectProject = (id: string | null) => {
    setSelectedProjectId(id);
    startNewChat();
  };

  const handleOpenSettings = () => {
    loadModels().catch(() => {});
    setShowSettings(true);
  };

  // Decide which model list to show: use providerModels if available, else flat list
  const hasProviderModels = providerModels.length > 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentId={currentConversation?.id}
        onSelect={selectConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        onRename={renameConversation}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onAddProject={addProject}
        onRenameProject={renameProject}
        onDeleteProject={removeProject}
        username={user.username}
        onOpenSettings={handleOpenSettings}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          conversation={currentConversation}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          thinkingLabel={thinkingLabel}
          error={error}
          onEditMessage={(id, content) => editMessage(id, content, selectedModel || null, selectedProviderId)}
          onRegenerate={() => regenerateResponse(selectedModel || null, selectedProviderId)}
        />

        <ChatInput
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={!hasProviderModels && !config?.model && !selectedModel}
          model={selectedModel}
          availableModels={availableModels}
          providerModels={hasProviderModels ? providerModels : undefined}
          onModelChange={handleModelChange}
        />
      </div>

      {showSettings && (
        <ProviderSettingsDialog
          config={config}
          onSave={handleSettingsSave}
          onFetchModels={loadModels}
          onClose={() => setShowSettings(false)}
          username={user.username}
          email={user.email}
          onLogout={onLogout}
          onProvidersChange={refreshModels}
        />
      )}
    </div>
  );
}
