import { useEffect, useMemo, useState } from 'react';
import { Bot, Sparkles, Users, Send, Square, History, ChevronDown, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAgents } from '../hooks/useAgents';
import { useSkills } from '../hooks/useSkills';
import { getRun, AgentRunDetail } from '../services/agents';
import { ProviderModel } from '../hooks/useProviders';
import { CatalogModel } from '../services/catalog';
import { StepTimeline } from './StepTimeline';
import { MarkdownContent } from './MarkdownContent';
import { LiveStep } from '../hooks/useAgents';

interface Props {
  providerModels: ProviderModel[];
  fallbackModel: string;
  catalog?: CatalogModel[];
}

// Models agents need tool-calling. Prefer known tool-capable families and avoid
// variants that don't support tools (search/audio/realtime/image/embeddings…).
const PREFER_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude', 'gemini-2.0-flash', 'gemini', 'llama-3.3-70b', 'qwen-2.5', 'mistral'];
const EXCLUDE_FRAGMENTS = ['search', 'audio', 'realtime', 'tts', 'whisper', 'image', 'dall-e', 'embedding', 'moderation', 'vision-preview'];

function modelName(id: string): string {
  const i = id.lastIndexOf('/');
  return (i >= 0 ? id.slice(i + 1) : id).toLowerCase();
}

function pickDefaultModel(models: ProviderModel[]): { model: string; providerId: string | null } {
  const usable = models.filter((m) => !EXCLUDE_FRAGMENTS.some((f) => modelName(m.model).includes(f)));
  const pool = usable.length ? usable : models;
  // 1. exact name match against preferred list
  for (const frag of PREFER_MODELS) {
    const hit = pool.find((m) => modelName(m.model) === frag);
    if (hit) return { model: hit.model, providerId: hit.provider_id };
  }
  // 2. substring match against preferred list
  for (const frag of PREFER_MODELS) {
    const hit = pool.find((m) => modelName(m.model).includes(frag));
    if (hit) return { model: hit.model, providerId: hit.provider_id };
  }
  // 3. fall back to first usable model
  return { model: pool[0].model, providerId: pool[0].provider_id };
}

function statusColor(status: string) {
  if (status === 'completed') return 'text-emerald-400';
  if (status === 'failed') return 'text-red-400';
  if (status === 'running') return 'text-blue-400';
  return 'text-zinc-500';
}

export function AgentsView({ providerModels, fallbackModel, catalog }: Props) {
  const { runs, liveSteps, isRunning, runError, finalAnswer, start, stop, loadRuns, removeRun, clearAllRuns } = useAgents();
  const { skills } = useSkills();

  // Live provider models are the freshest source, but the live fetch can be slow
  // or fail; fall back to the DB-cached catalog (same source chat uses) so the
  // model list is never empty when providers exist.
  const effectiveModels: ProviderModel[] = useMemo(() => {
    if (providerModels.length > 0) return providerModels;
    if (catalog && catalog.length > 0) {
      return catalog
        .filter((c) => c.is_enabled)
        .map((c) => ({ provider_id: c.provider_id, provider_name: c.provider_name, model: c.model_id }));
    }
    return [];
  }, [providerModels, catalog]);

  const [goal, setGoal] = useState('');
  const [skillId, setSkillId] = useState<string>('');
  const [allowSub, setAllowSub] = useState(false);
  const [selected, setSelected] = useState<{ model: string; providerId: string | null }>({
    model: fallbackModel,
    providerId: null,
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [viewing, setViewing] = useState<AgentRunDetail | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    if (!selected.model && effectiveModels.length > 0) {
      setSelected(pickDefaultModel(effectiveModels));
    }
  }, [effectiveModels, selected.model]);

  const modelGroups = useMemo(() => {
    const groups: { provider_id: string; provider_name: string; models: string[] }[] = [];
    const seen = new Map<string, number>();
    for (const pm of effectiveModels) {
      if (!seen.has(pm.provider_id)) {
        seen.set(pm.provider_id, groups.length);
        groups.push({ provider_id: pm.provider_id, provider_name: pm.provider_name, models: [] });
      }
      groups[seen.get(pm.provider_id)!].models.push(pm.model);
    }
    return groups;
  }, [effectiveModels]);

  const handleRun = () => {
    const g = goal.trim();
    if (!g || isRunning) return;
    setViewing(null);
    start({
      goal: g,
      model: selected.model || null,
      provider_id: selected.providerId,
      skill_id: skillId || null,
      allow_subagents: allowSub,
    });
  };

  const openRun = async (id: string) => {
    try {
      const detail = await getRun(id);
      setViewing(detail);
    } catch { /* ignore */ }
  };

  // Convert a persisted run's steps into LiveStep shape for the timeline
  const viewingSteps: LiveStep[] = useMemo(() => {
    if (!viewing) return [];
    return viewing.steps.map((s) => ({
      type: s.type,
      content: s.content ?? undefined,
      tool: s.tool_name ?? undefined,
      input: s.tool_input ?? undefined,
      output: s.tool_output ?? undefined,
    }));
  }, [viewing]);

  const showingLive = !viewing;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Composer */}
        <div className="border-b border-zinc-800 px-6 py-4 bg-zinc-950">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Bot size={18} className="text-blue-400" />
              <h2 className="text-sm font-semibold">Agents</h2>
              <span className="text-xs text-zinc-600">Give a goal — the agent plans, uses tools, and reports back.</span>
            </div>

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun(); }}
              placeholder="e.g. Calculate the compound interest on $1000 at 5% for 3 years, then summarize the result."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none focus:border-zinc-500 transition-colors"
            />

            <div className="flex items-center gap-2 flex-wrap">
              {/* Skill selector */}
              <div className="relative">
                <select
                  value={skillId}
                  onChange={(e) => setSkillId(e.target.value)}
                  className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-7 py-1.5 text-xs text-zinc-300 outline-none focus:border-zinc-500 cursor-pointer"
                >
                  <option value="">No skill</option>
                  {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Sparkles size={12} className="absolute left-2 top-2 text-purple-400 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-2 top-2 text-zinc-500 pointer-events-none" />
              </div>

              {/* Model selector */}
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setModelOpen((o) => !o); }}
                  className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 transition-colors"
                >
                  <span className="max-w-[160px] truncate">{selected.model || 'Select model'}</span>
                  <ChevronDown size={11} className={clsx('transition-transform', modelOpen && 'rotate-180')} />
                </button>
                {modelOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-72 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto py-1">
                      {modelGroups.length === 0 ? (
                        <p className="text-zinc-500 text-xs px-3 py-3">No models — open Settings → Providers to add one.</p>
                      ) : modelGroups.map((g) => (
                        <div key={g.provider_id}>
                          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{g.provider_name}</p>
                          {g.models.map((m) => (
                            <button
                              key={`${g.provider_id}:${m}`}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setSelected({ model: m, providerId: g.provider_id }); setModelOpen(false); }}
                              className={clsx('w-full text-left px-4 py-1.5 text-sm transition-colors',
                                m === selected.model ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-700')}
                            >
                              <span className="truncate block">{m}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Multi-agent toggle */}
              <button
                type="button"
                onClick={() => setAllowSub((v) => !v)}
                className={clsx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors',
                  allowSub ? 'bg-pink-950/40 border-pink-800/60 text-pink-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200')}
                title="Allow the agent to spawn sub-agents for parallel subtasks"
              >
                <Users size={12} /> Multi-agent {allowSub ? 'on' : 'off'}
              </button>

              <div className="flex-1" />

              <button
                onClick={isRunning ? stop : handleRun}
                disabled={!isRunning && !goal.trim()}
                className={clsx('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                  isRunning ? 'bg-red-600 hover:bg-red-700 text-white'
                    : goal.trim() ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed')}
              >
                {isRunning ? <><Square size={13} /> Stop</> : <><Send size={13} /> Run</>}
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-3xl mx-auto">
            {viewing && (
              <div className="mb-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Viewing past run · <span className={statusColor(viewing.status)}>{viewing.status}</span></p>
                  <p className="text-sm text-zinc-300 truncate">{viewing.goal}</p>
                </div>
                <button onClick={() => setViewing(null)} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-800">
                  New run
                </button>
              </div>
            )}

            {runError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/50 text-red-300 text-sm">
                {runError}
              </div>
            )}

            {showingLive && liveSteps.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-600">
                <Bot size={36} className="mb-3" />
                <p className="text-sm">Describe a goal above and hit Run.</p>
                <p className="text-xs mt-1 text-zinc-700">The agent can do math, recall memory, call MCP tools, and spawn sub-agents.</p>
              </div>
            )}

            <StepTimeline
              steps={showingLive ? liveSteps : viewingSteps}
              running={showingLive && isRunning}
            />
          </div>
        </div>
      </div>

      {/* Run history */}
      <div className={clsx('border-l border-zinc-800 bg-zinc-900/40 flex flex-col transition-all', showHistory ? 'w-72' : 'w-0 overflow-hidden')}>
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <History size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Run history</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={loadRuns} className="text-xs text-zinc-500 hover:text-zinc-300">Refresh</button>
            {runs.length > 0 && (
              <button
                onClick={() => { if (confirm('Delete all run history? This cannot be undone.')) clearAllRuns(); }}
                className="text-xs text-zinc-500 hover:text-red-400"
                title="Clear all run history"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {runs.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-6">No runs yet</p>
          ) : runs.map((r) => (
            <div
              key={r.id}
              className={clsx('group relative w-full rounded-lg transition-colors',
                viewing?.id === r.id ? 'bg-zinc-700/60' : 'hover:bg-zinc-800')}
            >
              <button
                onClick={() => openRun(r.id)}
                className="w-full text-left px-3 py-2 pr-8"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={clsx('w-1.5 h-1.5 rounded-full', statusColor(r.status).replace('text-', 'bg-'))} />
                  <span className={clsx('text-[10px] uppercase tracking-wide', statusColor(r.status))}>{r.status}</span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-snug">{r.goal}</p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (viewing?.id === r.id) setViewing(null);
                  removeRun(r.id);
                }}
                className="absolute right-1.5 top-1.5 p-1 rounded-md text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-950/30 transition-all"
                title="Delete run"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowHistory((v) => !v)}
        className="absolute right-2 top-2 z-10 p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-zinc-200 lg:hidden"
        title="Toggle history"
      >
        <History size={14} />
      </button>
    </div>
  );
}
