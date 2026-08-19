import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  res => res,
  async (err) => {
    if (err.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Leads ──────────────────────────────────────────────────────────────────
export const leadsAPI = {
  list: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  reassign: (id, toUserId) => api.post(`/leads/${id}/reassign`, { to_user_id: toUserId }),
  addActivity: (id, data) => api.post(`/leads/${id}/activity`, data),
  importCSV: (formData) => api.post('/leads/import/csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  bulk: (action, leadIds, payload) => api.post('/leads/bulk', { action, lead_ids: leadIds, payload }),
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const tasksAPI = {
  list: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ── Projects ───────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  getUnits: (projectId, params) => api.get(`/projects/${projectId}/units`, { params }),
  createUnit: (projectId, data) => api.post(`/projects/${projectId}/units`, data),
  updateUnit: (projectId, unitId, data) => api.put(`/projects/${projectId}/units/${unitId}`, data),
};

// ── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// ── Team ───────────────────────────────────────────────────────────────────
export const teamAPI = {
  list: () => api.get('/team'),
  create: (data) => api.post('/team', data),
  update: (id, data) => api.put(`/team/${id}`, data),
  delete: (id) => api.delete(`/team/${id}`),
};

// ── Auth/Notifications ─────────────────────────────────────────────────────
export const authAPI = {
  me: () => api.get('/auth/me'),
  notifications: () => api.get('/auth/notifications'),
  readAllNotifications: () => api.put('/auth/notifications/read-all'),
  readNotification: (id) => api.put(`/auth/notifications/${id}/read`),
  orgSettings: () => api.get('/auth/org/settings'),
};

export default api;
