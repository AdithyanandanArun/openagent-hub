import { useState } from 'react';
import { Wrench, Check } from 'lucide-react';
import clsx from 'clsx';
import { AgentTool } from '../services/agents';

export type ToolMode = 'off' | 'auto' | 'always';

interface Props {
  mode: ToolMode;
  onMode: (m: ToolMode) => void;
  /** Selected tool names. Empty array = all tools available. */
  selected: string[];
  onSelected: (names: string[]) => void;
  tools: AgentTool[];
  /** Which way the dropdown opens. Chat input sits at the bottom (up); the agent
   *  composer sits at the top (down). */
  placement?: 'up' | 'down';
}

/** Friendly label for a tool name: "mcp__GitHub__create_issue" → "GitHub · create_issue". */
function prettyTool(name: string): string {
  if (name.startsWith('mcp__')) {
    const rest = name.slice(5);
    const i = rest.indexOf('__');
    if (i >= 0) return `${rest.slice(0, i)} · ${rest.slice(i + 2)}`;
  }
  return name;
}

const MODES: { v: ToolMode; label: string; desc: string }[] = [
  { v: 'auto', label: 'Auto', desc: 'Use tools when helpful' },
  { v: 'always', label: 'Always', desc: 'Force a tool call first' },
  { v: 'off', label: 'Off', desc: 'Never use tools' },
];

export function ToolPicker({ mode, onMode, selected, onSelected, tools, placement = 'up' }: Props) {
  const [open, setOpen] = useState(false);

  const toggleTool = (name: string) => {
    onSelected(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  };

  const label =
    mode === 'off'
      ? 'Tools'
      : `Tools: ${mode === 'auto' ? 'Auto' : 'Always'}${selected.length > 0 ? ` (${selected.length})` : ''}`;

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        title="Control whether the assistant uses tools, and which ones"
        className={clsx('flex items-center gap-1 text-xs rounded-md px-1.5 py-1 transition-colors',
          mode === 'off' ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'bg-amber-950/40 text-amber-300')}
      >
        <Wrench size={12} />
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={clsx('absolute left-0 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 py-1',
            placement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1')}>
            {/* Mode */}
            {MODES.map((o) => (
              <button
                key={o.v}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onMode(o.v); }}
                className={clsx('w-full text-left px-3 py-1.5 text-sm flex flex-col',
                  mode === o.v ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}
              >
                <span className="font-medium">{o.label}</span>
                <span className="text-[10px] text-zinc-500">{o.desc}</span>
              </button>
            ))}

            {/* Tool checklist */}
            {mode !== 'off' && tools.length > 0 && (
              <>
                <div className="my-1 border-t border-zinc-700/60" />
                <div className="flex items-center justify-between px-3 pt-1 pb-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Limit to</span>
                  {selected.length > 0 && (
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); onSelected([]); }}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200">Use all</button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {tools.map((t) => {
                    const checked = selected.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); toggleTool(t.name); }}
                        title={t.description || t.name}
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-zinc-300 hover:bg-zinc-700"
                      >
                        <span className={clsx('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                          checked ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-600')}>
                          {checked && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="truncate font-mono">{prettyTool(t.name)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600 px-3 pt-1 pb-0.5">
                  {selected.length === 0 ? 'No limit — all tools available.' : `Restricted to ${selected.length} tool(s).`}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
