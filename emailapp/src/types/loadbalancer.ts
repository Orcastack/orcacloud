export type LbType = 'application' | 'network' | 'classic';
export type LbScheme = 'internet-facing' | 'internal';

export interface LoadBalancer {
  resource_id: string;
  lb_id: string;
  name: string;
  description?: string;
  lb_type: LbType;
  status: string;
  dns_name: string;
  vpc_id: string;
  subnets: string[];
  security_groups: string[];
  scheme: LbScheme;
  ip_address_type: 'ipv4' | 'dualstack';
  cross_zone_load_balancing: boolean;
  access_logs_enabled: boolean;
  access_logs_bucket?: string;
  metadata?: Record<string, any>;
  target_groups?: TargetGroup[];
  listeners?: Listener[];
}

export interface TargetGroup {
  tg_id: string;
  name: string;
  protocol: 'http' | 'https' | 'tcp' | 'tls' | 'udp' | 'tcp_udp';
  port: number;
  target_type: 'instance' | 'ip' | 'lambda';
  registered_targets: Array<{ id: string; port: number; weight?: number }>;
  health_status: Record<string, string>;
  health_check_path: string;
  health_check_interval_seconds: number;
  health_check_timeout_seconds: number;
}

export interface Listener {
  listener_id: string;
  protocol: string;
  port: number;
  default_action: string;
}

export interface CreateLoadBalancerPayload {
  name: string;
  description?: string;
  lb_type: LbType;
  vpc_id: string;
  subnets: string[];
  security_groups: string[];
  scheme: LbScheme;
  ip_address_type: 'ipv4' | 'dualstack';
  cross_zone_load_balancing: boolean;
  access_logs_enabled: boolean;
  access_logs_bucket?: string;
}

export interface CreateTargetGroupPayload {
  name: string;
  protocol: 'http' | 'https' | 'tcp' | 'tls' | 'udp' | 'tcp_udp';
  port: number;
  vpc_id: string;
  target_type: 'instance' | 'ip' | 'lambda';
}

export interface LoadBalancerMetrics {
  latency_ms_p50: number;
  latency_ms_p95: number;
  request_rate_rps: number;
  error_rate_percent: number;
  healthy_targets: number;
  unhealthy_targets: number;
  throughput_mbps: number;
}
