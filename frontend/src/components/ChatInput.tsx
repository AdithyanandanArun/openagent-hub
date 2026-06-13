import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (message: string) => Promise<void>;
  onStop: () => void;
}

export default function ChatInput({ disabled, isStreaming, onSend, onStop }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = message.trim();
    if (!content || disabled || isStreaming) return;
    setMessage("");
    await onSend(content);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <footer className="border-t border-white/10 bg-ink-900/80 px-3 py-3 backdrop-blur sm:px-6">
      <form className="mx-auto flex max-w-4xl items-end gap-2" onSubmit={submit}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? "Configure provider settings first" : "Message AI Chat"}
          className="max-h-40 min-h-12 flex-1 resize-none rounded-md border border-white/10 bg-ink-950 px-4 py-3 text-base leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            aria-label="Stop streaming"
            title="Stop"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-coral-500 text-white transition hover:bg-coral-400"
            onClick={onStop}
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send message"
            title="Send"
            disabled={disabled || !message.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-mint-400 text-ink-950 transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </footer>
  );
}
