import { useEffect, useState } from 'react';
import { Brain, CheckCircle2, Save } from 'lucide-react';

import { useProviders } from '../../hooks/useProviders';
import { getPreferences, updatePreferences, WorkspacePreferences } from '../../services/preferences';

export function KnowledgeTab() {
  const { providers } = useProviders();
  const [preferences, setPreferences] = useState<WorkspacePreferences | null>(null);
  const [providerId, setProviderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPreferences().then((value) => {
      setPreferences(value);
      setProviderId(value.embedding_provider_id ?? '');
    }).catch(() => {});
  }, []);

  const enabledProviders = providers.filter((provider) => provider.enabled);
  const save = async () => {
    if (!providerId) return;
    setSaving(true);
    setSaved(false);
    try {
      const value = await updatePreferences({ embedding_provider_id: providerId, embedding_model: 'auto' });
      setPreferences(value);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-3.5">
        <div className="flex gap-2.5">
          <Brain size={17} className="mt-0.5 text-violet-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">Knowledge embedding routing</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Choose a preferred provider. OpenAgent automatically picks its best discovered embedding model, then falls back to healthy embedding models from your other enabled providers if it is unavailable or rate-limited.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-300">Preferred provider</label>
        <select value={providerId} onChange={(event) => { setProviderId(event.target.value); setSaved(false); }} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500">
          <option value="">Choose an enabled provider</option>
          {enabledProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
        </select>
        {enabledProviders.length === 0 && <p className="text-xs text-amber-400">Add and enable a provider first.</p>}
      </div>

      <button onClick={save} disabled={!providerId || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-50">
        {saved ? <CheckCircle2 size={14} /> : <Save size={14} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save knowledge provider'}
      </button>
      {preferences?.embedding_provider_id && <p className="text-[11px] text-emerald-400">Automatic private knowledge routing is configured.</p>}
    </div>
  );
}
