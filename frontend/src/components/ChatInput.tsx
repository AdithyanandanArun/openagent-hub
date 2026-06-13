import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const msg = value.trim();
    if (!msg || isStreaming) return;
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(msg);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`; }
  };

  const canSend = !isStreaming && value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={disabled ? 'Configure your provider in Settings first...' : 'Message OpenAgent Hub...'}
            disabled={disabled && !isStreaming}
            rows={1}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 resize-none outline-none text-sm leading-relaxed max-h-48 disabled:cursor-not-allowed"
          />
          <button
            onClick={isStreaming ? onStop : handleSend}
            disabled={!isStreaming && !canSend}
            className={clsx(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : canSend
                ? 'bg-white text-black hover:bg-zinc-200'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
            )}
          >
            {isStreaming ? <Square size={13} /> : <Send size={13} />}
          </button>
        </div>
        <p className="text-xs text-zinc-600 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
