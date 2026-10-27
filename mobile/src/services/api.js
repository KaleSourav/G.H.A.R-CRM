import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const API_BASE = 'https://g-h-a-r-crm.onrender.com/api';

// ── Global Real-Time Mutation Event Bus ────────────────────────────────────
const mutationListeners = new Set();

export function onDataMutation(callback) {
  mutationListeners.add(callback);
  return () => {
    mutationListeners.delete(callback);
  };
}

export function notifyDataMutation(event = {}) {
  mutationListeners.forEach(cb => {
    try {
      cb(event);
    } catch (err) {
      console.warn('[DataMutation] listener error:', err.message);
    }
  });
}

// ── Hook: Automatically re-executes callback whenever ANY mutation occurs ──
export function useAutoRefresh(callback, debounceMs = 250) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const timeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onDataMutation((evt) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (typeof cbRef.current === 'function') {
          cbRef.current(evt);
        }
      }, debounceMs);
    });
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, [debounceMs]);
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function request(method, path, body = null, params = null) {
  const headers = await getAuthHeaders();
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (res.status === 401) {
    await supabase.auth.signOut();
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || 'Request failed');

  // Automatically broadcast mutation on any create/update/delete/reassign/activity
  if (method !== 'GET') {
    notifyDataMutation({ method, path, timestamp: Date.now() });
  }

  return json;
}

// ── Leads ─────────────────────────────────────────────────────────────────
export const leadsAPI = {
  list: (params) => request('GET', '/leads', null, params),
  get: (id) => request('GET', `/leads/${id}`),
  create: (data) => request('POST', '/leads', data),
  update: (id, data) => request('PUT', `/leads/${id}`, data),
  delete: (id) => request('DELETE', `/leads/${id}`),
  reassign: (id, toUserId) => request('POST', `/leads/${id}/reassign`, { to_user_id: toUserId }),
  addActivity: (id, data) => request('POST', `/leads/${id}/activity`, data),
  getAssignedStats: () => request('GET', '/leads/assigned-stats'),
  bulk: (action, leadIds, payload) => request('POST', '/leads/bulk', { action, lead_ids: leadIds, payload }),
};

// ── Tasks ─────────────────────────────────────────────────────────────────
export const tasksAPI = {
  list: (params) => request('GET', '/tasks', null, params),
  create: (data) => request('POST', '/tasks', data),
  update: (id, data) => request('PUT', `/tasks/${id}`, data),
  delete: (id) => request('DELETE', `/tasks/${id}`),
};

// ── Projects ──────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: (params) => request('GET', '/projects', null, params),
  get: (id) => request('GET', `/projects/${id}`),
  create: (data) => request('POST', '/projects', data),
  update: (id, data) => request('PUT', `/projects/${id}`, data),
  getUnits: (projectId, params) => request('GET', `/projects/${projectId}/units`, null, params),
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => request('GET', '/dashboard'),
};

// ── Team ──────────────────────────────────────────────────────────────────
export const teamAPI = {
  list: () => request('GET', '/team'),
  create: (data) => request('POST', '/team', data),
  update: (id, data) => request('PUT', `/team/${id}`, data),
  delete: (id) => request('DELETE', `/team/${id}`),
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  me: () => request('GET', '/auth/me'),
  notifications: () => request('GET', '/auth/notifications'),
  readAllNotifications: () => request('PUT', '/auth/notifications/read-all'),
  readNotification: (id) => request('PUT', `/auth/notifications/${id}/read`),
  orgSettings: () => request('GET', '/auth/org/settings'),
};
