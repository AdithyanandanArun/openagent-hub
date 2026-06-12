// hooks/useModels.ts
// Fetches available models from GET /models

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';

export interface ModelInfo {
  id:                  string;
  name:                string;
  provider:            string;
  contextWindow:       number;
  maxOutputTokens:     number;
  supportsStreaming:   boolean;
  inputPricePerMToken?:  number;
  outputPricePerMToken?: number;
}

export interface UseModelsReturn {
  models:    ModelInfo[];
  isLoading: boolean;
  error:     string | null;
  refetch:   () => void;
}

export function useModels(): UseModelsReturn {
  const [models,    setModels]    = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    authFetch('/models')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setModels(data.models ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load models');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = () => setTick((t) => t + 1);

  return { models, isLoading, error, refetch };
}
