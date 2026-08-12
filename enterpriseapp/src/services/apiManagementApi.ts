// OrcaCloud – API Management API Client

import client from './apiClient'

const BASE = '/api/services/apim'

function unwrap<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : ((data as any)?.results ?? []) as T[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApimOverview {
  apis: { total: number; active: number; deprecated: number; draft: number }
  gateways: { total: number; healthy: number; degraded: number; unhealthy: number }
  consumers: { total: number; active_keys: number; revoked_keys: number }
  products: { total: number; published: number }
  policies: { total: number; enabled: number }
  traffic: { total_requests: number; total_errors: number; error_rate: number; avg_latency_ms: number }
  top_apis: ApiDefinition[]
  request_sparkline: number[]
  error_sparkline: number[]
  latency_sparkline: number[]
}

export interface ApiDefinition {
  id: string
  name: string
  description?: string
  version: string
  environment: 'development' | 'staging' | 'production'
  protocol: 'rest' | 'graphql' | 'grpc' | 'ws'
  auth_type: 'none' | 'apikey' | 'jwt' | 'oauth2' | 'mtls' | 'basic'
  status: 'draft' | 'active' | 'deprecated' | 'retired'
  base_path: string
  upstream_url: string
  tags: string[]
  request_count: number
  error_count: number
  avg_latency_ms: number
  policy_count?: number
  gateway_count?: number
  created_at: string
}

export interface ApiGateway {
  id: string
  name: string
  description?: string
  engine: 'kong' | 'envoy' | 'nginx' | 'tyk' | 'orcacloud' | 'aws_agw'
  environment: 'development' | 'staging' | 'production'
  region: string
  endpoint: string
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  active_apis: number
  request_rate: number
  error_rate: number
  latency_p99_ms: number
  uptime_percent: number
  last_seen: string
  api_count?: number
  created_at: string
}

export interface ApiConsumer {
  id: string
  name: string
  description?: string
  consumer_type: 'app' | 'service' | 'team' | 'partner' | 'internal'
  environment: 'development' | 'staging' | 'production'
  contact_email: string
  active: boolean
  total_requests: number
  key_count?: number
  created_at: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  consumer_id: string
  consumer_name?: string
  environment: 'development' | 'staging' | 'production'
  status: 'active' | 'revoked' | 'expired' | 'rotating'
  scopes: string[]
  rate_limit: number
  quota: number
  expires_at?: string
  last_used_at?: string
  request_count: number
  raw_key?: string // only returned once on create/rotate
  created_at: string
}

export interface ApiProduct {
  id: string
  name: string
  description?: string
  tier: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom'
  status: 'draft' | 'published' | 'archived'
  environment: 'development' | 'staging' | 'production'
  rate_limit: number
  quota: number
  burst_limit: number
  subscriber_count: number
  api_count?: number
  created_at: string
}

export interface ApiPolicy {
  id: string
  name: string
  description?: string
  policy_type: 'rate_limit' | 'auth' | 'cors' | 'transform' | 'cache' | 'ip_filter' | 'circuit_break' | 'retry' | 'logging' | 'custom'
  scope: 'gateway' | 'api' | 'product'
  enabled: boolean
  environment: 'development' | 'staging' | 'production'
  config: Record<string, unknown>
  priority: number
  attachment_count?: number
  created_at: string
}

export interface SeriesPoint { ts: string; v: number }

export interface ApimAnalytics {
  series: {
    request_rate: SeriesPoint[]
    error_rate: SeriesPoint[]
    latency_p99: SeriesPoint[]
    error_5xx: SeriesPoint[]
  }
  summary: {
    total_requests: number
    total_errors: number
    avg_latency_ms: number
    p99_latency_ms: number
  }
  status_distribution: Record<string, number>
  top_endpoints: { path: string; method: string; count: number; avg_ms: number }[]
  top_consumers: { name: string; requests: number; errors: number }[]
}

export interface ApimAuditEntry {
  id: number
  actor: string
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  environment: string
  before_state: Record<string, unknown>
  after_state: Record<string, unknown>
  created_at: string
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getApimOverview(): Promise<ApimOverview> {
  const { data } = await client.get(`${BASE}/overview/`)
  return data
}

// ─── APIs ──────────────────────────────────────────────────────────────────────

export async function getApis(params?: { environment?: string; status?: string; search?: string }): Promise<ApiDefinition[]> {
  const { data } = await client.get(`${BASE}/apis/`, { params })
  return unwrap<ApiDefinition>(data)
}

export async function createApi(payload: Partial<ApiDefinition>): Promise<ApiDefinition> {
  const { data } = await client.post(`${BASE}/apis/`, payload)
  return data
}

export async function updateApi(id: string, payload: Partial<ApiDefinition>): Promise<ApiDefinition> {
  const { data } = await client.patch(`${BASE}/apis/${id}/`, payload)
  return data
}

export async function deleteApi(id: string): Promise<void> {
  await client.delete(`${BASE}/apis/${id}/`)
}

export async function deprecateApi(id: string): Promise<ApiDefinition> {
  const { data } = await client.post(`${BASE}/apis/${id}/deprecate/`)
  return data
}

export async function activateApi(id: string): Promise<ApiDefinition> {
  const { data } = await client.post(`${BASE}/apis/${id}/activate/`)
  return data
}

// ─── Gateways ─────────────────────────────────────────────────────────────────

export async function getGateways(params?: { environment?: string }): Promise<ApiGateway[]> {
  const { data } = await client.get(`${BASE}/gateways/live/`, { params })
  return unwrap<ApiGateway>(data)
}

export async function createGateway(payload: Partial<ApiGateway>): Promise<ApiGateway> {
  const { data } = await client.post(`${BASE}/gateways/`, payload)
  return data
}

export async function attachApiToGateway(gatewayId: string, apiId: string): Promise<void> {
  await client.post(`${BASE}/gateways/${gatewayId}/attach_api/`, { api_id: apiId })
}

// ─── Consumers ────────────────────────────────────────────────────────────────

export async function getConsumers(params?: { environment?: string; search?: string }): Promise<ApiConsumer[]> {
  const { data } = await client.get(`${BASE}/consumers/live/`, { params })
  return unwrap<ApiConsumer>(data)
}

export async function createConsumer(payload: Partial<ApiConsumer>): Promise<ApiConsumer> {
  const { data } = await client.post(`${BASE}/consumers/`, payload)
  return data
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

export async function getKeys(params?: { consumer?: string; environment?: string; status?: string }): Promise<ApiKey[]> {
  const { data } = await client.get(`${BASE}/keys/live/`, { params })
  return unwrap<ApiKey>(data)
}

export async function generateKey(payload: {
  consumer: string
  name: string
  environment: string
  scopes?: string[]
  rate_limit?: number
  quota?: number
  expires_at?: string
}): Promise<ApiKey> {
  const { data } = await client.post(`${BASE}/keys/`, payload)
  return data
}

export async function revokeKey(id: string): Promise<ApiKey> {
  const { data } = await client.post(`${BASE}/keys/${id}/revoke/`)
  return data
}

export async function rotateKey(id: string): Promise<ApiKey> {
  const { data } = await client.post(`${BASE}/keys/${id}/rotate/`)
  return data
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(params?: { environment?: string; status?: string }): Promise<ApiProduct[]> {
  const { data } = await client.get(`${BASE}/products/live/`, { params })
  return unwrap<ApiProduct>(data)
}

export async function createProduct(payload: Partial<ApiProduct>): Promise<ApiProduct> {
  const { data } = await client.post(`${BASE}/products/`, payload)
  return data
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export async function getPolicies(params?: { policy_type?: string; environment?: string }): Promise<ApiPolicy[]> {
  const { data } = await client.get(`${BASE}/policies/live/`, { params })
  return unwrap<ApiPolicy>(data)
}

export async function createPolicy(payload: Partial<ApiPolicy>): Promise<ApiPolicy> {
  const { data } = await client.post(`${BASE}/policies/`, payload)
  return data
}

export async function togglePolicy(id: string): Promise<ApiPolicy> {
  const { data } = await client.post(`${BASE}/policies/${id}/toggle/`)
  return data
}

export async function attachPolicyToApi(policyId: string, apiId: string): Promise<void> {
  await client.post(`${BASE}/policies/${policyId}/attach_to_api/`, { api_id: apiId })
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getApimAnalytics(params?: { hours?: number; api_id?: string; gateway_id?: string }): Promise<ApimAnalytics> {
  const { data } = await client.get(`${BASE}/analytics/`, { params })
  return data
}

export async function getApimAuditLog(params?: { entity_type?: string; hours?: number; limit?: number }): Promise<ApimAuditEntry[]> {
  const { data } = await client.get(`${BASE}/analytics/audit_log/`, { params })
  return unwrap<ApimAuditEntry>(data)
}
