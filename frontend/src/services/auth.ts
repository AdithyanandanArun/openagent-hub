import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  email_verified_at: string | null;
}

export async function login(email: string, password: string): Promise<string> {
  const { data } = await api.post('/auth/login', { email, password });
  return data.access_token;
}

export async function register(email: string, username: string, password: string): Promise<string> {
  const { data } = await api.post('/auth/register', { email, username, password });
  return data.message;
}

export async function verifyEmail(token: string): Promise<string> {
  const { data } = await api.post('/auth/verify-email', { token });
  return data.message;
}

export async function resendVerification(email: string): Promise<string> {
  const { data } = await api.post('/auth/resend-verification', { email });
  return data.message;
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/auth/me', { data: { password } });
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}
