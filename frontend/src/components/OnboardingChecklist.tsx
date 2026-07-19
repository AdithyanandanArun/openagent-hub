import { CheckCircle2, Circle, Settings, X } from 'lucide-react';

interface Props {
  hasProvider: boolean;
  hasProject: boolean;
  hasEmbeddingProvider: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

function Item({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-zinc-400">
      {complete ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" /> : <Circle size={14} className="text-zinc-600 flex-shrink-0" />}
      <span className={complete ? 'text-zinc-500 line-through' : ''}>{children}</span>
    </li>
  );
}

export function OnboardingChecklist({ hasProvider, hasProject, hasEmbeddingProvider, onOpenSettings, onDismiss }: Props) {
  const completed = [hasProvider, hasProject, hasEmbeddingProvider].filter(Boolean).length;
  return (
    <aside className="mx-3 mt-3 rounded-xl border border-cyan-900/60 bg-cyan-950/20 px-3 py-3 sm:mx-5 sm:px-4" aria-label="Getting started checklist">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-cyan-100">Set up your developer workspace</p>
            <span className="text-[11px] text-cyan-300/80">{completed}/3</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            <Item complete={hasProvider}>Add a chat provider and model</Item>
            <Item complete={hasProject}>Create a project for your work</Item>
            <Item complete={hasEmbeddingProvider}>Choose an embedding provider for future knowledge search</Item>
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={onOpenSettings} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-200 px-2.5 py-1.5 text-xs font-medium text-cyan-950 hover:bg-cyan-100">
              <Settings size={13} /> Open settings
            </button>
            <button onClick={onDismiss} className="text-xs text-zinc-400 hover:text-zinc-200">Skip for now</button>
          </div>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss setup checklist" className="p-1 text-zinc-500 hover:text-zinc-200"><X size={14} /></button>
      </div>
    </aside>
  );
}
