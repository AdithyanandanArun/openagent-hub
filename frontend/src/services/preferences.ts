import api from './api';

export interface WorkspacePreferences {
  embedding_provider_id: string | null;
  embedding_model: string | null;
  onboarding_completed_at: string | null;
}

export async function getPreferences(): Promise<WorkspacePreferences> {
  const { data } = await api.get('/preferences');
  return data;
}

export async function updatePreferences(data: Partial<{
  embedding_provider_id: string | null;
  embedding_model: string | null;
  complete_onboarding: boolean;
}>): Promise<WorkspacePreferences> {
  const { data: response } = await api.patch('/preferences', data);
  return response;
}
