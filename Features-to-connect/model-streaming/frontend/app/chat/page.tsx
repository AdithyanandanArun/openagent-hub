'use client';
// app/chat/page.tsx
// Example chat UI — wire up useStreamChat + useModels

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useModels } from '@/hooks/useModels';

export default function ChatPage() {
  const { messages, isStreaming, error, sendMessage, abort, clearMessages } = useStreamChat();
  const { models, isLoading: modelsLoading } = useModels();

  const [input,    setInput]    = useState('');
  const [model,    setModel]    = useState('');
  const bottomRef              = useRef<HTMLDivElement>(null);

  // Auto-select first model
  useEffect(() => {
    if (models.length > 0 && !model) setModel(models[0].id);
  }, [models]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !model || isStreaming) return;
    const text = input;
    setInput('');
    await sendMessage({ model, content: text });
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="font-semibold text-gray-900">LLM Worker Chat</h1>

        {/* Model selector */}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={modelsLoading || isStreaming}
          className="ml-auto text-sm border border-gray-300 rounded-lg px-2 py-1
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {modelsLoading && <option>Loading models…</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider})
            </option>
          ))}
        </select>

        <button
          onClick={clearMessages}
          className="text-xs text-gray-400 hover:text-gray-600 ml-2"
        >
          Clear
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-16 text-sm">
            Select a model and start chatting.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm
                ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }
                ${msg.error ? 'border-red-300 bg-red-50 text-red-700' : ''}
              `}
            >
              {/* Content */}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {/* Streaming cursor */}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
              )}

              {/* Meta */}
              {msg.role === 'assistant' && !msg.isStreaming && msg.model && (
                <p className="text-xs text-gray-400 mt-1">
                  {msg.model} · {msg.provider}
                  {msg.durationMs && ` · ${(msg.durationMs / 1000).toFixed(1)}s`}
                </p>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-200"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          placeholder="Send a message… (Shift+Enter for newline)"
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-gray-50 placeholder-gray-400"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={abort}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm
                       font-medium rounded-xl transition"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || !model}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200
                       disabled:text-gray-400 text-white text-sm font-medium rounded-xl transition"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
