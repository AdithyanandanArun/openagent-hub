import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type React from 'react';
import { Sidebar } from './Sidebar';
import type { AgentRun } from '../services/agents';

const conversation = {
  id: 'chat-1', title: 'Mobile chat', model: 'test-model', project_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(),
};

const run: AgentRun = {
  id: 'run-1', goal: 'Check mobile layout', status: 'completed', mode: 'auto',
  role: null, result: null, error: null, model: null, agent_id: null, parent_run_id: null,
  conversation_id: null, skill_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(),
};

function props(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return {
    mode: 'chat' as const,
    conversations: [conversation], currentId: null,
    onSelect: vi.fn(), onNew: vi.fn(), onDelete: vi.fn(), onRename: vi.fn(),
    projects: [], selectedProjectId: null,
    onSelectProject: vi.fn(), onAddProject: vi.fn(), onRenameProject: vi.fn(), onDeleteProject: vi.fn(),
    username: 'Tester', onOpenSettings: vi.fn(),
    ...overrides,
  };
}

test('opens as a mobile drawer and closes after selecting a chat', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const rendered = render(<Sidebar {...props({ isOpen: false, onSelect, onClose })} />);

  expect(screen.getByLabelText('Workspace navigation').className).toContain('-translate-x-full');
  rendered.rerender(<Sidebar {...props({ isOpen: true, onSelect, onClose })} />);
  expect(screen.getByLabelText('Workspace navigation').className).toContain('translate-x-0');

  await user.click(screen.getByText('Mobile chat'));
  expect(onSelect).toHaveBeenCalledWith('chat-1');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('exposes run deletion on touch layouts without deleting immediately', async () => {
  const user = userEvent.setup();
  const onDeleteRun = vi.fn();
  render(<Sidebar {...props({ mode: 'agents', runs: [run], onDeleteRun, isOpen: true })} />);

  await user.click(screen.getByRole('button', { name: 'Delete agent run: Check mobile layout' }));
  expect(onDeleteRun).toHaveBeenCalledWith('run-1');
});
