import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Copy, Check, Edit2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Message } from '../services/chat';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

interface Props {
  message: Message;
  isLastAssistant?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, isLastAssistant, onEdit, onRegenerate }: Props) {
  const isUser = message.role === 'user';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [hovered, setHovered] = useState(false);

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      className={clsx('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white self-start mt-0.5',
        isUser ? 'bg-blue-600' : 'bg-emerald-600'
      )}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className={clsx('flex flex-col gap-1 max-w-[90%]', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
        )}>
          {editing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                  if (e.key === 'Escape') { setEditing(false); setEditValue(message.content); }
                }}
                rows={3}
                className="w-full bg-blue-700 text-white rounded-lg px-3 py-2 text-sm resize-none outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditing(false); setEditValue(message.content); }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  className="text-xs px-3 py-1 rounded-lg bg-white text-blue-700 font-medium hover:bg-zinc-100 transition-colors"
                >
                  Save & send
                </button>
              </div>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeStr = String(children).replace(/\n$/, '');
                    if (!inline && match) {
                      return (
                        <div className="my-3 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
                            <span>{match[1]}</span>
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem', fontSize: '0.8rem' }}
                            {...props}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pre({ children }: any) { return <>{children}</>; },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action bar */}
        {!editing && hovered && (
          <div className={clsx(
            'flex items-center gap-0.5 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <CopyButton text={message.content} />
            {isUser && onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                title="Edit"
              >
                <Edit2 size={13} />
              </button>
            )}
            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                title="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
