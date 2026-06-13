import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square, Paperclip, X, FileText, Image, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { uploadAttachment, AttachmentMeta } from '../services/attachments';

interface Props {
  onSend: (message: string, attachmentIds: string[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  model: string;
  availableModels: string[];
  onModelChange: (model: string) => void;
}

function FileChip({ att, onRemove }: { att: AttachmentMeta; onRemove: () => void }) {
  const isImage = att.content_type.startsWith('image/');
  return (
    <div className="flex items-center gap-1.5 bg-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 max-w-[160px]">
      {isImage ? <Image size={12} className="flex-shrink-0 text-blue-400" /> : <FileText size={12} className="flex-shrink-0 text-zinc-400" />}
      <span className="truncate">{att.filename}</span>
      <button onClick={onRemove} className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 ml-0.5">
        <X size={11} />
      </button>
    </div>
  );
}

function ModelPicker({ model, availableModels, onChange }: { model: string; availableModels: string[]; onChange: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const models = availableModels.length > 0 ? availableModels : (model ? [model] : []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent textarea blur
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={handleMouseDown}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded-md px-1.5 py-1 hover:bg-zinc-700"
      >
        <span className="max-w-[140px] truncate">{model || 'Select model'}</span>
        <ChevronDown size={11} className={clsx('transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {models.length === 0 ? (
              <p className="text-zinc-500 text-xs px-3 py-3">No models — open Settings to fetch models.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto py-1">
                {models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(m); setOpen(false); }}
                    className={clsx(
                      'w-full text-left px-3 py-2 text-sm transition-colors truncate',
                      m === model ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function ChatInput({ onSend, onStop, isStreaming, disabled, model, availableModels, onModelChange }: Props) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const msg = value.trim();
    if ((!msg && attachments.length === 0) || isStreaming) return;
    const ids = attachments.map((a) => a.id);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(msg || '(see attachment)', ids);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const token = localStorage.getItem('token') || '';
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadAttachment(f, token)));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const canSend = !isStreaming && !disabled && !uploading && (value.trim().length > 0 || attachments.length > 0);

  return (
    <div className="px-4 pb-4 pt-1 max-w-5xl mx-auto w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map((att) => (
            <FileChip
              key={att.id}
              att={att}
              onRemove={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
            />
          ))}
        </div>
      )}

      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl focus-within:border-zinc-500 transition-colors">
        {/* Text area */}
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={disabled ? 'Configure your provider in Settings first...' : 'Message OpenAgent Hub...'}
            disabled={disabled && !isStreaming}
            rows={1}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 resize-none outline-none text-sm leading-relaxed max-h-48 disabled:cursor-not-allowed"
          />
        </div>

        {/* Bottom bar */}
        <div className="px-3 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isStreaming || uploading}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-30"
              title="Attach file"
            >
              <Paperclip size={15} className={uploading ? 'animate-pulse' : ''} />
            </button>
            <ModelPicker model={model} availableModels={availableModels} onChange={onModelChange} />
          </div>

          <button
            onClick={isStreaming ? onStop : handleSend}
            disabled={!isStreaming && !canSend}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-zinc-600 text-center mt-1.5">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
