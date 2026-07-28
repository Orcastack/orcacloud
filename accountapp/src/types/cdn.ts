export interface CDNDistribution {
  resource_id: string;
  distribution_id: string;
  name: string;
  description?: string;
  origin_domain: string;
  origin_path: string;
  domain_names: string[];
  default_root_object?: string;
  enabled: boolean;
  status: 'provisioning' | 'running' | 'stopped' | 'failed' | string;
  require_https: boolean;
  certificate_arn?: string;
  ssl_protocol_minimum: 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'SSLv3' | string;
  default_ttl_seconds: number;
  max_ttl_seconds: number;
  origin_shield_enabled: boolean;
  origin_shield_region?: string;
  access_logs_enabled: boolean;
  access_logs_bucket?: string;
  waf_enabled: boolean;
  waf_web_acl_id?: string;
  price_class: '100' | '200' | 'all' | string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCDNDistributionPayload {
  name: string;
  description?: string;
  origin_domain: string;
  origin_path?: string;
  domain_names?: string[];
  default_root_object?: string;
  enabled?: boolean;
  require_https?: boolean;
  certificate_arn?: string;
  ssl_protocol_minimum?: 'TLSv1' | 'TLSv1.1' | 'TLSv1.2' | 'SSLv3';
  default_ttl_seconds?: number;
  max_ttl_seconds?: number;
  origin_shield_enabled?: boolean;
  origin_shield_region?: string;
  access_logs_enabled?: boolean;
  access_logs_bucket?: string;
  waf_enabled?: boolean;
  waf_web_acl_id?: string;
  price_class?: '100' | '200' | 'all';
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface CDNMetrics {
  distribution_id: string;
  edge_domain: string;
  requests: number;
  cache_hit_ratio_percent: number;
  cache_miss_ratio_percent: number;
  avg_edge_latency_ms: number;
  origin_egress_gb: number;
  bandwidth_saved_percent: number;
  '4xx_rate_percent': number;
  '5xx_rate_percent': number;
}

export interface EdgeStatusItem {
  region: string;
  status: 'healthy' | 'degraded' | string;
  p95_latency_ms: number;
}
