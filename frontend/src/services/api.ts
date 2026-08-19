import axios from 'axios';
import { ApiResponse, User, Email, Sender, ScheduleEmailPayload, ScheduleEmailResponse, EmailHistoryResponse } from '../types';

const TOKEN_KEY = 'reachinbox_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API_BASE = 'https://reachinbox-backend-production-e3f2.up.railway.app';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.set('Authorization', `Bearer ${token}`);
  }
  return cfg;
});

export interface AuthConfig {
  googleEnabled: boolean;
  devLoginEnabled: boolean;
}

const AUTH_BASE = 'https://reachinbox-backend-production-e3f2.up.railway.app';

export const authApi = {
  getConfig: async (): Promise<ApiResponse<AuthConfig>> => {
    const { data } = await axios.get(`${AUTH_BASE}/auth/config`, { withCredentials: true });
    return data;
  },

  devLogin: async (): Promise<ApiResponse<User> & { token?: string }> => {
    const { data } = await axios.post(`${AUTH_BASE}/auth/dev-login`, {}, { withCredentials: true });
    return data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const { data } = await axios.get(`${AUTH_BASE}/auth/me`, {
      withCredentials: true,
      headers: { ...authHeaders() },
    });
    return data;
  },

  logout: async (): Promise<ApiResponse> => {
    const { data } = await axios.post(`${AUTH_BASE}/auth/logout`, {}, {
      withCredentials: true,
      headers: { ...authHeaders() },
    });
    return data;
  },
};

export const emailApi = {
  schedule: async (payload: ScheduleEmailPayload): Promise<ApiResponse<ScheduleEmailResponse>> => {
    const { data } = await api.post('/emails/schedule', payload);
    return data;
  },

  getScheduled: async (): Promise<ApiResponse<Email[]>> => {
    const { data } = await api.get('/emails/scheduled');
    return data;
  },

  getSent: async (): Promise<ApiResponse<Email[]>> => {
    const { data } = await api.get('/emails/sent');
    return data;
  },

  getById: async (id: string): Promise<ApiResponse<Email>> => {
    const { data } = await api.get(`/emails/${id}`);
    return data;
  },

  getHistory: async (): Promise<ApiResponse<EmailHistoryResponse>> => {
    const { data } = await api.get('/emails/history');
    return data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const { data } = await api.delete(`/emails/${id}`);
    return data;
  },

  clearHistory: async (): Promise<ApiResponse> => {
    const { data } = await api.delete('/emails/history/clear');
    return data;
  },

  retry: async (id: string): Promise<ApiResponse<Email>> => {
    const { data } = await api.post(`/emails/${id}/retry`);
    return data;
  },
};

export const senderApi = {
  getAll: async (): Promise<ApiResponse<Sender[]>> => {
    const { data } = await api.get('/senders');
    return data;
  },
};
