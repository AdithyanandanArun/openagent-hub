import { useState, useEffect } from 'react';
import {
  X, RefreshCw, Save, Sun, Moon, LogOut, User as UserIcon, Cpu, Settings2,
  Plus, Trash2, Zap, CheckCircle, AlertCircle, Circle, ChevronUp, ChevronDown, Eye, EyeOff,
  Brain, Sparkles, Terminal,
} from 'lucide-react';
import clsx from 'clsx';
import { ProviderConfig } from '../services/chat';
import { Provider, ProviderTestResult } from '../services/providers';
import { useTheme } from '../contexts/ThemeContext';
import { useProviders } from '../hooks/useProviders';
import { MemoryTab } from './settings/MemoryTab';
import { SkillsTab } from './settings/SkillsTab';
import { MCPTab } from './settings/MCPTab';

interface Props {
  config: ProviderConfig | null;
  onSave: (config: Partial<ProviderConfig>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
  onClose: () => void;
  username?: string;
  email?: string;
  onLogout?: () => void;
  onProvidersChange?: () => void;
}

type Tab = 'general' | 'providers' | 'memory' | 'skills' | 'mcp' | 'api' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings2 size={15} /> },
  { id: 'providers', label: 'Providers', icon: <Cpu size={15} /> },
  { id: 'memory', label: 'Memory', icon: <Brain size={15} /> },
  { id: 'skills', label: 'Skills', icon: <Sparkles size={15} /> },
  { id: 'mcp', label: 'MCP', icon: <Terminal size={15} /> },
  { id: 'api', label: 'Single API', icon: <Zap size={15} /> },
  { id: 'account', label: 'Account', icon: <UserIcon size={15} /> },
];

// ── General Tab ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const { theme, setTheme } = useTheme();
  const options: { label: string; icon: React.ReactNode; value: 'light' | 'dark' }[] = [
    { label: 'Light', icon: <Sun size={16} />, value: 'light' },
    { label: 'Dark', icon: <Moon size={16} />, value: 'dark' },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-1">Appearance</h3>
        <p className="text-xs text-zinc-500 mb-3">Choose how OpenAgent Hub looks to you.</p>
        <div className="flex gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-medium transition-colors',
                theme === opt.value
                  ? 'border-white text-white bg-zinc-700'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 bg-zinc-800'
              )}
            >
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Provider['status'] }) {
  if (status === 'healthy') return <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />;
  if (status === 'error') return <AlertCircle size={13} className="text-red-400 flex-shrink-0" />;
  if (status === 'rate_limited') return <AlertCircle size={13} className="text-yellow-400 flex-shrink-0" />;
  return <Circle size={13} className="text-zinc-500 flex-shrink-0" />;
}

// ── Add-provider form ─────────────────────────────────────────────────────────

const QUICK_ADD = [
  { name: 'Groq', base_url: 'https://api.groq.com/openai/v1' },
  { name: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1' },
  { name: 'Ollama (local)', base_url: 'http://localhost:11434/v1' },
  { name: 'Google AI Studio', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
];

function AddProviderForm({ onAdd, onCancel }: { onAdd: (d: { name: string; base_url: string; api_key: string }) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', base_url: '', api_key: '' });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleQuick = (q: typeof QUICK_ADD[number]) => setForm((f) => ({ ...f, name: q.name, base_url: q.base_url }));

  const handleAdd = async () => {
    if (!form.name || !form.base_url) return;
    setSaving(true);
    try { await onAdd(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
      <p className="text-xs font-medium text-zinc-300">Quick add</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ADD.map((q) => (
          <button key={q.name} onClick={() => handleQuick(q)}
            className="text-xs px-2 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors">
            {q.name}
          </button>
        ))}
      </div>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Provider name" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
      <input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })}
        placeholder="Base URL (e.g. https://api.groq.com/openai/v1)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
      <div className="relative">
        <input type={showKey ? 'text' : 'password'} value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          placeholder="API key (leave empty for local)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300">
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={saving || !form.name || !form.base_url}
          className="flex-1 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
          {saving ? 'Adding…' : 'Add provider'}
        </button>
        <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Single provider row ────────────────────────────────────────────────────────

function ProviderRow({
  provider,
  onToggle,
  onMoveUp,
  onMoveDown,
  onTest,
  onDelete,
  isFirst,
  isLast,
}: {
  provider: Provider;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTest: () => Promise<void>;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    try { await onTest(); } finally { setTesting(false); }
  };

  return (
    <div className={clsx('flex items-center gap-2 p-2.5 rounded-xl border transition-colors',
      provider.enabled ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/30 opacity-60')}>
      <StatusDot status={provider.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{provider.name}</p>
        <p className="text-xs text-zinc-500 truncate">{provider.base_url}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-colors"><ChevronUp size={12} /></button>
          <button onClick={onMoveDown} disabled={isLast} className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-20 transition-colors"><ChevronDown size={12} /></button>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          title="Test connection"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <Zap size={13} className={testing ? 'animate-pulse' : ''} />
        </button>
        <button onClick={onToggle} title={provider.enabled ? 'Disable' : 'Enable'}
          className={clsx('text-xs px-2 py-1 rounded-lg font-medium transition-colors',
            provider.enabled ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700')}>
          {provider.enabled ? 'On' : 'Off'}
        </button>
        <button onClick={onDelete} title="Delete" className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Providers Tab ─────────────────────────────────────────────────────────────

function ProvidersTab({ onProvidersChange }: { onProvidersChange?: () => void }) {
  const { providers, addProvider, editProvider, removeProvider, runTest } = useProviders();
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async (data: { name: string; base_url: string; api_key: string }) => {
    await addProvider({ ...data, priority: providers.length });
    setShowAdd(false);
    onProvidersChange?.();
  };

  const handleToggle = async (p: Provider) => {
    await editProvider(p.id, { enabled: !p.enabled });
    onProvidersChange?.();
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= providers.length) return;
    await Promise.all([
      editProvider(providers[index].id, { priority: providers[swapIndex].priority }),
      editProvider(providers[swapIndex].id, { priority: providers[index].priority }),
    ]);
  };

  const handleTest = async (p: Provider) => {
    await runTest(p.id);
    onProvidersChange?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-zinc-500">
          {providers.length === 0
            ? 'No providers yet. Add one to enable routing.'
            : `${providers.filter((p) => p.enabled).length} of ${providers.length} enabled — tried in order top→bottom.`}
        </p>
        <button onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors">
          <Plus size={12} />{showAdd ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showAdd && (
        <AddProviderForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {providers.length > 0 && (
        <div className="space-y-1.5">
          {providers.map((p, i) => (
            <ProviderRow
              key={p.id}
              provider={p}
              isFirst={i === 0}
              isLast={i === providers.length - 1}
              onToggle={() => handleToggle(p)}
              onMoveUp={() => handleMove(i, 'up')}
              onMoveDown={() => handleMove(i, 'down')}
              onTest={() => handleTest(p)}
              onDelete={() => removeProvider(p.id)}
            />
          ))}
        </div>
      )}

      {providers.length === 0 && !showAdd && (
        <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
          <Cpu size={28} />
          <p className="text-xs">Add a provider to get started</p>
        </div>
      )}
    </div>
  );
}

// ── API Tab (single config, kept for fallback) ────────────────────────────────

function ApiTab({
  config,
  onSave,
  onFetchModels,
}: {
  config: ProviderConfig | null;
  onSave: (config: Partial<ProviderConfig>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
}) {
  const [form, setForm] = useState({ base_url: 'http://host.docker.internal:3001/v1', api_key: '', model: '' });
  const [models, setModels] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (config) setForm({ base_url: config.base_url, api_key: config.api_key, model: config.model });
  }, [config]);

  const handleFetch = async () => {
    setFetching(true); setStatus('');
    try { const m = await onFetchModels(); setModels(m); setStatus(`Found ${m.length} model(s)`); }
    catch { setStatus('Failed to reach provider. Check base URL and API key.'); }
    finally { setFetching(false); }
  };

  const handleSave = async () => {
    setSaving(true); setStatus('');
    try { await onSave(form); setStatus('Saved!'); }
    catch { setStatus('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-zinc-500">Fallback single-provider config, used when no Providers are set up.</p>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
        <input type="text" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="http://host.docker.internal:3001/v1" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
        <input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="your-api-key (can be empty for local)" />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
        <div className="flex gap-2">
          <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
            placeholder="model-name" list="model-suggestions" />
          <button onClick={handleFetch} disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50 whitespace-nowrap">
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} /> Fetch models
          </button>
        </div>
        {models.length > 0 && <datalist id="model-suggestions">{models.map((m) => <option key={m} value={m} />)}</datalist>}
        {models.length > 0 && <p className="text-xs text-zinc-500 mt-1.5">{models.length} model(s) available — type above to filter.</p>}
      </div>
      {status && <p className={`text-xs ${status.startsWith('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{status}</p>}
      <button onClick={handleSave} disabled={saving || !form.base_url || !form.model}
        className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <Save size={13} />{saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// ── Account Tab ────────────────────────────────────────────────────────────────

function AccountTab({ username, email, onLogout }: { username?: string; email?: string; onLogout?: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl border border-zinc-700">
        <div className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
          {username ? username.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{username || '—'}</p>
          {email && <p className="text-xs text-zinc-500 truncate">{email}</p>}
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <button onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-transparent hover:border-red-900/50 transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

// ── Root dialog ────────────────────────────────────────────────────────────────

export function ProviderSettingsDialog({ config, onSave, onFetchModels, onClose, username, email, onLogout, onProvidersChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('providers');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl shadow-2xl flex overflow-hidden"
        style={{ height: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-zinc-950/60 border-r border-zinc-800 flex flex-col p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2 py-2 mb-1">Settings</p>
          <nav className="flex flex-col gap-0.5 flex-1">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors w-full',
                  activeTab === tab.id ? 'bg-zinc-700/70 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                )}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">{TABS.find((t) => t.id === activeTab)?.label}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"><X size={15} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'providers' && <ProvidersTab onProvidersChange={onProvidersChange} />}
            {activeTab === 'memory' && <MemoryTab />}
            {activeTab === 'skills' && <SkillsTab />}
            {activeTab === 'mcp' && <MCPTab />}
            {activeTab === 'api' && <ApiTab config={config} onSave={onSave} onFetchModels={onFetchModels} />}
            {activeTab === 'account' && <AccountTab username={username} email={email} onLogout={onLogout} />}
          </div>
        </div>
      </div>
    </div>
  );
}
