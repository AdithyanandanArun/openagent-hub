import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  email_verified_at: string | null;
  is_admin?: boolean;
}

export interface Usage {
  chat_requests_this_minute: number;
  chat_requests_today: number;
  chat_requests_per_minute_limit: number;
  chat_requests_per_day_limit: number;
  minute_reset_at: string | null;
  day_reset_at: string | null;
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

export async function requestPasswordReset(email: string): Promise<string> {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data.message;
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data.message;
}

export async function deleteAccount(password: string): Promise<void> {
  await api.delete('/auth/me', { data: { password } });
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getUsage(): Promise<Usage> {
  const { data } = await api.get('/auth/usage');
  return data;
}
