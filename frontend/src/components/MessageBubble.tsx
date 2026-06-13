import { Check, Copy } from "lucide-react";
import { ComponentProps, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import type { Message } from "../types/chat";

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <article className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[min(100%,48rem)] rounded-lg px-4 py-3 shadow-sm",
          isUser
            ? "bg-mint-400 text-ink-950"
            : "border border-white/10 bg-ink-850 text-slate-100"
        )}
      >
        {isStreaming ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mint-300" />
            Thinking
          </div>
        ) : (
          <Markdown content={message.content} isUser={isUser} />
        )}
      </div>
    </article>
  );
}

function Markdown({ content, isUser }: { content: string; isUser: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className={clsx(
        "prose max-w-none prose-pre:m-0 prose-pre:bg-transparent",
        isUser ? "prose-invert text-ink-950" : "prose-invert prose-slate"
      )}
      components={{
        code(props) {
          const { children, className, ...rest } = props as ComponentProps<"code"> & {
            inline?: boolean;
          };
          const inline = !String(className ?? "").includes("language-");
          if (inline) {
            return (
              <code className={clsx("rounded px-1 py-0.5", isUser ? "bg-ink-950/10" : "bg-white/10")} {...rest}>
                {children}
              </code>
            );
          }
          return <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") ?? "text";

  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="my-3 overflow-hidden rounded-md border border-white/10 bg-ink-950">
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
        <span className="text-xs font-medium uppercase text-slate-400">{language}</span>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => void copy()}
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-6">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
