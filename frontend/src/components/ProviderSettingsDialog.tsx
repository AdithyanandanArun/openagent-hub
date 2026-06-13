import { useState, useEffect } from 'react';
import { X, RefreshCw, Save, Sun, Moon, LogOut, User as UserIcon, Cpu, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { ProviderConfig } from '../services/chat';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  config: ProviderConfig | null;
  onSave: (config: Partial<ProviderConfig>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
  onClose: () => void;
  username?: string;
  email?: string;
  onLogout?: () => void;
}

type Tab = 'general' | 'api' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings2 size={15} /> },
  { id: 'api', label: 'API', icon: <Cpu size={15} /> },
  { id: 'account', label: 'Account', icon: <UserIcon size={15} /> },
];

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
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiTab({
  config,
  onSave,
  onFetchModels,
}: {
  config: ProviderConfig | null;
  onSave: (config: Partial<ProviderConfig>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
}) {
  const [form, setForm] = useState({
    base_url: 'http://host.docker.internal:3001/v1',
    api_key: '',
    model: '',
  });
  const [models, setModels] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (config) setForm({ base_url: config.base_url, api_key: config.api_key, model: config.model });
  }, [config]);

  const handleFetch = async () => {
    setFetching(true);
    setStatus('');
    try {
      const m = await onFetchModels();
      setModels(m);
      setStatus(`Found ${m.length} model(s)`);
    } catch {
      setStatus('Failed to reach provider. Check base URL and API key.');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
      await onSave(form);
      setStatus('Saved!');
    } catch {
      setStatus('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
        <input
          type="text"
          value={form.base_url}
          onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="http://host.docker.internal:3001/v1"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
        <input
          type="password"
          value={form.api_key}
          onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="your-api-key (can be empty for local)"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
            placeholder="model-name"
            list="model-suggestions"
          />
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
            Fetch models
          </button>
        </div>
        {models.length > 0 && (
          <datalist id="model-suggestions">
            {models.map((m) => <option key={m} value={m} />)}
          </datalist>
        )}
        {models.length > 0 && (
          <p className="text-xs text-zinc-500 mt-1.5">
            {models.length} model(s) available — type above to filter or pick from the list.
          </p>
        )}
      </div>

      {status && (
        <p className={`text-xs ${status.startsWith('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
          {status}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !form.base_url || !form.model}
        className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={13} />
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function AccountTab({
  username,
  email,
  onLogout,
}: {
  username?: string;
  email?: string;
  onLogout?: () => void;
}) {
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
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-transparent hover:border-red-900/50 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function ProviderSettingsDialog({ config, onSave, onFetchModels, onClose, username, email, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl shadow-2xl flex overflow-hidden"
        style={{ height: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-zinc-950/60 border-r border-zinc-800 flex flex-col p-3 flex-shrink-0">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2 py-2 mb-1">Settings</p>
          <nav className="flex flex-col gap-0.5 flex-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors w-full',
                  activeTab === tab.id
                    ? 'bg-zinc-700/70 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Tab body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'api' && (
              <ApiTab config={config} onSave={onSave} onFetchModels={onFetchModels} />
            )}
            {activeTab === 'account' && (
              <AccountTab username={username} email={email} onLogout={onLogout} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
