import api from './api';

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  tool_names: string[] | null;
  is_builtin: boolean;
}

export async function listSkills(): Promise<Skill[]> {
  const { data } = await api.get('/skills');
  return data;
}

export async function createSkill(payload: {
  name: string;
  description?: string;
  instructions: string;
  tool_names?: string[];
}): Promise<Skill> {
  const { data } = await api.post('/skills', payload);
  return data;
}

export async function updateSkill(id: string, payload: Partial<Skill>): Promise<Skill> {
  const { data } = await api.patch(`/skills/${id}`, payload);
  return data;
}

export async function deleteSkill(id: string): Promise<void> {
  await api.delete(`/skills/${id}`);
}

export async function importSkill(skill_md: string): Promise<Skill> {
  const { data } = await api.post('/skills/import', { skill_md });
  return data;
}

export async function downloadSkill(id: string, name: string): Promise<void> {
  const { data } = await api.get(`/skills/${id}/export`, { responseType: 'blob' });
  const href = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${name}-SKILL.md`;
  link.click();
  URL.revokeObjectURL(href);
}
