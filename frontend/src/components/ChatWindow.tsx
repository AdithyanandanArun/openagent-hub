import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Bot } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ConversationDetail } from '../services/chat';

interface Props {
  conversation: ConversationDetail | null;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
}

export function ChatWindow({ conversation, isStreaming, streamingContent, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, streamingContent]);

  if (!conversation && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 select-none">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <Bot size={30} className="text-zinc-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-300 mb-1">OpenAgent Hub</h2>
        <p className="text-sm">Start a conversation below</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="py-4">
        {conversation?.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && streamingContent && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <Bot size={15} />
            </div>
            <div className="max-w-[90%] bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match) {
                        return (
                          <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        );
                      }
                      return <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 text-xs" {...props}>{children}</code>;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pre({ children }: any) { return <>{children}</>; },
                  }}
                >
                  {streamingContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex gap-3 px-4 py-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <Bot size={15} />
            </div>
            <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3.5">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 my-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
