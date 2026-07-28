/**
 * Webhooks API Service
 * ─────────────────────
 * CRUD for /api/services/webhooks/
 */

import client from './apiClient';

const BASE = '/api/services/webhooks';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiWebhook {
  id:             string;
  name:           string;
  url:            string;
  events:         string[];
  status:         'active' | 'inactive';
  signed:         boolean;   // true if a secret is stored on backend
  retries:        number;
  owner:          number | null;
  owner_username: string | null;
  created_at:     string;
  updated_at:     string;
}

export interface WebhookPayload {
  name:    string;
  url:     string;
  events:  string[];
  status?: 'active' | 'inactive';
  secret?: string;
  retries?: number;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const listWebhooks = (): Promise<ApiWebhook[]> =>
  client
    .get<{ count: number; results: ApiWebhook[] } | ApiWebhook[]>(`${BASE}/`)
    .then(r => {
      const data = r.data;
      return Array.isArray(data) ? data : (data as any).results ?? [];
    })
    .catch(() => []);

export const createWebhook = (payload: WebhookPayload): Promise<ApiWebhook | null> =>
  client
    .post<ApiWebhook>(`${BASE}/`, payload)
    .then(r => r.data)
    .catch(() => null);

export const updateWebhook = (
  id: string,
  payload: Partial<WebhookPayload>,
): Promise<ApiWebhook | null> =>
  client
    .patch<ApiWebhook>(`${BASE}/${id}/`, payload)
    .then(r => r.data)
    .catch(() => null);

export const deleteWebhook = (id: string): Promise<boolean> =>
  client
    .delete(`${BASE}/${id}/`)
    .then(() => true)
    .catch(() => false);
