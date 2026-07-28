// OrcaCloud – Domain Service Types

export type DomainStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'transferring'
  | 'deleting'
  | 'error';

export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SOA'
  | 'SRV'
  | 'CAA'
  | 'PTR';

export interface DnsRecord {
  id:           number;
  recordset_id: string;
  name:         string;
  record_type:  DnsRecordType;
  records:      string[];
  ttl:          number;
  is_managed:   boolean;
  created_at:   string;
  updated_at:   string;
}

export interface DnsZone {
  id:         number;
  zone_id:    string;
  zone_name:  string;
  status:     'active' | 'pending' | 'error' | 'deleted';
  email:      string;
  ttl:        number;
  serial:     number;
  records:    DnsRecord[];
  created_at: string;
  updated_at: string;
}

export interface DomainTransfer {
  id:               number;
  status:           'initiated' | 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  reseller_order_id: string;
  initiated_at:     string;
  completed_at:     string | null;
  error_message:    string | null;
}

export interface SslCertificate {
  cert_id:     string;
  common_name: string;
  sans:        string[];
  issuer:      string;
  status:      'pending' | 'active' | 'expired' | 'revoked' | 'error';
  issued_at:   string | null;
  expires_at:  string | null;
  auto_renew:  boolean;
}

export interface Domain {
  resource_id:         string;
  domain_name:         string;
  tld:                 string;
  status:              DomainStatus;
  reseller_order_id?:  string;
  registered_at?:      string | null;
  expires_at?:         string | null;
  days_until_expiry?:  number | null;
  auto_renew:          boolean;
  registration_years?: number;
  whois_privacy:       boolean;
  dnssec_enabled:      boolean;
  nameservers:         string[];
  registrant_contact?: Record<string, string>;
  admin_contact?:      Record<string, string>;
  tech_contact?:       Record<string, string>;
  linked_compute_id?:  string;
  linked_storage_bucket?: string;
  owner_username?:     string;
  dns_zone?:           DnsZone;
  ssl_certs?:          SslCertificate[];
  transfers?:          DomainTransfer[];
  tags?:               Record<string, string>;
  metadata?:           Record<string, unknown>;
  created_at:          string;
  updated_at?:         string;
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface DomainAvailability {
  domain:       string;
  tld:          string;
  status:       'available' | 'unavailable' | 'unknown';
  price?:       number;
  renew_price?: number;
}

export interface AvailabilityResult {
  domain_name: string;
  results:     DomainAvailability[];
}

export interface TldInfo {
  tld:            string;
  register_price: number;
  renew_price:    number;
  popular:        boolean;
}

// ── Request Payloads ─────────────────────────────────────────────────────────

export interface RegisterDomainPayload {
  domain_name:        string;
  registration_years: number;
  whois_privacy:      boolean;
  auto_renew:         boolean;
}

export interface TransferDomainPayload {
  domain_name: string;
  epp_code:    string;
}

export interface CreateDnsRecordPayload {
  name:        string;
  record_type: DnsRecordType;
  records:     string[];
  ttl:         number;
}
