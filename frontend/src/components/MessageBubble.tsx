import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { Message } from '../services/chat';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-200"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white',
        isUser ? 'bg-blue-600' : 'bg-emerald-600'
      )}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className={clsx(
        'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm',
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
      )}>
        {isUser ? (
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
    </div>
  );
}
