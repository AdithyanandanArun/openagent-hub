import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

const deleteConversation = vi.fn().mockResolvedValue(undefined);
const removeRun = vi.fn().mockResolvedValue(undefined);
const clearAllRuns = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    conversations: [{ id: 'chat-1', title: 'Delete me', model: 'test', project_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString() }],
    currentConversation: null, isStreaming: false, streamingContent: '', streamingTools: [], routeInfo: null, error: null,
    loadConversations: vi.fn(), selectConversation: vi.fn(), startNewChat: vi.fn(), deleteConversation,
    renameConversation: vi.fn(), sendMessage: vi.fn(), stopStreaming: vi.fn(), editMessage: vi.fn(), regenerateResponse: vi.fn(),
  }),
}));
vi.mock('../hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loadProjects: vi.fn(), addProject: vi.fn(), renameProject: vi.fn(), removeProject: vi.fn() }) }));
vi.mock('../hooks/useProviderSettings', () => ({ useProviderSettings: () => ({ config: null, availableModels: [], saveConfig: vi.fn(), loadModels: vi.fn(), loadConfig: vi.fn() }) }));
vi.mock('../hooks/useProviders', () => ({ useProviders: () => ({ providerModels: [] }) }));
vi.mock('../hooks/useCatalog', () => ({ useCatalog: () => ({ catalog: [], loadCatalog: vi.fn() }) }));
vi.mock('../hooks/useSkills', () => ({ useSkills: () => ({ skills: [] }) }));
vi.mock('../hooks/useAgentTools', () => ({ useAgentTools: () => ({ tools: [] }) }));
vi.mock('../hooks/useAgents', () => ({
  useAgents: () => ({
    agents: [], runs: [{ id: 'run-1', goal: 'Delete this run', status: 'completed', mode: 'auto', role: null, result: null, error: null, model: null, agent_id: null, parent_run_id: null, conversation_id: null, skill_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString() }],
    liveSteps: [], isRunning: false, runError: null, currentRunId: null,
    loadAgents: vi.fn(), loadRuns: vi.fn(), start: vi.fn(), stop: vi.fn(), continueRun: vi.fn(), primeFromRun: vi.fn(),
    getRun: vi.fn(), removeRun, clearAllRuns, createAgent: vi.fn(), updateAgent: vi.fn(), removeAgent: vi.fn(),
  }),
}));

import { ChatPage } from './ChatPage';

function renderPage() {
  return render(<ChatPage user={{ id: 'user-1', username: 'Tester', email: 'tester@example.com', created_at: '2026-01-01T00:00:00Z', email_verified_at: null }} onLogout={vi.fn()} onDeleteAccount={vi.fn()} />);
}

test('does not delete a chat until the user confirms it', async () => {
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(screen.getByRole('button', { name: 'Delete Delete me' }));
  expect(screen.getByRole('alertdialog', { name: 'Delete this chat?' })).toBeTruthy();
  expect(deleteConversation).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(deleteConversation).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Delete Delete me' }));
  await user.click(screen.getByRole('button', { name: 'Delete chat' }));
  expect(deleteConversation).toHaveBeenCalledWith('chat-1');
});

test('does not delete an agent run until the user confirms it', async () => {
  const user = userEvent.setup();
  renderPage();

  await user.click(screen.getByRole('button', { name: 'Agents' }));
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(screen.getByRole('button', { name: 'Delete agent run: Delete this run' }));
  expect(removeRun).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Delete run' }));
  expect(removeRun).toHaveBeenCalledWith('run-1');
  expect(clearAllRuns).not.toHaveBeenCalled();
});
