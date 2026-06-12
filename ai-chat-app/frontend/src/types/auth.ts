export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
