import { useEffect, useState } from 'react';
import { Search, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { AdminUser, listUsers, setUserActive } from '../../services/admin';

export function AdminTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async (term = '') => {
    setLoading(true); setError('');
    try { setUsers(await listUsers(term)); }
    catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Unable to load accounts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); void load(search); };
  const toggle = async (user: AdminUser) => {
    const action = user.is_active ? 'disable' : 'enable';
    if (!confirm(`${action === 'disable' ? 'Disable' : 'Enable'} ${user.email}?`)) return;
    setWorking(user.id); setError('');
    try {
      const updated = await setUserActive(user.id, !user.is_active);
      setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Unable to update the account.');
    } finally { setWorking(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-cyan-300" /><h3 className="text-sm font-medium text-white">Beta account control</h3></div>
        <p className="mt-1 text-xs text-zinc-500">Disable abusive accounts without deleting their data. Administrator accounts cannot be disabled here.</p>
      </div>
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email or username"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-zinc-500" />
        </div>
        <button className="rounded-lg bg-zinc-700 px-3 text-sm text-zinc-100 hover:bg-zinc-600">Search</button>
      </form>
      {error && <p className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300">{error}</p>}
      {loading ? <p className="text-sm text-zinc-500">Loading accounts…</p> : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-3 last:border-0">
              <div className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm text-zinc-100">{user.username} {user.is_admin && <span className="text-xs text-cyan-300">admin</span>}</p><p className="truncate text-xs text-zinc-500">{user.email}</p></div>
              <button onClick={() => void toggle(user)} disabled={working === user.id || user.is_admin}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${user.is_active ? 'border-amber-900/70 text-amber-300 hover:bg-amber-950/30' : 'border-emerald-900/70 text-emerald-300 hover:bg-emerald-950/30'}`}>
                {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}{user.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
          {users.length === 0 && <p className="p-4 text-sm text-zinc-500">No accounts found.</p>}
        </div>
      )}
    </div>
  );
}
