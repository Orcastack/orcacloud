// OrcaCloud – Marketing Workspace API Service
// Org-scoped endpoints for the full marketing workspace.
// Base: /api/enterprise/organizations/:orgId/marketing/

import axios from 'axios';
import { config } from '../config/environment';

// ── Axios client (reuses enterprise token/base) ───────────────────────────────
const mktClient = axios.create({
  baseURL: config.API_BASE_URL + '/v1/enterprise',
  timeout: config.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

function ____formatAuthHeader(token: string): string {
  return token.split('.').length === 3 ? `Bearer ${token}` : `Token ${token}`;
}

function ____unwrapEnvelope(payload: any) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload.data;
  }
  return payload;
}

mktClient.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('authToken');
  if (token) cfg.headers.Authorization = ____formatAuthHeader(token);
  return cfg;
});

mktClient.interceptors.response.use(
  (res) => {
    res.data = ____unwrapEnvelope(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
    return Promise.reject(err);
  },
);

// ── Helper ────────────────────────────────────────────────────────────────────
const base = (orgId: string) => `/organizations/${orgId}/marketing`;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MktCampaign {
  resource_id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'error';
  campaign_type: 'regular' | 'ab_test' | 'automated' | 'rss';
  channel: 'email' | 'sms' | 'social' | 'push' | 'multi' | 'ads';
  objective: string;
  from_name: string;
  from_email: string;
  subject: string;
  scheduled_at: string | null;
  sent_at: string | null;
  organization: string;
  created_at: string;
  updated_at: string;
  analytics: {
    total_sent: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  } | null;
}

export interface MktContactList {
  resource_id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  double_optin: boolean;
  subscriber_count: number;
  organization: string;
  created_at: string;
  updated_at: string;
}

export interface MktSegment {
  id: string;
  name: string;
  description: string;
  segment_type: 'dynamic' | 'static';
  criteria: Record<string, unknown>;
  contact_count: number;
  tags: string[];
  is_active: boolean;
  organization: string;
  created_at: string;
  updated_at: string;
}

export interface MktEmailTemplate {
  resource_id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  preview_text: string;
  html_body: string;
  text_body: string;
  thumbnail_url: string;
  is_active: boolean;
  variables: string[];
  organization: string;
  created_at: string;
  updated_at: string;
}

export interface MktAutomation {
  resource_id: string;
  name: string;
  description: string;
  trigger: string;
  is_active: boolean;
  steps: Record<string, unknown>[];
  organization: string;
  created_at: string;
  updated_at: string;
}

export interface ABTestVariant {
  id: string;
  label: string;
  name: string;
  subject_line: string;
  preview_text: string;
  allocation: number;
  sends: number;
  opens: number;
  clicks: number;
  conversions: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  test_type: 'subject' | 'creative' | 'audience' | 'send_time' | 'cta';
  start_at: string | null;
  end_at: string | null;
  winner_variant: string;
  auto_select_winner: boolean;
  winner_metric: string;
  variants: ABTestVariant[];
  organization: string;
  created_at: string;
  updated_at: string;
}

export interface MktChannel {
  id: string;
  organization: string;
  channel_type: 'email' | 'sms' | 'social' | 'push' | 'ads';
  name: string;
  status: 'active' | 'error' | 'unconfigured' | 'disconnected';
  provider: string;
  config: Record<string, unknown>;
  last_checked: string | null;
  created_at: string;
  updated_at: string;
}

export interface MktCalendarEvent {
  id: string;
  organization: string;
  title: string;
  description: string;
  event_type: 'campaign' | 'automation' | 'post' | 'deadline' | 'other';
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string;
  assignee: string;
  created_at: string;
  updated_at: string;
}

export interface MktWorkspaceSettings {
  organization: string;
  default_from_name: string;
  default_from_email: string;
  default_reply_to: string;
  brand_color: string;
  logo_url: string;
  unsubscribe_page: string;
  gdpr_enabled: boolean;
  popia_enabled: boolean;
  api_keys: Record<string, string>;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MktOverview {
  stats: {
    total_campaigns: number;
    active_campaigns: number;
    draft_campaigns: number;
    audience_size: number;
    segments: number;
    active_automations: number;
    total_sent: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };
  recent_campaigns: MktCampaign[];
  channel_health: MktChannel[];
  upcoming: MktCalendarEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// API METHODS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Overview ──────────────────────────────────────────────────────────────────
export const mktOverviewApi = {
  get: (orgId: string) =>
    mktClient.get<MktOverview>(`${base(orgId)}/overview/`).then(r => r.data),
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
export interface MktCampaignPayload {
  name: string; description?: string; campaign_type?: string;
  channel?: string; objective?: string; from_name?: string;
  from_email?: string; reply_to?: string; subject?: string;
  preview_text?: string; html_body?: string; scheduled_at?: string;
  utm_source?: string; utm_medium?: string; utm_campaign?: string;
}

export const mktCampaignsApi = {
  list: (orgId: string, params?: { status?: string; channel?: string }) =>
    mktClient.get<MktCampaign[]>(`${base(orgId)}/campaigns/`, { params }).then(r => r.data),

  create: (orgId: string, data: MktCampaignPayload) =>
    mktClient.post<MktCampaign>(`${base(orgId)}/campaigns/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Partial<MktCampaignPayload>) =>
    mktClient.patch<MktCampaign>(`${base(orgId)}/campaigns/${id}/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/campaigns/${id}/`),

  duplicate: (orgId: string, id: string) =>
    mktClient.post<MktCampaign>(`${base(orgId)}/campaigns/${id}/duplicate/`).then(r => r.data),
};

// ── Contact Lists ─────────────────────────────────────────────────────────────
export const mktListsApi = {
  list: (orgId: string) =>
    mktClient.get<MktContactList[]>(`${base(orgId)}/contact-lists/`).then(r => r.data),

  create: (orgId: string, data: { name: string; description?: string; double_optin?: boolean }) =>
    mktClient.post<MktContactList>(`${base(orgId)}/contact-lists/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/contact-lists/${id}/`),
};

// ── Segments ──────────────────────────────────────────────────────────────────
export const mktSegmentsApi = {
  list: (orgId: string) =>
    mktClient.get<MktSegment[]>(`${base(orgId)}/segments/`).then(r => r.data),

  create: (orgId: string, data: {
    name: string; description?: string;
    segment_type?: 'dynamic' | 'static'; criteria?: Record<string, unknown>; tags?: string[];
  }) => mktClient.post<MktSegment>(`${base(orgId)}/segments/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    mktClient.patch<MktSegment>(`${base(orgId)}/segments/${id}/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/segments/${id}/`),
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const mktTemplatesApi = {
  list: (orgId: string) =>
    mktClient.get<MktEmailTemplate[]>(`${base(orgId)}/templates/`).then(r => r.data),

  create: (orgId: string, data: {
    name: string; subject: string; html_body: string;
    category?: string; description?: string; preview_text?: string;
    text_body?: string; variables?: string[];
  }) => mktClient.post<MktEmailTemplate>(`${base(orgId)}/templates/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/templates/${id}/`),
};

// ── Automations ───────────────────────────────────────────────────────────────
export const mktAutomationsApi = {
  list: (orgId: string) =>
    mktClient.get<MktAutomation[]>(`${base(orgId)}/automations/`).then(r => r.data),

  create: (orgId: string, data: {
    name: string; trigger: string; description?: string;
    steps?: Record<string, unknown>[];
  }) => mktClient.post<MktAutomation>(`${base(orgId)}/automations/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    mktClient.patch<MktAutomation>(`${base(orgId)}/automations/${id}/`, data).then(r => r.data),

  toggle: (orgId: string, id: string) =>
    mktClient.post<{ is_active: boolean }>(`${base(orgId)}/automations/${id}/toggle/`).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/automations/${id}/`),
};

// ── A/B Tests ─────────────────────────────────────────────────────────────────
export const mktABTestsApi = {
  list: (orgId: string) =>
    mktClient.get<ABTest[]>(`${base(orgId)}/ab-tests/`).then(r => r.data),

  create: (orgId: string, data: {
    name: string; hypothesis?: string; test_type: string;
    start_at?: string; end_at?: string;
    auto_select_winner?: boolean; winner_metric?: string;
    variants?: Partial<ABTestVariant>[];
  }) => mktClient.post<ABTest>(`${base(orgId)}/ab-tests/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    mktClient.patch<ABTest>(`${base(orgId)}/ab-tests/${id}/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/ab-tests/${id}/`),
};

// ── Channels ──────────────────────────────────────────────────────────────────
export const mktChannelsApi = {
  list: (orgId: string) =>
    mktClient.get<MktChannel[]>(`${base(orgId)}/channels/`).then(r => r.data),

  create: (orgId: string, data: {
    channel_type: string; name: string;
    provider?: string; config?: Record<string, unknown>;
  }) => mktClient.post<MktChannel>(`${base(orgId)}/channels/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    mktClient.patch<MktChannel>(`${base(orgId)}/channels/${id}/`, data).then(r => r.data),

  checkHealth: (orgId: string, id: string) =>
    mktClient.post<MktChannel>(`${base(orgId)}/channels/${id}/check/`).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/channels/${id}/`),
};

// ── Calendar ──────────────────────────────────────────────────────────────────
export const mktCalendarApi = {
  list: (orgId: string, params?: { from?: string; to?: string }) =>
    mktClient.get<MktCalendarEvent[]>(`${base(orgId)}/calendar/`, { params }).then(r => r.data),

  create: (orgId: string, data: {
    title: string; event_type?: string; start_at: string;
    end_at?: string; all_day?: boolean; color?: string;
    assignee?: string; description?: string;
  }) => mktClient.post<MktCalendarEvent>(`${base(orgId)}/calendar/`, data).then(r => r.data),

  update: (orgId: string, id: string, data: Record<string, unknown>) =>
    mktClient.patch<MktCalendarEvent>(`${base(orgId)}/calendar/${id}/`, data).then(r => r.data),

  delete: (orgId: string, id: string) =>
    mktClient.delete(`${base(orgId)}/calendar/${id}/`),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const mktSettingsApi = {
  get: (orgId: string) =>
    mktClient.get<MktWorkspaceSettings>(`${base(orgId)}/settings/`).then(r => r.data),

  update: (orgId: string, data: Partial<Omit<MktWorkspaceSettings, 'organization' | 'created_at' | 'updated_at'>>) =>
    mktClient.patch<MktWorkspaceSettings>(`${base(orgId)}/settings//`, data).then(r => r.data),
};
