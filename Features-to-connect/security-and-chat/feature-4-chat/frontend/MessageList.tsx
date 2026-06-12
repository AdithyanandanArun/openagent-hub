/**
 * FEATURE 4: MessageList Component
 * ============================================================
 * Drop this file at: components/MessageList.tsx
 *
 * AGENT INSTRUCTIONS:
 *   - Uses Tailwind CSS (same as the rest of the Next.js app)
 *   - Accepts messages array and the live streamingContent string
 *   - No external dependencies beyond React
 * ============================================================
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/hooks/useChat'; // AGENT: adjust alias if needed

interface MessageListProps {
  messages: Message[];
  streamingContent?: string; // live chunk accumulation while streaming
  onEditMessage?: (id: string, content: string) => void;
  onBranchFromMessage?: (id: string) => void;
}

export function MessageList({
  messages,
  streamingContent,
  onEditMessage,
  onBranchFromMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleEditSave = (id: string) => {
    onEditMessage?.(id, editContent);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
      {messages.length === 0 && !streamingContent && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Send a message to start the conversation
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.role === 'system'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-mono'
                  : 'bg-gray-100 text-gray-900'
            }`}
          >
            {editingId === msg.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full min-h-[80px] bg-white text-gray-900 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => handleEditSave(msg.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                {/* Action buttons — visible on hover */}
                {(onEditMessage || onBranchFromMessage) && (
                  <div className="absolute -bottom-7 right-0 hidden group-hover:flex gap-1">
                    {onEditMessage && msg.role === 'user' && (
                      <button
                        className="text-[10px] px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
                        onClick={() => handleEditStart(msg)}
                      >
                        Edit
                      </button>
                    )}
                    {onBranchFromMessage && (
                      <button
                        className="text-[10px] px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
                        onClick={() => onBranchFromMessage(msg.id)}
                      >
                        Branch
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* Live streaming assistant message */}
      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-gray-100 text-gray-900 leading-relaxed">
            <p className="whitespace-pre-wrap break-words">{streamingContent}</p>
            <span className="inline-block w-1.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
