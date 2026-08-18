import axios from 'axios';
import { ApiResponse, User, Email, Sender, ScheduleEmailPayload, ScheduleEmailResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AuthConfig {
  googleEnabled: boolean;
  devLoginEnabled: boolean;
}

export const authApi = {
  getConfig: async (): Promise<ApiResponse<AuthConfig>> => {
    const { data } = await axios.get('/auth/config', { withCredentials: true });
    return data;
  },

  devLogin: async (): Promise<ApiResponse<User>> => {
    const { data } = await axios.post('/auth/dev-login', {}, { withCredentials: true });
    return data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const { data } = await axios.get('/auth/me', { withCredentials: true });
    return data;
  },

  logout: async (): Promise<ApiResponse> => {
    const { data } = await axios.post('/auth/logout', {}, { withCredentials: true });
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
};

export const senderApi = {
  getAll: async (): Promise<ApiResponse<Sender[]>> => {
    const { data } = await api.get('/senders');
    return data;
  },
};
