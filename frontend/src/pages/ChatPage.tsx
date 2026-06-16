import { useEffect, useState } from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import clsx from 'clsx';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { ProviderSettingsDialog } from '../components/ProviderSettingsDialog';
import { AgentsView } from '../components/AgentsView';
import { useChat } from '../hooks/useChat';
import { useProjects } from '../hooks/useProjects';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { useProviders } from '../hooks/useProviders';
import { useCatalog } from '../hooks/useCatalog';
import { useSkills } from '../hooks/useSkills';
import { useAgentTools } from '../hooks/useAgentTools';
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
    streamingTools,
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
  const { catalog, sync: syncCatalog } = useCatalog();
  const { skills } = useSkills();
  const { tools } = useAgentTools();

  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [thinkingLabel, setThinkingLabel] = useState('Thinking');
  const [view, setView] = useState<'chat' | 'agents'>('chat');

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

  const handleSend = (
    message: string,
    attachmentIds: string[],
    opts?: { useTools?: boolean; toolMode?: 'off' | 'auto' | 'always'; toolNames?: string[]; skillId?: string | null; skillAuto?: boolean },
  ) => {
    setThinkingLabel(attachmentIds.length > 0 ? 'Analysing' : 'Thinking');
    sendMessage(
      message,
      selectedModel || null,
      attachmentIds.length ? attachmentIds : undefined,
      selectedProviderId,
      opts,
    );
  };

  const handleSettingsSave = async (data: Partial<ProviderConfig>) => {
    await saveConfig(data);
    await loadConfig();
    if (data.model) setSelectedModel(data.model);
  };

  const handleProvidersChange = () => {
    refreshModels();
    syncCatalog();
  };

  // Selecting a conversation or starting a new chat should always land the user
  // in the Chat view, even if they were on the Agents tab.
  const handleSelectConversation = (id: string) => {
    setView('chat');
    selectConversation(id);
  };

  const handleNewChat = () => {
    setView('chat');
    startNewChat();
  };

  const handleSelectProject = (id: string | null) => {
    setView('chat');
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
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
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

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* View switcher */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
          <button
            onClick={() => setView('chat')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'chat' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900')}
          >
            <MessageSquare size={14} /> Chat
          </button>
          <button
            onClick={() => setView('agents')}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'agents' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900')}
          >
            <Bot size={14} /> Agents
          </button>
        </div>

        {view === 'chat' ? (
          <>
            <ChatWindow
              conversation={currentConversation}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingTools={streamingTools}
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
              catalog={catalog}
              skills={skills}
              tools={tools}
              onModelChange={handleModelChange}
            />
          </>
        ) : (
          <AgentsView
            providerModels={providerModels}
            fallbackModel={selectedModel || config?.model || ''}
            catalog={catalog}
            availableModels={availableModels}
          />
        )}
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
          onProvidersChange={handleProvidersChange}
        />
      )}
    </div>
  );
}
