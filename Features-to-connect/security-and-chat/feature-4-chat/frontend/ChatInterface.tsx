/**
 * FEATURE 4: ChatInterface Component
 * ============================================================
 * Drop this file at: components/ChatInterface.tsx
 *
 * AGENT INSTRUCTIONS:
 *   This is the main chat shell. It composes:
 *     - Sidebar: conversation list
 *     - MessageList: message thread
 *     - Input area: message composer
 *   Uses useChat hook for all state + API calls.
 * ============================================================
 */

'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat'; // AGENT: adjust alias if needed
import { MessageList } from './MessageList';

interface ChatInterfaceProps {
  /** Pre-select a conversation by ID on mount (e.g. from URL param) */
  initialConversationId?: string;
}

export function ChatInterface({ initialConversationId }: ChatInterfaceProps) {
  const {
    conversations,
    activeConversation,
    isLoading,
    streamingContent,
    fetchConversations,
    createConversation,
    loadConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    cancelStream,
    editMessage,
    branchFromMessage,
  } = useChat({ onError: (e) => setError(e.message) });

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
    }
  }, [initialConversationId, loadConversation]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;
    setError(null);
    setInput('');

    // Create a new conversation if none is active
    const conv =
      activeConversation ?? (await createConversation({ title: content.slice(0, 60) }));
    if (!conv) return;

    await sendMessage(content);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRename = (id: string, current: string | null) => {
    setRenamingId(id);
    setRenameValue(current ?? '');
  };

  const commitRename = async (id: string) => {
    if (renameValue.trim()) await renameConversation(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 flex flex-col border-r border-gray-200 bg-gray-50 shrink-0">
        <div className="p-3 border-b border-gray-200">
          <button
            className="w-full text-sm py-2 px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            onClick={() => createConversation()}
          >
            + New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                activeConversation?.id === conv.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              {renamingId === conv.id ? (
                <input
                  className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(conv.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate text-xs">
                  {conv.title ?? 'New Conversation'}
                </span>
              )}

              {/* Per-conversation actions */}
              <div className="hidden group-hover:flex gap-0.5 shrink-0">
                <button
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 text-xs"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(conv.id, conv.title);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 text-xs"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {conversations.length === 0 && !isLoading && (
            <p className="text-xs text-gray-400 text-center mt-4 px-2">
              No conversations yet. Start a new chat!
            </p>
          )}
        </nav>
      </aside>

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h1 className="font-semibold text-gray-800 truncate">
            {activeConversation?.title ?? 'Select or start a conversation'}
          </h1>
          {activeConversation?.modelId && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {activeConversation.modelId}
            </span>
          )}
        </header>

        {/* Messages */}
        <MessageList
          messages={activeConversation?.messages ?? []}
          streamingContent={streamingContent}
          onEditMessage={editMessage}
          onBranchFromMessage={branchFromMessage}
        />

        {/* Error bar */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2">✕</button>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-blue-400 transition-colors">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none max-h-36 min-h-[1.5rem]"
              placeholder="Message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!streamingContent}
            />
            {streamingContent ? (
              <button
                className="shrink-0 p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                onClick={cancelStream}
                title="Stop generating"
              >
                ⏹
              </button>
            ) : (
              <button
                className="shrink-0 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                title="Send"
              >
                ↑
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
