import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import clsx from 'clsx';
import { resendVerification, verifyEmail } from '../services/auth';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, username: string, password: string) => Promise<string>;
}

export function LoginPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify_token');
    if (!token) return;
    setLoading(true);
    verifyEmail(token)
      .then((message) => { setNotice(message); setMode('login'); })
      .catch((err: unknown) => {
        setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Unable to verify this email link.');
      })
      .finally(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        setNotice(await onRegister(email, username, password));
        setMode('login');
        setPassword('');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (err as { message?: string })?.message ?? 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <Bot size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">OpenAgent Hub</h1>
          <p className="text-zinc-500 text-sm mt-1">Your unified AI workspace</p>
        </div>

        <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 mb-5">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={clsx(
                'flex-1 py-2 text-sm rounded-lg font-medium transition-colors',
                mode === m ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className={inputClass}
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {notice && <p className="text-emerald-400 text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        {mode === 'login' && (
          <button
            type="button"
            onClick={async () => {
              if (!email) { setError('Enter your email address first.'); return; }
              setLoading(true); setError('');
              try { setNotice(await resendVerification(email)); } catch { setError('Unable to resend verification email.'); }
              finally { setLoading(false); }
            }}
            disabled={loading}
            className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          >
            Resend verification email
          </button>
        )}
      </div>
    </div>
  );
}
