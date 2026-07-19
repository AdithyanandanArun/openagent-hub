import { useState } from 'react';
import { CheckCircle2, ExternalLink, Send } from 'lucide-react';
import api from '../../services/api';

export function FeedbackTab() {
  const [category, setCategory] = useState<'feedback' | 'bug' | 'connector'>('feedback');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (message.trim().length < 3) return;
    setSending(true);
    setError(null);
    try {
      await api.post('/feedback', {
        category,
        message: message.trim(),
        include_diagnostics: includeDiagnostics,
        screen: window.location.pathname,
      });
      setSent(true);
      setMessage('');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-white">Help improve OpenAgent Hub</h3>
        <p className="mt-1 text-xs text-zinc-500">Report a bug, request a connector, or share feedback. You can also contribute publicly on GitHub.</p>
      </div>
      <div className="flex gap-2">
        {(['feedback', 'bug', 'connector'] as const).map((value) => <button key={value} onClick={() => setCategory(value)} className={`rounded-lg px-2.5 py-1.5 text-xs capitalize ${category === value ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>{value}</button>)}
      </div>
      <textarea value={message} onChange={(event) => { setMessage(event.target.value); setSent(false); }} rows={5} maxLength={4000} placeholder="What happened, what did you expect, and how can we reproduce it?" className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500" />
      <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-400"><input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} className="mt-0.5" /> Include metadata-only diagnostics (app version, page, and error status). Never include chat text, documents, or keys.</label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {sent && <p className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 size={14} /> Thanks — your feedback was saved.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={sending || message.trim().length < 3} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-50"><Send size={13} /> {sending ? 'Sending…' : 'Send feedback'}</button>
        <a href="https://github.com/AdithyanandanArun/openagent-hub/issues" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"><ExternalLink size={12} /> Open GitHub issues</a>
      </div>
    </div>
  );
}
