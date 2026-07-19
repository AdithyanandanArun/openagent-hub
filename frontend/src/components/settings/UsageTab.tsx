import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getUsage, Usage } from '../../services/auth';

function Meter({ label, used, limit, resetAt }: { label: string; used: number; limit: number; resetAt: string | null }) {
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const reset = resetAt ? new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'when you next send a message';
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-400">{used} / {limit}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-700">
        <div className={`h-full rounded-full transition-all ${percentage >= 90 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">Resets {reset}.</p>
    </div>
  );
}

export function UsageTab() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setUsage(await getUsage()); }
    catch { setError('Unable to load current limits. Try again shortly.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white">Your beta usage</h3>
          <p className="mt-1 text-xs text-zinc-500">Limits keep the shared beta responsive for everyone.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} title="Refresh usage"
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {error && <p className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300">{error}</p>}
      {usage && <div className="space-y-3">
        <Meter label="Messages this minute" used={usage.chat_requests_this_minute} limit={usage.chat_requests_per_minute_limit} resetAt={usage.minute_reset_at} />
        {usage.chat_requests_per_day_limit > 0 ? (
          <Meter label="Messages today" used={usage.chat_requests_today} limit={usage.chat_requests_per_day_limit} resetAt={usage.day_reset_at} />
        ) : (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4">
            <p className="text-sm font-medium text-emerald-200">No daily message limit</p>
            <p className="mt-1 text-xs text-zinc-400">Use your own provider keys freely. The per-minute guard only protects the shared beta from accidental loops.</p>
          </div>
        )}
      </div>}
      {!usage && loading && <p className="text-sm text-zinc-500">Loading your usage…</p>}
    </div>
  );
}
