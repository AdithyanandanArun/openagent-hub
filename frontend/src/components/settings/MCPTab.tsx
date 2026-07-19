import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Link2, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useMCP } from '../../hooks/useMCP';
import { MCPServer } from '../../services/mcp';

function ConnectorRow({ server, syncing, onSync, onDelete, onToggle }: { server: MCPServer; syncing: boolean; onSync: () => void; onDelete: () => void; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const tools = server.tools_cache || [];
  return <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800/50">
    <div className="flex items-center gap-2 p-3">
      {server.status === 'healthy' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <AlertTriangle size={15} className="text-zinc-500" />}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{server.name}</p><p className="truncate text-[11px] text-zinc-500">{server.url}</p></div>
      <button onClick={() => setOpen((value) => !value)} className="text-xs text-zinc-400 hover:text-white">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
      <button onClick={onToggle} className={`rounded-lg px-2 py-1 text-[11px] ${server.enabled ? 'bg-emerald-950/50 text-emerald-300' : 'bg-zinc-700 text-zinc-400'}`}>{server.enabled ? 'On' : 'Off'}</button>
      <button onClick={onSync} disabled={syncing} title="Validate and refresh tools" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50">{syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}</button>
      <button onClick={onDelete} title="Remove connector" className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-950/30 hover:text-red-400"><Trash2 size={14} /></button>
    </div>
    {open && <div className="border-t border-zinc-700 bg-zinc-900/30 px-3 py-2.5 text-xs text-zinc-400">
      <p><span className="text-zinc-500">Auth:</span> {server.auth_type === 'oauth' ? 'OAuth token' : server.auth_type}</p>
      <p className="mt-1 flex items-center gap-1 text-amber-300"><ShieldCheck size={13} /> Write tools always require confirmation and do not auto-run.</p>
      <div className="mt-2 space-y-1">{tools.length ? tools.map((tool) => <p key={tool.name}><span className={server.read_only_tools?.includes(tool.name) ? 'text-emerald-400' : 'text-zinc-400'}>{tool.name}</span>{tool.description ? ` — ${tool.description}` : ''}</p>) : <p className="text-zinc-600">Sync to discover tools.</p>}</div>
    </div>}
  </div>;
}

export function MCPTab() {
  const { servers, syncingId, add, edit, remove, sync } = useMCP();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', auth_type: 'none' as 'none' | 'bearer' | 'header' | 'oauth', auth_value: '', auth_header_name: '', read_only_tools: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const server = await add({
        name: form.name.trim(), url: form.url.trim(), auth_type: form.auth_type,
        auth_value: form.auth_type === 'none' ? undefined : form.auth_value,
        auth_header_name: form.auth_type === 'header' ? form.auth_header_name : undefined,
        read_only_tools: form.read_only_tools.split(',').map((name) => name.trim()).filter(Boolean),
      });
      setAdding(false); setForm({ name: '', url: '', auth_type: 'none', auth_value: '', auth_header_name: '', read_only_tools: '' });
      await sync(server.id);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || 'Could not add this connector.');
    } finally { setSaving(false); }
  };

  return <div className="space-y-3">
    <div className="rounded-xl border border-amber-900/50 bg-amber-950/15 p-3 text-xs text-zinc-400"><p className="font-medium text-amber-200">Remote MCP only</p><p className="mt-1">Connect public HTTPS Streamable HTTP servers. OpenAgent never installs npm packages, runs local commands, or reaches localhost/private networks from the hosted beta.</p></div>
    <div className="flex items-center justify-between"><p className="text-xs text-zinc-500">Custom connectors are private to your account. The reviewed public catalogue is coming next.</p><button onClick={() => setAdding((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600"><Plus size={13} />{adding ? 'Cancel' : 'Add URL'}</button></div>
    {adding && <div className="space-y-2 rounded-xl border border-zinc-700 bg-zinc-800/50 p-3">
      <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Connector name" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
      <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://mcp.example.com/mcp" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500" />
      <select value={form.auth_type} onChange={(event) => setForm({ ...form, auth_type: event.target.value as typeof form.auth_type })} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"><option value="none">No authentication</option><option value="bearer">Bearer API key</option><option value="header">Custom header</option><option value="oauth">OAuth access token</option></select>
      {form.auth_type === 'header' && <input value={form.auth_header_name} onChange={(event) => setForm({ ...form, auth_header_name: event.target.value })} placeholder="Header name, e.g. X-API-Key" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />}
      {form.auth_type !== 'none' && <input type="password" value={form.auth_value} onChange={(event) => setForm({ ...form, auth_value: event.target.value })} placeholder="Credential (encrypted at rest)" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />}
      <input value={form.read_only_tools} onChange={(event) => setForm({ ...form, read_only_tools: event.target.value })} placeholder="Read-only tool names, comma-separated (optional)" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
      <p className="text-[11px] text-zinc-500">Only explicitly named read-only tools can run automatically. Leave blank to require confirmation for every tool.</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={submit} disabled={saving || !form.name.trim() || !form.url.trim() || (form.auth_type !== 'none' && !form.auth_value.trim())} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"><Link2 size={13} />{saving ? 'Connecting…' : 'Add and validate'}</button>
    </div>}
    <div className="space-y-2">{servers.map((server) => <ConnectorRow key={server.id} server={server} syncing={syncingId === server.id} onSync={() => sync(server.id)} onDelete={() => remove(server.id)} onToggle={() => edit(server.id, { enabled: !server.enabled })} />)}{servers.length === 0 && !adding && <p className="py-6 text-center text-xs text-zinc-600">No remote connectors yet.</p>}</div>
  </div>;
}
