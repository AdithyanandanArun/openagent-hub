import { useState, useEffect, useCallback } from 'react';
import {
  getProviderConfig,
  updateProviderConfig,
  fetchModels,
  ProviderConfig,
} from '../services/chat';

export function useProviderSettings() {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const c = await getProviderConfig();
      setConfig(c);
      return c;
    } catch {
      // no config yet
    }
  }, []);

  const loadModels = useCallback(async () => {
    setIsFetchingModels(true);
    try {
      const models = await fetchModels();
      setAvailableModels(models);
      return models;
    } finally {
      setIsFetchingModels(false);
    }
  }, []);

  useEffect(() => {
    // Loading the saved configuration is local and fast. Do not also call an
    // arbitrary provider's /models endpoint on every login: free providers can
    // be slow or rate-limited, and model discovery is available on demand.
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (data: Partial<ProviderConfig>) => {
    const updated = await updateProviderConfig(data);
    setConfig(updated);
    return updated;
  }, []);

  return { config, availableModels, isFetchingModels, saveConfig, loadModels, loadConfig };
}
