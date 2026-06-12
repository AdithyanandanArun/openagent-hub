import { FormEvent, useState } from "react";
import { Loader2, LogIn, Sparkles } from "lucide-react";
import type { AuthCredentials } from "../types/auth";

interface LoginPageProps {
  onLogin: (credentials: AuthCredentials) => Promise<void>;
  onRegister: (credentials: AuthCredentials) => Promise<void>;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const credentials = { email, password };
      if (mode === "login") {
        await onLogin(credentials);
      } else {
        await onRegister(credentials);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ink-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-ink-900 p-6 shadow-glow">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-mint-400 text-ink-950">
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Chat</h1>
            <p className="text-sm text-slate-400">Persistent, streaming conversations</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-md border border-white/10 bg-ink-950 p-1">
          <button
            type="button"
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white text-ink-950" : "text-slate-300 hover:bg-white/5"
            }`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded px-3 py-2 text-sm font-medium transition ${
              mode === "register" ? "bg-white text-ink-950" : "text-slate-300 hover:bg-white/5"
            }`}
            onClick={() => setMode("register")}
          >
            Create account
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-base text-slate-100 outline-none transition focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-base text-slate-100 outline-none transition focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-coral-400/30 bg-coral-500/10 px-3 py-2 text-sm text-coral-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-mint-400 px-4 font-semibold text-ink-950 transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
