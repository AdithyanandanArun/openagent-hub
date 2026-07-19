import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Bot, Menu } from 'lucide-react';
import clsx from 'clsx';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { ProviderSettingsDialog } from '../components/ProviderSettingsDialog';
import { AgentsView } from '../components/AgentsView';
import { AgentManagerDialog } from '../components/AgentManagerDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { useChat } from '../hooks/useChat';
import { useProjects } from '../hooks/useProjects';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { useProviders } from '../hooks/useProviders';
import { useCatalog } from '../hooks/useCatalog';
import { useSkills } from '../hooks/useSkills';
import { useAgentTools } from '../hooks/useAgentTools';
import { useAgents } from '../hooks/useAgents';
import { getRun, AgentRunDetail, AgentMode, Agent } from '../services/agents';
import { User } from '../services/auth';
import { ProviderConfig } from '../services/chat';
import { getPreferences, updatePreferences, WorkspacePreferences } from '../services/preferences';

interface Props {
  user: User;
  onLogout: () => void;
  onDeleteAccount: (password: string) => Promise<void>;
}

interface PendingDeletion {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<void> | void;
}

export function ChatPage({ user, onLogout, onDeleteAccount }: Props) {
  const {
    conversations,
    currentConversation,
    isStreaming,
    streamingContent,
    streamingTools,
    routeInfo,
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
  const { providerModels } = useProviders();
  const { catalog, loadCatalog } = useCatalog();
  const { skills } = useSkills();
  const { tools } = useAgentTools();
  const agents = useAgents();

  // Use provider results when they have just been refreshed; otherwise use the
  // already-synchronised catalog from our database so opening the app does not
  // wait for every upstream provider's /models endpoint.
  const resolvedProviderModels = useMemo(
    () => providerModels.length
      ? providerModels
      : catalog.filter((m) => m.is_enabled).map((m) => ({
        model: m.model_id,
        provider_id: m.provider_id,
        provider_name: m.provider_name,
      })),
    [providerModels, catalog],
  );

  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [thinkingLabel, setThinkingLabel] = useState('Thinking');
  const [view, setView] = useState<'chat' | 'agents'>('chat');

  // Agents-tab shared state.
  const [viewingRun, setViewingRun] = useState<AgentRunDetail | null>(null);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentPrefill, setAgentPrefill] = useState<{ goal?: string; mode?: AgentMode } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preferences, setPreferences] = useState<WorkspacePreferences | null>(null);

  useEffect(() => {
    loadConversations(selectedProjectId);
    loadProjects();
  }, [loadConversations, loadProjects, selectedProjectId]);

  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
  }, []);

  // Default the Agents tab to the built-in Orchestrator so a run always has an agent.
  useEffect(() => {
    if (selectedAgentId) return;
    const orch =
      agents.agents.find((a) => a.is_builtin && a.name === 'Orchestrator')
      ?? agents.agents.find((a) => a.is_builtin);
    if (orch) setSelectedAgentId(orch.id);
  }, [agents.agents, selectedAgentId]);

  // Set initial model from single config if no provider model selected yet
  useEffect(() => {
    if (config?.model && !selectedModel) setSelectedModel(config.model);
  }, [config, selectedModel]);

  // If routing providers are configured but nothing is selected yet, default to
  // "Auto" (smart routing) so a first message never 400s on an empty model.
  useEffect(() => {
    if (!selectedModel && !config?.model && resolvedProviderModels.length > 0) {
      setSelectedModel('auto');
      setSelectedProviderId(null);
    }
  }, [resolvedProviderModels, selectedModel, config]);

  const handleModelChange = (model: string, providerId?: string | null) => {
    setSelectedModel(model);
    setSelectedProviderId(providerId ?? null);
  };

  const handleSend = (
    message: string,
    attachmentIds: string[],
    opts?: { useTools?: boolean; toolMode?: 'off' | 'auto' | 'always'; toolNames?: string[]; skillId?: string | null; skillAuto?: boolean; routingMode?: string },
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
    // A successful provider test already synchronises that provider server-side.
    // Refresh the local catalog only; do not re-test every provider after each
    // save/toggle, which created unnecessary slow /models fan-out requests.
    loadCatalog();
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
    setShowSettings(true);
  };

  const dismissOnboarding = async () => {
    try {
      const updated = await updatePreferences({ complete_onboarding: true });
      setPreferences(updated);
    } catch {
      // The checklist remains available after a transient network failure.
    }
  };

  const confirmDeletion = async () => {
    if (!pendingDeletion) return;
    setIsDeleting(true);
    try {
      await pendingDeletion.action();
      setPendingDeletion(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Agents-tab handlers ──────────────────────────────────────────────────────
  const openRun = async (id: string) => {
    setView('agents');
    try { setViewingRun(await getRun(id)); } catch { /* ignore */ }
  };

  const switchToAgents = (prefill?: { goal?: string; mode?: AgentMode }) => {
    setView('agents');
    setViewingRun(null);
    if (prefill) setAgentPrefill(prefill);
  };

  const useAgent = (a: Agent) => {
    setView('agents');
    setSelectedAgentId(a.id);
    setShowAgentManager(false);
  };

  // Model options for the agent manager's dropdown.
  const managerModels = useMemo(
    () => resolvedProviderModels.length
      ? resolvedProviderModels.map((m) => ({ model: m.model, provider_id: m.provider_id, provider_name: m.provider_name }))
      : availableModels.map((m) => ({ model: m, provider_id: null as string | null })),
    [resolvedProviderModels, availableModels],
  );

  // Decide which model list to show: use providerModels if available, else flat list
  const hasProviderModels = resolvedProviderModels.length > 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={view}
        conversations={conversations}
        currentId={currentConversation?.id}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={(id) => setPendingDeletion({
          title: 'Delete this chat?',
          description: 'This permanently deletes the conversation and all of its messages. This cannot be undone.',
          confirmLabel: 'Delete chat',
          action: () => deleteConversation(id),
        })}
        onRename={renameConversation}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onAddProject={addProject}
        onRenameProject={renameProject}
        onDeleteProject={removeProject}
        runs={agents.runs}
        currentRunId={viewingRun?.id ?? null}
        onSelectRun={openRun}
        onDeleteRun={(id) => setPendingDeletion({
          title: 'Delete this agent run?',
          description: 'This permanently deletes the run, its steps, and any child runs. This cannot be undone.',
          confirmLabel: 'Delete run',
          action: async () => {
            if (viewingRun?.id === id) setViewingRun(null);
            await agents.removeRun(id);
          },
        })}
        onClearRuns={() => setPendingDeletion({
          title: 'Delete all run history?',
          description: 'This permanently deletes every saved agent run and its steps. This cannot be undone.',
          confirmLabel: 'Delete all runs',
          action: async () => {
            setViewingRun(null);
            await agents.clearAllRuns();
          },
        })}
        onNewRun={() => { setView('agents'); setViewingRun(null); }}
        agents={agents.agents}
        onManageAgents={() => { setView('agents'); setShowAgentManager(true); }}
        onUseAgent={useAgent}
        username={user.username}
        onOpenSettings={handleOpenSettings}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* View switcher */}
        <div className="flex items-center gap-1 px-2 py-2 sm:px-3 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
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
            {preferences && !preferences.onboarding_completed_at && (
              <OnboardingChecklist
                hasProvider={resolvedProviderModels.length > 0 || Boolean(config?.model)}
                hasProject={projects.length > 0}
                hasEmbeddingProvider={Boolean(preferences.embedding_provider_id && preferences.embedding_model)}
                onOpenSettings={handleOpenSettings}
                onDismiss={dismissOnboarding}
              />
            )}
            <ChatWindow
              conversation={currentConversation}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingTools={streamingTools}
              routeInfo={routeInfo}
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
              providerModels={hasProviderModels ? resolvedProviderModels : undefined}
              catalog={catalog}
              skills={skills}
              tools={tools}
              onModelChange={handleModelChange}
              onSwitchToAgents={switchToAgents}
              onClearChat={handleNewChat}
            />
          </>
        ) : (
          <AgentsView
            providerModels={resolvedProviderModels}
            fallbackModel={selectedModel || config?.model || ''}
            catalog={catalog}
            availableModels={availableModels}
            skills={skills}
            tools={tools}
            liveSteps={agents.liveSteps}
            isRunning={agents.isRunning}
            runError={agents.runError}
            currentRunId={agents.currentRunId}
            start={agents.start}
            stop={agents.stop}
            continueRun={agents.continueRun}
            primeFromRun={agents.primeFromRun}
            viewing={viewingRun}
            onClearViewing={() => setViewingRun(null)}
            savedAgents={agents.agents}
            selectedAgentId={selectedAgentId}
            onSelectedAgentChange={setSelectedAgentId}
            onOpenManager={() => setShowAgentManager(true)}
            prefill={agentPrefill}
            onPrefillConsumed={() => setAgentPrefill(null)}
          />
        )}
      </div>

      {showAgentManager && (
        <AgentManagerDialog
          agents={agents.agents}
          skills={skills}
          models={managerModels}
          onClose={() => setShowAgentManager(false)}
          onCreate={async (p) => { await agents.createAgent(p); }}
          onUpdate={async (id, p) => { await agents.updateAgent(id, p); }}
          onDelete={async (id) => { await agents.removeAgent(id); }}
          onUse={useAgent}
        />
      )}

      {showSettings && (
        <ProviderSettingsDialog
          config={config}
          onSave={handleSettingsSave}
          onFetchModels={loadModels}
          onClose={() => setShowSettings(false)}
          username={user.username}
          email={user.email}
          onLogout={onLogout}
          onDeleteAccount={onDeleteAccount}
          onProvidersChange={handleProvidersChange}
          isAdmin={user.is_admin}
        />
      )}

      {pendingDeletion && (
        <ConfirmDialog
          title={pendingDeletion.title}
          description={pendingDeletion.description}
          confirmLabel={pendingDeletion.confirmLabel}
          busy={isDeleting}
          onConfirm={confirmDeletion}
          onCancel={() => !isDeleting && setPendingDeletion(null)}
        />
      )}
    </div>
  );
}
