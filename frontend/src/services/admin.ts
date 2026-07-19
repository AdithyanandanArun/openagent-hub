import api from './api';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export async function listUsers(search = ''): Promise<AdminUser[]> {
  const { data } = await api.get('/admin/users', { params: search ? { search } : undefined });
  return data;
}

export async function setUserActive(id: string, isActive: boolean): Promise<AdminUser> {
  const { data } = await api.patch(`/admin/users/${id}/status`, { is_active: isActive });
  return data;
}
