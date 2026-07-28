import axios from 'axios';
import type {
  AvailabilityResult,
  CreateDnsRecordPayload,
  DnsRecord,
  Domain,
  RegisterDomainPayload,
  SslCertificate,
  TldInfo,
  TransferDomainPayload,
} from './domainTypes';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
});

/** The only browser client for domain registration, DNS, SSL, and billing behavior. */
export const domainApi = {
  list: () => client.get<Domain[]>('/domains/'),
  get: (id: string) => client.get<Domain>(`/domains/${id}/`),
  delete: (id: string) => client.delete(`/domains/${id}/`),
  checkAvailability: (name: string, tlds?: string[]) => client.post<AvailabilityResult>('/domains/check_availability/', { domain_name: name, tlds }),
  tldCatalogue: () => client.get<TldInfo[]>('/domains/tld_catalogue/'),
  register: (payload: RegisterDomainPayload) => client.post<Domain>('/domains/register/', payload),
  transfer: (payload: TransferDomainPayload) => client.post<Domain>('/domains/transfer/', payload),
  renew: (id: string, years: number) => client.post(`/domains/${id}/renew/`, { years }),
  dnsZone: (id: string) => client.get(`/domains/${id}/dns_zone/`),
  dnsRecords: (id: string) => client.get<DnsRecord[]>(`/domains/${id}/dns_records/`),
  addDnsRecord: (id: string, payload: CreateDnsRecordPayload) => client.post<DnsRecord>(`/domains/${id}/add_dns_record/`, payload),
  updateDnsRecord: (id: string, recordsetId: string, records: string[], ttl?: number) => client.post<DnsRecord>(`/domains/${id}/update_dns_record/`, { recordset_id: recordsetId, records, ttl }),
  deleteDnsRecord: (id: string, recordsetId: string) => client.post(`/domains/${id}/delete_dns_record/`, { recordset_id: recordsetId }),
  dnsTemplates: (id: string) => client.get<any[]>(`/domains/${id}/dns_templates/`),
  applyDnsTemplate: (id: string, templateName: string) => client.post(`/domains/${id}/dns_templates/`, { template_name: templateName }),
  sslCerts: (id: string) => client.get<SslCertificate[]>(`/domains/${id}/ssl_certs/`),
  requestSsl: (id: string) => client.post(`/domains/${id}/request_ssl/`),
  toggleAutoRenew: (id: string) => client.post<{ auto_renew: boolean }>(`/domains/${id}/toggle_auto_renew/`),
  updateNameservers: (id: string, nameservers: string[]) => client.post(`/domains/${id}/update_nameservers/`, { nameservers }),
  setPrivacy: (id: string, enable: boolean) => client.post(`/domains/${id}/set_privacy/`, { enable }),
  enableDnssec: (id: string) => client.post(`/domains/${id}/enable_dnssec/`),
  switchDomain: (id: string, payload: Record<string, string> = {}) => client.post(`/domains/${id}/switch_domain/`, payload),
  switchStatus: (id: string) => client.get(`/domains/${id}/switch_status/`),
  billing: (id: string) => client.get(`/domains/${id}/billing/`),
};