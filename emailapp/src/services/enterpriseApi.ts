// OrcaCloud – Enterprise API Service
// Covers all org-scoped modules: Email, Domains, Branding, Billing, Audit.
// Routes under /api/enterprise/*

import axios from 'axios';
import { config } from '../config/environment';

// ── Axios client ──────────────────────────────────────────────────────────────
const enterpriseClient = axios.create({
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

enterpriseClient.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('authToken');
  if (token) cfg.headers.Authorization = ____formatAuthHeader(token);
  return cfg;
});

enterpriseClient.interceptors.response.use(
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgData {
  id: string;
  name: string;
  slug: string;
  primary_domain: string;
  industry: string;
  country: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  member_count: number;
  contact_email: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
}

export interface OrgGroup {
  id: string;
  team: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface OrgTeam {
  id: string;
  department: string;
  name: string;
  description: string;
  team_type: 'DEPARTMENT' | 'FUNCTION' | 'SQUAD';
  groups: OrgGroup[];
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization: string;
  name: string;
  category: string;
  description: string;
  department_lead: string;
  parent: string | null;
  teams: OrgTeam[];
  created_at: string;
  updated_at: string;
}

// ── Department Sidebar ────────────────────────────────────────────────────────
export type SidebarItemType = 'navigation' | 'action' | 'resource' | 'highlight' | 'custom';

export interface DeptSidebarItem {
  id: string;
  item_type: SidebarItemType;
  label: string;
  url: string;
  icon: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DeptSidebarItemWrite = Omit<DeptSidebarItem, 'id' | 'created_at' | 'updated_at'>;

export interface OrgMember {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  permissions: Record<string, boolean>;
  joined_at: string | null;
  invited_at: string;
}

export interface SendDomain {
  id: string;
  domain: string;
  status: 'PENDING_DNS' | 'VERIFIED' | 'FAILED';
  dkim_record: string;
  spf_record: string;
  tracking_domain: string;
  selector: string;
  last_checked_at: string | null;
  created_at: string;
}

export interface SenderIdentity {
  id: string;
  email: string;
  name: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  variables: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLogEntry {
  id: string;
  campaign_id: string;
  to_email: string;
  from_email: string;
  subject: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED' | 'OPENED' | 'CLICKED';
  provider_message_id: string;
  created_at: string;
}

export interface OrgDomain {
  id: string;
  name: string;
  type: 'APP' | 'MARKETING' | 'EMAIL' | 'MIXED';
  status: 'PENDING_DNS' | 'ACTIVE' | 'FAILED';
  linked_apps: string[];
  record_count: number;
  records: DomainRecord[];
  created_at: string;
}

export interface DomainRecord {
  id: string;
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  value: string;
  ttl: number;
  managed_by_platform: boolean;
}

export interface BrandingProfile {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
  font_family: string;
  custom_css: string;
  assets: BrandAsset[];
  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  type: 'LOGO' | 'ICON' | 'IMAGE' | 'DOCUMENT';
  url: string;
  label: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface EnterprisePlan {
  id: string;
  name: string;
  price_monthly: string;
  price_yearly: string;
  limits: Record<string, number | null>;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  plan: EnterprisePlan | null;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
  renewal_date: string | null;
  created_at: string;
}

export interface EnterpriseInvoice {
  id: string;
  amount: string;
  currency: string;
  status: 'DUE' | 'PAID' | 'FAILED';
  period_start: string;
  period_end: string;
  pdf_url: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_email: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_label: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

// ── Entry (org-context resolver) ─────────────────────────────────────────────
export interface EntryResponse {
  has_org: boolean;
  org: OrgData | null;
}

export const enterpriseEntryApi = {
  /** GET /api/enterprise/entry/ → { has_org, org }. */
  resolve: () =>
    enterpriseClient.get<EntryResponse>('/entry/').then(r => r.data),
};

// ── Organization ──────────────────────────────────────────────────────────────
export const organizationApi = {
  list: () =>
    enterpriseClient
      .get<OrgData[] | { results: OrgData[] }>('/organizations/')
      .then(r => unwrap(r.data)),

  create: (data: {
    name: string;
    slug: string;
    primary_domain?: string;
    domain_email?: string;
    industry?: string;
    country?: string;
    contact_email?: string;
    logo_url?: string;
  }) =>
    enterpriseClient.post<OrgData>('/organizations/', data).then(r => r.data),

  get: (orgId: string) =>
    enterpriseClient.get<OrgData>(`/organizations/${orgId}/`).then(r => r.data),

  update: (orgId: string, data: Partial<OrgData>) =>
    enterpriseClient.patch<OrgData>(`/organizations/${orgId}/`, data).then(r => r.data),

  delete: (orgId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/`),

  /** Resolve by slug (searches the list, returns first match). */
  getBySlug: async (slug: string): Promise<OrgData> => {
    const list = await organizationApi.list();
    const org = list.find(o => o.slug === slug);
    if (!org) throw new Error(`Organization "${slug}" not found`);
    return org;
  },
};

// helper: unwrap DRF pagination envelope if present
function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: (orgId: string) =>
    enterpriseClient
      .get<Department[] | { results: Department[] }>(`/organizations/${orgId}/departments/`)
      .then(r => unwrap(r.data)),

  create: (orgId: string, payload: {
    name: string;
    category?: string;
    description?: string;
    department_lead?: string;
    parent?: string;
  }) =>
    enterpriseClient.post<Department>(`/organizations/${orgId}/departments/`, payload).then(r => r.data),

  update: (orgId: string, deptId: string, payload: {
    name?: string;
    category?: string;
    description?: string;
    department_lead?: string;
    parent?: string;
  }) =>
    enterpriseClient.patch<Department>(`/organizations/${orgId}/departments/${deptId}/`, payload).then(r => r.data),

  remove: (orgId: string, deptId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/departments/${deptId}/`),
};

// ── Department Sidebar Items ───────────────────────────────────────────────────
export const deptSidebarApi = {
  list: (orgId: string, deptId: string) =>
    enterpriseClient
      .get<DeptSidebarItem[]>(`/organizations/${orgId}/departments/${deptId}/sidebar/`)
      .then(r => r.data),

  create: (orgId: string, deptId: string, payload: DeptSidebarItemWrite) =>
    enterpriseClient
      .post<DeptSidebarItem>(`/organizations/${orgId}/departments/${deptId}/sidebar/`, payload)
      .then(r => r.data),

  update: (orgId: string, deptId: string, itemId: string, payload: Partial<DeptSidebarItemWrite>) =>
    enterpriseClient
      .patch<DeptSidebarItem>(`/organizations/${orgId}/departments/${deptId}/sidebar/${itemId}/`, payload)
      .then(r => r.data),

  bulkSet: (orgId: string, deptId: string, items: DeptSidebarItemWrite[]) =>
    enterpriseClient
      .post<DeptSidebarItem[]>(`/organizations/${orgId}/departments/${deptId}/sidebar/bulk_set/`, { items })
      .then(r => r.data),

  remove: (orgId: string, deptId: string, itemId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/departments/${deptId}/sidebar/${itemId}/`),
};

// ── Teams ─────────────────────────────────────────────────────────────────────
export const orgTeamsApi = {
  list: (orgId: string, deptId: string) =>
    enterpriseClient
      .get<OrgTeam[] | { results: OrgTeam[] }>(`/organizations/${orgId}/departments/${deptId}/teams/`)
      .then(r => unwrap(r.data)),

  create: (orgId: string, deptId: string, payload: { name: string; description?: string; team_type?: string }) =>
    enterpriseClient.post<OrgTeam>(`/organizations/${orgId}/departments/${deptId}/teams/`, payload).then(r => r.data),

  update: (orgId: string, deptId: string, teamId: string, payload: { name?: string; description?: string; team_type?: string }) =>
    enterpriseClient.patch<OrgTeam>(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/`, payload).then(r => r.data),

  remove: (orgId: string, deptId: string, teamId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/`),
};

// ── Groups ────────────────────────────────────────────────────────────────────
export const orgGroupsApi = {
  list: (orgId: string, deptId: string, teamId: string) =>
    enterpriseClient
      .get<OrgGroup[] | { results: OrgGroup[] }>(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/groups/`)
      .then(r => unwrap(r.data)),

  create: (orgId: string, deptId: string, teamId: string, payload: { name: string; description?: string }) =>
    enterpriseClient.post<OrgGroup>(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/groups/`, payload).then(r => r.data),

  update: (orgId: string, deptId: string, teamId: string, groupId: string, payload: { name?: string; description?: string }) =>
    enterpriseClient.patch<OrgGroup>(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/groups/${groupId}/`, payload).then(r => r.data),

  remove: (orgId: string, deptId: string, teamId: string, groupId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/departments/${deptId}/teams/${teamId}/groups/${groupId}/`),
};

// ── Members ───────────────────────────────────────────────────────────────────
export const membersApi = {
  list: (orgId: string) =>
    enterpriseClient.get<OrgMember[] | { results: OrgMember[] }>(`/organizations/${orgId}/members/`).then(r => unwrap(r.data)),

  invite: (orgId: string, payload: { email: string; name?: string; role: string }) =>
    enterpriseClient.post<OrgMember>(`/organizations/${orgId}/members/invite/`, payload).then(r => r.data),

  updateRole: (orgId: string, memberId: string, role: string) =>
    enterpriseClient.patch<OrgMember>(`/organizations/${orgId}/members/${memberId}/`, { role }).then(r => r.data),

  remove: (orgId: string, memberId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/members/${memberId}/`),
};

// ── Email Sending Domains ─────────────────────────────────────────────────────
export const sendDomainsApi = {
  list: (orgId: string) =>
    enterpriseClient.get<SendDomain[] | { results: SendDomain[] }>(`/organizations/${orgId}/email-domains/`).then(r => unwrap(r.data)),

  add: (orgId: string, payload: { domain: string; tracking_domain?: string; selector?: string }) =>
    enterpriseClient.post<SendDomain>(`/organizations/${orgId}/email-domains/`, payload).then(r => r.data),

  checkDns: (orgId: string, domainId: string) =>
    enterpriseClient.post<SendDomain>(`/organizations/${orgId}/email-domains/${domainId}/check-dns/`).then(r => r.data),

  remove: (orgId: string, domainId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/email-domains/${domainId}/`),
};

// ── Sender Identities ─────────────────────────────────────────────────────────
export const senderIdentitiesApi = {
  list: (orgId: string) =>
    enterpriseClient.get<SenderIdentity[] | { results: SenderIdentity[] }>(`/organizations/${orgId}/email-senders/`).then(r => unwrap(r.data)),

  add: (orgId: string, payload: { email: string; name: string }) =>
    enterpriseClient.post<SenderIdentity>(`/organizations/${orgId}/email-senders/`, payload).then(r => r.data),

  verify: (orgId: string, senderId: string) =>
    enterpriseClient.post<SenderIdentity>(`/organizations/${orgId}/email-senders/${senderId}/verify/`).then(r => r.data),

  remove: (orgId: string, senderId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/email-senders/${senderId}/`),
};

// ── Email Templates ───────────────────────────────────────────────────────────
export const emailTemplatesApi = {
  list: (orgId: string) =>
    enterpriseClient.get<EmailTemplate[] | { results: EmailTemplate[] }>(`/organizations/${orgId}/email-templates/`).then(r => unwrap(r.data)),

  create: (orgId: string, payload: Partial<EmailTemplate>) =>
    enterpriseClient.post<EmailTemplate>(`/organizations/${orgId}/email-templates/`, payload).then(r => r.data),

  update: (orgId: string, id: string, payload: Partial<EmailTemplate>) =>
    enterpriseClient.patch<EmailTemplate>(`/organizations/${orgId}/email-templates/${id}/`, payload).then(r => r.data),

  remove: (orgId: string, id: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/email-templates/${id}/`),
};

// ── Email Logs ────────────────────────────────────────────────────────────────
export const emailLogsApi = {
  list: (orgId: string, filters?: { status?: string; campaign_id?: string }) =>
    enterpriseClient.get<EmailLogEntry[] | { results: EmailLogEntry[] }>(`/organizations/${orgId}/email-logs/`, { params: filters }).then(r => unwrap(r.data)),
};

// ── Organization Domains ──────────────────────────────────────────────────────
export const orgDomainsApi = {
  list: (orgId: string) =>
    enterpriseClient.get<OrgDomain[] | { results: OrgDomain[] }>(`/organizations/${orgId}/domains/`).then(r => unwrap(r.data)),

  add: (orgId: string, payload: { name: string; type?: string }) =>
    enterpriseClient.post<OrgDomain>(`/organizations/${orgId}/domains/`, payload).then(r => r.data),

  records: (orgId: string, domainId: string) =>
    enterpriseClient.get<DomainRecord[]>(`/organizations/${orgId}/domains/${domainId}/records/`).then(r => r.data),

  activate: (orgId: string, domainId: string) =>
    enterpriseClient.post<OrgDomain>(`/organizations/${orgId}/domains/${domainId}/activate/`).then(r => r.data),

  remove: (orgId: string, domainId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/domains/${domainId}/`),
};

// ── Branding ──────────────────────────────────────────────────────────────────
export const brandingApi = {
  get: (orgId: string) =>
    enterpriseClient.get<BrandingProfile>(`/organizations/${orgId}/branding/profile/`).then(r => r.data),

  update: (orgId: string, payload: Partial<BrandingProfile>) =>
    enterpriseClient.patch<BrandingProfile>(`/organizations/${orgId}/branding/profile/`, payload).then(r => r.data),

  listAssets: (orgId: string) =>
    enterpriseClient.get<BrandAsset[]>(`/organizations/${orgId}/branding-assets/`).then(r => r.data),

  addAsset: (orgId: string, payload: Partial<BrandAsset>) =>
    enterpriseClient.post<BrandAsset>(`/organizations/${orgId}/branding-assets/`, payload).then(r => r.data),

  removeAsset: (orgId: string, assetId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/branding-assets/${assetId}/`),
};

// ── Billing ───────────────────────────────────────────────────────────────────
export const enterpriseBillingApi = {
  plans: () =>
    enterpriseClient.get<EnterprisePlan[]>('/plans/').then(r => r.data),

  subscription: (orgId: string) =>
    enterpriseClient.get<Subscription>(`/organizations/${orgId}/billing-subscription/current/`).then(r => r.data),

  changePlan: (orgId: string, planId: string) =>
    enterpriseClient.post<Subscription>(`/organizations/${orgId}/billing-subscription/change-plan/`, { plan_id: planId }).then(r => r.data),

  invoices: (orgId: string) =>
    enterpriseClient.get<EnterpriseInvoice[] | { results: EnterpriseInvoice[] }>(`/organizations/${orgId}/billing-invoices/`).then(r => unwrap(r.data)),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogsApi = {
  list: (orgId: string, filters?: {
    actor?: string;
    action?: string;
    target_type?: string;
    since?: string;
    until?: string;
  }) =>
    enterpriseClient.get<{ results: AuditLogEntry[] } | AuditLogEntry[]>(`/organizations/${orgId}/audit-logs/`, { params: filters })
      .then(r => Array.isArray(r.data) ? r.data : ((r.data as any).results ?? [])),
};

// ── Usage ─────────────────────────────────────────────────────────────────────
export interface UsageSummary {
  storage_gb_used: number;
  storage_gb_limit: number | null;
  email_sent_30d: number;
  email_limit_30d: number | null;
  compute_hours_used: number;
  compute_hours_limit: number | null;
  members_count: number;
  members_limit: number | null;
}

export const usageApi = {
  summary: (orgId: string) =>
    enterpriseClient.get<UsageSummary>(`/organizations/${orgId}/usage/`).then(r => r.data),
};

// ── Integrations ──────────────────────────────────────────────────────────────
export interface OrgIntegration {
  id: string;
  organization: string;
  provider: string;
  display_name: string;
  category: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';
  config: Record<string, unknown>;
  last_sync: string | null;
  last_error: string;
  total_calls: number;
  error_count: number;
  connected_by_name: string;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  provider: string;
  event_type: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  http_status: number | null;
  duration_ms: number | null;
  retry_count: number;
  correlation_id: string;
  timestamp: string;
}

export interface IntegrationWebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  normalized: Record<string, unknown>;
  processed: boolean;
  processing_error: string;
  received_at: string;
}

export interface IntegrationPayload {
  provider: string;
  display_name?: string;
  category?: string;
  credentials?: Record<string, string>;
  config?: Record<string, unknown>;
}

export const integrationsApi = {
  list: (orgId: string, params?: { category?: string; status?: string }) =>
    enterpriseClient
      .get<OrgIntegration[] | { results: OrgIntegration[] }>(`/organizations/${orgId}/integrations/`, { params })
      .then(r => unwrap(r.data)),

  get: (orgId: string, id: string) =>
    enterpriseClient.get<OrgIntegration>(`/organizations/${orgId}/integrations/${id}/`).then(r => r.data),

  upsert: (orgId: string, payload: IntegrationPayload) =>
    enterpriseClient.post<OrgIntegration>(`/organizations/${orgId}/integrations/`, payload).then(r => r.data),

  update: (orgId: string, id: string, payload: Partial<IntegrationPayload>) =>
    enterpriseClient.patch<OrgIntegration>(`/organizations/${orgId}/integrations/${id}/`, payload).then(r => r.data),

  remove: (orgId: string, id: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/integrations/${id}/`),

  connect: (orgId: string, id: string, credentials: Record<string, string>, displayName?: string) =>
    enterpriseClient
      .post<OrgIntegration>(`/organizations/${orgId}/integrations/${id}/connect/`,
        { credentials, display_name: displayName })
      .then(r => r.data),

  disconnect: (orgId: string, id: string) =>
    enterpriseClient.post<OrgIntegration>(`/organizations/${orgId}/integrations/${id}/disconnect/`).then(r => r.data),

  test: (orgId: string, id: string) =>
    enterpriseClient
      .post<{ success: boolean; message: string; duration_ms?: number }>(
        `/organizations/${orgId}/integrations/${id}/test/`)
      .then(r => r.data),

  sync: (orgId: string, id: string) =>
    enterpriseClient
      .post<{ success: boolean; synced_at: string }>(`/organizations/${orgId}/integrations/${id}/sync/`)
      .then(r => r.data),

  logs: (orgId: string, id: string) =>
    enterpriseClient.get<IntegrationLog[]>(`/organizations/${orgId}/integrations/${id}/logs/`).then(r => r.data),

  events: (orgId: string, id: string) =>
    enterpriseClient
      .get<IntegrationWebhookEvent[]>(`/organizations/${orgId}/integrations/${id}/events/`)
      .then(r => r.data),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  product: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface OrgOrder {
  id: string;
  order_number: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  total_amount: string;
  currency: string;
  items: OrderItem[];
  created_at: string;
}

export const ordersApi = {
  list: (orgId: string) =>
    enterpriseClient
      .get<OrgOrder[] | { results: OrgOrder[] }>(`/organizations/${orgId}/orders/`)
      .then(r => unwrap(r.data)),
};

// ── Org Subscriptions ─────────────────────────────────────────────────────────
export interface OrgSubscriptionItem {
  id: string;
  name: string;
  provider: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIALING';
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  amount: string;
  currency: string;
  renewal_date: string | null;
  created_at: string;
}

export const orgSubscriptionsApi = {
  list: (orgId: string): Promise<OrgSubscriptionItem[]> =>
    enterpriseClient
      .get<any>(`/organizations/${orgId}/billing-subscription/current/`)
      .then(r => {
        const sub = r.data;
        if (!sub || !sub.id) return [];
        return [
          {
            id: sub.id,
            name: sub.plan?.name ?? 'Platform Subscription',
            provider: 'OrcaCloud',
            status: (sub.status === 'ACTIVE'   ? 'ACTIVE'
                   : sub.status === 'TRIALING'  ? 'TRIALING'
                   : sub.status === 'CANCELED'  ? 'CANCELLED'
                   : 'EXPIRED') as OrgSubscriptionItem['status'],
            billing_cycle: 'MONTHLY' as const,
            amount: String(sub.plan?.price_monthly ?? '0.00'),
            currency: 'USD',
            renewal_date: sub.renewal_date ?? null,
            created_at: sub.created_at,
          } as OrgSubscriptionItem,
        ];
      })
      .catch(() => []),
};

// ── Security Policies ─────────────────────────────────────────────────────────
export interface SecurityPolicy {
  mfa_required: boolean;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  session_timeout_minutes: number;
  ip_allowlist: string[];
  sso_required: boolean;
  data_residency: string;
  audit_retention_days: number;
}

export const securityPoliciesApi = {
  get: (orgId: string) =>
    enterpriseClient.get<SecurityPolicy>(`/organizations/${orgId}/security/policies/`).then(r => r.data),

  update: (orgId: string, payload: Partial<SecurityPolicy>) =>
    enterpriseClient.put<SecurityPolicy>(`/organizations/${orgId}/security/policies/`, payload).then(r => r.data),
};

// ── Org Settings ──────────────────────────────────────────────────────────────
export interface OrgSettings {
  language: string;
  timezone: string;
  default_department: string | null;
  notifications_billing: boolean;
  notifications_security: boolean;
  notifications_usage: boolean;
  notification_slack_webhook: string;
  branding_primary_color: string;
}

export const orgSettingsApi = {
  get: (orgId: string) =>
    enterpriseClient.get<OrgSettings>(`/organizations/${orgId}/settings/`).then(r => r.data),

  update: (orgId: string, payload: Partial<OrgSettings>) =>
    enterpriseClient.put<OrgSettings>(`/organizations/${orgId}/settings/`, payload).then(r => r.data),
};

// ── Wiki ──────────────────────────────────────────────────────────────────────
export interface WikiCategory {
  id: string;
  organization: string;
  name: string;
  color: string;
  description: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface WikiPageSummary {
  id: string;
  organization: string;
  title: string;
  slug: string;
  summary: string;
  is_pinned: boolean;
  view_count: number;
  tags: string[];
  categories: WikiCategory[];
  linked_module: string;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface WikiPage extends WikiPageSummary {
  content: string;
}

export interface WikiPageVersion {
  id: string;
  page: string;
  title: string;
  content: string;
  edited_by_name: string;
  edited_at: string;
  version_note: string;
}

export interface WikiPagePayload {
  title: string;
  slug?: string;
  content?: string;
  summary?: string;
  is_pinned?: boolean;
  tags?: string[];
  category_ids?: string[];
  linked_module?: string;
  version_note?: string;
}

export const wikiCategoriesApi = {
  list: (orgId: string) =>
    enterpriseClient.get<WikiCategory[] | { results: WikiCategory[] }>(`/organizations/${orgId}/wiki/categories/`).then(r => unwrap(r.data)),

  create: (orgId: string, payload: { name: string; color?: string; description?: string }) =>
    enterpriseClient.post<WikiCategory>(`/organizations/${orgId}/wiki/categories/`, payload).then(r => r.data),

  update: (orgId: string, catId: string, payload: Partial<{ name: string; color: string; description: string }>) =>
    enterpriseClient.patch<WikiCategory>(`/organizations/${orgId}/wiki/categories/${catId}/`, payload).then(r => r.data),

  delete: (orgId: string, catId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/wiki/categories/${catId}/`).then(r => r.data),
};

export const wikiPagesApi = {
  list: (orgId: string, params?: {
    q?: string; category?: string; tag?: string; module?: string; pinned?: boolean;
  }) =>
    enterpriseClient.get<WikiPageSummary[]>(`/organizations/${orgId}/wiki/pages/`, { params }).then(r => r.data),

  get: (orgId: string, pageId: string) =>
    enterpriseClient.get<WikiPage>(`/organizations/${orgId}/wiki/pages/${pageId}/`).then(r => r.data),

  create: (orgId: string, payload: WikiPagePayload) =>
    enterpriseClient.post<WikiPage>(`/organizations/${orgId}/wiki/pages/`, payload).then(r => r.data),

  update: (orgId: string, pageId: string, payload: Partial<WikiPagePayload>) =>
    enterpriseClient.patch<WikiPage>(`/organizations/${orgId}/wiki/pages/${pageId}/`, payload).then(r => r.data),

  delete: (orgId: string, pageId: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/wiki/pages/${pageId}/`).then(r => r.data),

  versions: (orgId: string, pageId: string) =>
    enterpriseClient.get<WikiPageVersion[]>(`/organizations/${orgId}/wiki/pages/${pageId}/versions/`).then(r => r.data),

  restore: (orgId: string, pageId: string, versionId: string) =>
    enterpriseClient.post<WikiPage>(`/organizations/${orgId}/wiki/pages/${pageId}/restore/${versionId}/`).then(r => r.data),
};

// ── Meeting Hub Types ─────────────────────────────────────────────────────────

export type MeetingStatus       = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MeetingType         = 'scheduled' | 'recurring' | 'instant' | 'department';
export type InviteStatus        = 'invited' | 'accepted' | 'declined' | 'tentative' | 'attended' | 'no_show';
export type ParticipantRole     = 'host' | 'co_host' | 'attendee';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type MeetingNotifType    = 'invite' | 'reminder' | 'updated' | 'cancelled' | 'started' | 'recording' | 'notes';

export interface MeetingParticipant {
  id: string;
  meeting: string;
  user: number | null;
  member: string | null;
  email: string;
  name: string;
  role: ParticipantRole;
  invite_status: InviteStatus;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  organization: string;
  department: string | null;
  department_name: string;
  created_by: number | null;
  created_by_name: string;
  title: string;
  description: string;
  agenda: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  meeting_type: MeetingType;
  status: MeetingStatus;
  video_room_id: string;
  video_provider: string;
  video_join_url: string;
  location: string;
  is_recurring: boolean;
  recurrence_rule: string;
  recording_url: string;
  notes: string;
  max_participants: number;
  participants: MeetingParticipant[];
  participant_count: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingWrite {
  title: string;
  description?: string;
  agenda?: string;
  start_time: string;
  end_time: string;
  meeting_type?: MeetingType;
  video_provider?: string;
  video_join_url?: string;
  location?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  notes?: string;
  max_participants?: number;
  department?: string | null;
}

export interface MeetingNotification {
  id: string;
  user: number;
  meeting: string;
  meeting_title: string;
  notif_type: MeetingNotifType;
  message: string;
  is_read: boolean;
  sent_at: string;
}

export interface Announcement {
  id: string;
  organization: string;
  department: string | null;
  department_name: string;
  created_by: number | null;
  created_by_name: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAnalytics {
  total: number;
  this_week: number;
  this_month: number;
  upcoming: number;
  in_progress: number;
  completed: number;
  avg_duration: number;
}

// ── Meeting Hub API ───────────────────────────────────────────────────────────

export const meetingsApi = {
  list: (orgId: string, params?: { department?: string; status?: string; type?: string; upcoming?: string }) =>
    enterpriseClient
      .get<Meeting[] | { results: Meeting[] }>(`/organizations/${orgId}/meetings/`, { params })
      .then(r => unwrap(r.data)),

  get: (orgId: string, id: string) =>
    enterpriseClient.get<Meeting>(`/organizations/${orgId}/meetings/${id}/`).then(r => r.data),

  create: (orgId: string, payload: MeetingWrite) =>
    enterpriseClient.post<Meeting>(`/organizations/${orgId}/meetings/`, payload).then(r => r.data),

  update: (orgId: string, id: string, payload: Partial<MeetingWrite>) =>
    enterpriseClient.patch<Meeting>(`/organizations/${orgId}/meetings/${id}/`, payload).then(r => r.data),

  delete: (orgId: string, id: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/meetings/${id}/`),

  invite: (orgId: string, id: string, participants: { email: string; name?: string; role?: string }[]) =>
    enterpriseClient.post<{ invited: number }>(`/organizations/${orgId}/meetings/${id}/invite/`, { participants }).then(r => r.data),

  start: (orgId: string, id: string) =>
    enterpriseClient.post<{ status: string; video_room_id: string; video_join_url: string }>(
      `/organizations/${orgId}/meetings/${id}/start/`
    ).then(r => r.data),

  end: (orgId: string, id: string, notes?: string) =>
    enterpriseClient.post<{ status: string }>(`/organizations/${orgId}/meetings/${id}/end/`, { notes }).then(r => r.data),

  rsvp: (orgId: string, id: string, rsvpStatus: InviteStatus) =>
    enterpriseClient.post<{ status: string }>(`/organizations/${orgId}/meetings/${id}/rsvp/`, { status: rsvpStatus }).then(r => r.data),

  analytics: (orgId: string) =>
    enterpriseClient.get<MeetingAnalytics>(`/organizations/${orgId}/meetings/analytics/`).then(r => r.data),
};

export const meetingNotificationsApi = {
  list: (orgId: string) =>
    enterpriseClient
      .get<MeetingNotification[] | { results: MeetingNotification[] }>(`/organizations/${orgId}/meeting-notifications/`)
      .then(r => unwrap(r.data)),

  markRead: (orgId: string, id: string) =>
    enterpriseClient.patch<MeetingNotification>(`/organizations/${orgId}/meeting-notifications/${id}/`, { is_read: true }).then(r => r.data),

  markAllRead: (orgId: string) =>
    enterpriseClient.post<{ marked: number }>(`/organizations/${orgId}/meeting-notifications/mark-all-read/`).then(r => r.data),
};

export const announcementsApi = {
  list: (orgId: string, params?: { department?: string }) =>
    enterpriseClient
      .get<Announcement[] | { results: Announcement[] }>(`/organizations/${orgId}/announcements/`, { params })
      .then(r => unwrap(r.data)),

  create: (orgId: string, payload: { title: string; message: string; priority?: AnnouncementPriority; is_pinned?: boolean; department?: string | null }) =>
    enterpriseClient.post<Announcement>(`/organizations/${orgId}/announcements/`, payload).then(r => r.data),

  update: (orgId: string, id: string, payload: Partial<{ title: string; message: string; priority: AnnouncementPriority; is_pinned: boolean }>) =>
    enterpriseClient.patch<Announcement>(`/organizations/${orgId}/announcements/${id}/`, payload).then(r => r.data),

  delete: (orgId: string, id: string) =>
    enterpriseClient.delete(`/organizations/${orgId}/announcements/${id}/`),
};

export default {
  entry: enterpriseEntryApi,
  organization: organizationApi,
  members: membersApi,
  departments: departmentsApi,
  teams: orgTeamsApi,
  groups: orgGroupsApi,
  sendDomains: sendDomainsApi,
  senderIdentities: senderIdentitiesApi,
  emailTemplates: emailTemplatesApi,
  emailLogs: emailLogsApi,
  orgDomains: orgDomainsApi,
  branding: brandingApi,
  billing: enterpriseBillingApi,
  auditLogs: auditLogsApi,
  usage: usageApi,
  integrations: integrationsApi,
  orders: ordersApi,
  subscriptions: orgSubscriptionsApi,
  securityPolicies: securityPoliciesApi,
  settings: orgSettingsApi,
  wikiCategories: wikiCategoriesApi,
  wikiPages: wikiPagesApi,
  meetings: meetingsApi,
  meetingNotifications: meetingNotificationsApi,
  announcements: announcementsApi,
};
