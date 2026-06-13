import { useCallback, useMemo, useState } from "react";
import type { ProviderSettings } from "../types/provider";

const SETTINGS_KEY = "ai-chat-provider-settings";
const DEFAULT_BASE_URL = import.meta.env.VITE_PROVIDER_BASE_URL ?? "https://api.openai.com/v1";

export function useProviderSettings() {
  const [settings, setSettingsState] = useState<ProviderSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored) as ProviderSettings;
    }
    return { apiKey: "", baseUrl: DEFAULT_BASE_URL };
  });

  const setSettings = useCallback((nextSettings: ProviderSettings) => {
    const cleaned = {
      apiKey: nextSettings.apiKey.trim(),
      baseUrl: nextSettings.baseUrl.trim().replace(/\/+$/, ""),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleaned));
    setSettingsState(cleaned);
  }, []);

  const clearSettings = useCallback(() => {
    const cleaned = { apiKey: "", baseUrl: DEFAULT_BASE_URL };
    localStorage.removeItem(SETTINGS_KEY);
    setSettingsState(cleaned);
  }, []);

  return useMemo(
    () => ({
      settings,
      setSettings,
      clearSettings,
      isConfigured: Boolean(settings.apiKey && settings.baseUrl),
    }),
    [clearSettings, setSettings, settings]
  );
}
