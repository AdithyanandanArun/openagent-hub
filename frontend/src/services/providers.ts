import api from './api';

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  enabled: boolean;
  priority: number;
  status: 'healthy' | 'error' | 'unknown' | 'rate_limited';
  last_checked_at: string | null;
}

export interface ProviderTestResult {
  status: string;
  latency_ms: number;
  models: string[];
  error?: string;
}

export async function listProviders(): Promise<Provider[]> {
  const { data } = await api.get('/providers');
  return data;
}

export async function createProvider(data: {
  name: string;
  base_url: string;
  api_key: string;
  priority?: number;
}): Promise<Provider> {
  const { data: res } = await api.post('/providers', data);
  return res;
}

export async function updateProvider(
  id: string,
  data: Partial<{ name: string; base_url: string; api_key: string; enabled: boolean; priority: number }>
): Promise<Provider> {
  const { data: res } = await api.put(`/providers/${id}`, data);
  return res;
}

export async function deleteProvider(id: string): Promise<void> {
  await api.delete(`/providers/${id}`);
}

export async function testProvider(id: string): Promise<ProviderTestResult> {
  const { data } = await api.post(`/providers/${id}/test`);
  return data;
}

export async function fetchProviderModels(id: string): Promise<string[]> {
  const { data } = await api.get(`/providers/${id}/models`);
  return data.models;
}
