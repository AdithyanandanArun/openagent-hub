import { useState, useEffect } from 'react';
import { X, RefreshCw, Save } from 'lucide-react';
import { ProviderConfig } from '../services/chat';

interface Props {
  config: ProviderConfig | null;
  onSave: (config: Partial<ProviderConfig>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
  onClose: () => void;
}

export function ProviderSettingsDialog({ config, onSave, onFetchModels, onClose }: Props) {
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
      setTimeout(onClose, 800);
    } catch {
      setStatus('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Provider Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
            <input
              type="text"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="http://host.docker.internal:3001/v1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
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
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="model-name"
                list="model-suggestions"
              />
              <button
                onClick={handleFetch}
                disabled={fetching}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={fetching ? 'animate-spin' : ''} />
                Fetch
              </button>
            </div>
            {models.length > 0 && (
              <datalist id="model-suggestions">
                {models.map((m) => <option key={m} value={m} />)}
              </datalist>
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
            className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
