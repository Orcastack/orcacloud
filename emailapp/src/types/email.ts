// OrcaCloud – Email Service Types

export type EmailDomainStatus = 'pending' | 'active' | 'disabled' | 'error';
export type MailboxStatus     = 'active' | 'suspended' | 'deleted' | 'creating' | 'error';

// ── DKIM ──────────────────────────────────────────────────────────────────────

export interface DkimKey {
  id:         number;
  selector:   string;
  dns_record: string;
  is_active:  boolean;
  created_at: string;
}

// ── Email Domain ──────────────────────────────────────────────────────────────

export interface EmailDomain {
  id:                 number;
  domain_name:        string;
  status:             EmailDomainStatus;
  mail_host:          string;
  smtp_port:          number;
  imap_port:          number;
  pop_port:           number;
  mx_provisioned:     boolean;
  spf_provisioned:    boolean;
  dkim_provisioned:   boolean;
  dmarc_provisioned:  boolean;
  dns_ready:          boolean;
  webmail_url:        string;
  default_quota_mb:   number;
  mailbox_count:      number;
  alias_count:        number;
  dkim_keys:          DkimKey[];
  created_at:         string;
  updated_at:         string;
}

// ── Mailbox ───────────────────────────────────────────────────────────────────

export interface Mailbox {
  resource_id:      string;
  email_address:    string;
  domain_name:      string;
  status:           MailboxStatus;
  quota_mb:         number;
  used_mb:          number;
  quota_used_pct:   number;
  first_name:       string;
  last_name:        string;
  is_admin:         boolean;
  forward_to:       string;
  last_login:       string | null;
  keep_local_copy?: boolean;
  created_at:       string;
  updated_at?:      string;
}

// ── Alias ─────────────────────────────────────────────────────────────────────

export interface EmailAlias {
  id:            number;
  alias_address: string;
  local_part:    string;
  destinations:  string[];
  is_active:     boolean;
  created_at:    string;
}

// ── Activity Log ──────────────────────────────────────────────────────────────

export interface EmailActivityLog {
  id:             number;
  event:          string;
  detail:         string;
  actor_username: string | null;
  created_at:     string;
}

// ── Client Settings ───────────────────────────────────────────────────────────

export interface MailClientSettings {
  domain:   string;
  webmail:  string;
  incoming: {
    imap: { host: string; port: number; security: string };
    pop3: { host: string; port: number; security: string };
  };
  outgoing: {
    smtp: { host: string; port: number; security: string };
  };
}

// ── Request Payloads ─────────────────────────────────────────────────────────

export interface CreateMailboxPayload {
  domain_resource_id: string;
  local_part:         string;
  password:           string;
  first_name?:        string;
  last_name?:         string;
  quota_mb?:          number;
  is_admin?:          boolean;
}

export interface UpdateMailboxPayload {
  first_name?:      string;
  last_name?:       string;
  quota_mb?:        number;
  forward_to?:      string;
  keep_local_copy?: boolean;
  is_admin?:        boolean;
}

export interface CreateAliasPayload {
  domain_resource_id: string;
  local_part:         string;
  destinations:       string[];
}
