import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square, Paperclip, X, FileText, Image, ChevronDown, Eye, Brain, Zap, Wrench, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { uploadAttachment, AttachmentMeta } from '../services/attachments';
import { ProviderModel } from '../hooks/useProviders';
import { CatalogModel } from '../services/catalog';
import { Skill } from '../services/skills';

interface Props {
  onSend: (message: string, attachmentIds: string[], opts: { toolMode: 'off' | 'auto' | 'always'; skillId: string | null }) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  model: string;
  availableModels: string[];
  providerModels?: ProviderModel[];
  catalog?: CatalogModel[];
  skills?: Skill[];
  onModelChange: (model: string, providerId?: string | null) => void;
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

function CapabilityBadges({ entry }: { entry: CatalogModel }) {
  return (
    <span className="flex items-center gap-1 ml-1 flex-shrink-0">
      {entry.vision_support && (
        <span title="Vision" className="text-blue-400"><Eye size={9} /></span>
      )}
      {entry.reasoning_support && (
        <span title="Reasoning" className="text-purple-400"><Brain size={9} /></span>
      )}
      {entry.speed_score !== null && entry.speed_score >= 8 && (
        <span title="Fast" className="text-yellow-400"><Zap size={9} /></span>
      )}
      {entry.context_window !== null && entry.context_window >= 100_000 && (
        <span className="text-[9px] text-emerald-400 font-medium leading-none">
          {entry.context_window >= 1_000_000 ? '1M' : `${Math.round(entry.context_window / 1000)}k`}
        </span>
      )}
    </span>
  );
}

function ModelPicker({
  model,
  availableModels,
  providerModels,
  catalog,
  onChange,
}: {
  model: string;
  availableModels: string[];
  providerModels?: ProviderModel[];
  catalog?: CatalogModel[];
  onChange: (m: string, providerId?: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen((o) => !o);
  };

  // Group by provider when providerModels is populated
  const hasProviders = providerModels && providerModels.length > 0;

  // Build grouped structure
  const groups: { provider_id: string; provider_name: string; models: string[] }[] = [];
  if (hasProviders) {
    const seen = new Map<string, number>();
    for (const pm of providerModels!) {
      if (!seen.has(pm.provider_id)) {
        seen.set(pm.provider_id, groups.length);
        groups.push({ provider_id: pm.provider_id, provider_name: pm.provider_name, models: [] });
      }
      groups[seen.get(pm.provider_id)!].models.push(pm.model);
    }
  }

  const flatModels = !hasProviders ? (availableModels.length > 0 ? availableModels : model ? [model] : []) : [];
  const isEmpty = hasProviders ? groups.length === 0 : flatModels.length === 0;

  return (
    <div ref={ref} className="relative">
      <button type="button" onMouseDown={handleMouseDown}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded-md px-1.5 py-1 hover:bg-zinc-700">
        <span className="max-w-[140px] truncate">{model || 'Select model'}</span>
        <ChevronDown size={11} className={clsx('transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 w-72 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {isEmpty ? (
              <p className="text-zinc-500 text-xs px-3 py-3">No models — open Settings → Providers to add one.</p>
            ) : hasProviders ? (
              <div className="max-h-64 overflow-y-auto py-1">
                {groups.map((g) => (
                  <div key={g.provider_id}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{g.provider_name}</p>
                    {g.models.map((m) => {
                      const meta = catalog?.find((c) => c.provider_id === g.provider_id && c.model_id === m);
                      return (
                        <button key={`${g.provider_id}:${m}`} type="button"
                          onMouseDown={(e) => { e.preventDefault(); onChange(m, g.provider_id); setOpen(false); }}
                          className={clsx('w-full text-left px-3 py-1.5 text-sm transition-colors pl-4 flex items-center gap-1',
                            m === model ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}>
                          <span className="truncate flex-1">{m}</span>
                          {meta && <CapabilityBadges entry={meta} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {flatModels.map((m) => (
                  <button key={m} type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(m, null); setOpen(false); }}
                    className={clsx('w-full text-left px-3 py-2 text-sm transition-colors',
                      m === model ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}>
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

export function ChatInput({ onSend, onStop, isStreaming, disabled, model, availableModels, providerModels, catalog, skills, onModelChange }: Props) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  // Tools default to "auto": the model calls tools when it judges them helpful,
  // without the user having to opt in each message.
  const [toolMode, setToolMode] = useState<'off' | 'auto' | 'always'>('auto');
  const [toolOpen, setToolOpen] = useState(false);
  const [skillId, setSkillId] = useState<string>('');
  const [skillOpen, setSkillOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const msg = value.trim();
    if ((!msg && attachments.length === 0) || isStreaming) return;
    const ids = attachments.map((a) => a.id);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(msg || '(see attachment)', ids, { toolMode, skillId: skillId || null });
  };

  const activeSkill = skills?.find((s) => s.id === skillId);

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
            <ModelPicker model={model} availableModels={availableModels} providerModels={providerModels} catalog={catalog} onChange={onModelChange} />

            {/* Tools mode picker: Off / Auto / Always */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setToolOpen((o) => !o); }}
                title="Control whether the assistant can use tools (MCP servers + built-ins)"
                className={clsx('flex items-center gap-1 text-xs rounded-md px-1.5 py-1 transition-colors',
                  toolMode === 'off' ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'bg-amber-950/40 text-amber-300')}
              >
                <Wrench size={12} />
                Tools{toolMode === 'off' ? '' : toolMode === 'auto' ? ': Auto' : ': Always'}
              </button>
              {toolOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setToolOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 w-52 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 py-1">
                    {([
                      { v: 'auto', label: 'Auto', desc: 'Use tools when helpful' },
                      { v: 'always', label: 'Always', desc: 'Force a tool call first' },
                      { v: 'off', label: 'Off', desc: 'Never use tools' },
                    ] as const).map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setToolMode(o.v); setToolOpen(false); }}
                        className={clsx('w-full text-left px-3 py-1.5 text-sm flex flex-col',
                          toolMode === o.v ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}
                      >
                        <span className="font-medium">{o.label}</span>
                        <span className="text-[10px] text-zinc-500">{o.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Skill picker */}
            {skills && skills.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setSkillOpen((o) => !o); }}
                  title="Apply a skill"
                  className={clsx('flex items-center gap-1 text-xs rounded-md px-1.5 py-1 transition-colors',
                    activeSkill ? 'bg-purple-950/40 text-purple-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700')}
                >
                  <Sparkles size={12} />
                  <span className="max-w-[110px] truncate">{activeSkill ? activeSkill.name : 'Skill'}</span>
                </button>
                {skillOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSkillOpen(false)} />
                    <div className="absolute bottom-full left-0 mb-1 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto py-1">
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); setSkillId(''); setSkillOpen(false); }}
                        className={clsx('w-full text-left px-3 py-1.5 text-sm', !skillId ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}>
                        No skill
                      </button>
                      {skills.map((s) => (
                        <button key={s.id} type="button"
                          onMouseDown={(e) => { e.preventDefault(); setSkillId(s.id); setSkillOpen(false); }}
                          className={clsx('w-full text-left px-3 py-1.5 text-sm flex items-center gap-1.5',
                            s.id === skillId ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}>
                          <Sparkles size={11} className="text-purple-400 flex-shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
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
