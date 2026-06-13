import { apiRequest } from "./api";
import type { AuthCredentials, AuthResponse } from "../types/auth";

export function login(credentials: AuthCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", null, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(credentials: AuthCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", null, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
