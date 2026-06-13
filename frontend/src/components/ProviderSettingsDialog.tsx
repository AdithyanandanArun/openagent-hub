import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { ProviderSettings } from "../types/provider";

interface ProviderSettingsDialogProps {
  isOpen: boolean;
  settings: ProviderSettings;
  isConfigured: boolean;
  isRefreshing: boolean;
  onClose: () => void;
  onSave: (settings: ProviderSettings) => void;
  onClear: () => void;
  onRefreshModels: (settings: ProviderSettings) => Promise<void>;
}

export default function ProviderSettingsDialog({
  isOpen,
  settings,
  isConfigured,
  isRefreshing,
  onClose,
  onSave,
  onClear,
  onRefreshModels,
}: ProviderSettingsDialogProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.apiKey);
      setBaseUrl(settings.baseUrl);
      setError(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiKey.trim() || !baseUrl.trim()) {
      setError("Add both an API key and a base URL.");
      return;
    }
    onSave({ apiKey, baseUrl });
    setError(null);
  }

  async function saveAndRefresh() {
    if (!apiKey.trim() || !baseUrl.trim()) {
      setError("Add both an API key and a base URL.");
      return;
    }
    const nextSettings = { apiKey, baseUrl };
    onSave(nextSettings);
    setError(null);
    await onRefreshModels(nextSettings);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="provider-settings-title">
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-ink-900 p-5 shadow-glow">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-mint-400 text-ink-950">
              <KeyRound size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 id="provider-settings-title" className="text-lg font-semibold text-white">
                Provider settings
              </h2>
              <p className="text-sm text-slate-400">Stored in this browser and sent per request.</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close provider settings"
            title="Close"
            className="grid h-11 w-11 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="provider-base-url" className="mb-2 block text-sm font-medium text-slate-200">
              Base URL
            </label>
            <input
              id="provider-base-url"
              type="url"
              required
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="h-12 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-base text-slate-100 outline-none transition focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20"
            />
          </div>

          <div>
            <label htmlFor="provider-api-key" className="mb-2 block text-sm font-medium text-slate-200">
              API key
            </label>
            <div className="flex gap-2">
              <input
                id="provider-api-key"
                type={showKey ? "text" : "password"}
                required
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-md border border-white/10 bg-ink-950 px-3 text-base text-slate-100 outline-none transition focus:border-mint-300 focus:ring-2 focus:ring-mint-300/20"
              />
              <button
                type="button"
                aria-label={showKey ? "Hide API key" : "Show API key"}
                title={showKey ? "Hide API key" : "Show API key"}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-coral-400/30 bg-coral-500/10 px-3 py-2 text-sm text-coral-400">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="submit"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-mint-400 px-4 text-sm font-semibold text-ink-950 transition hover:bg-mint-300"
            >
              <Save size={17} aria-hidden="true" />
              Save
            </button>
            <button
              type="button"
              disabled={isRefreshing}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void saveAndRefresh()}
            >
              {isRefreshing ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              Fetch models
            </button>
            <button
              type="button"
              disabled={!isConfigured}
              className="grid h-11 w-full place-items-center rounded-md border border-coral-400/30 text-coral-400 transition hover:bg-coral-500/10 disabled:cursor-not-allowed disabled:opacity-40 sm:w-11"
              aria-label="Clear provider settings"
              title="Clear provider settings"
              onClick={onClear}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
