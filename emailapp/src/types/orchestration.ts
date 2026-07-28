export interface OrchestrationOverview {
  summary: {
    kubernetes_clusters: number;
    running_clusters: number;
    serverless_functions: number;
    autoscaling_groups: number;
  };
  capabilities: Record<string, string[]>;
}

export interface TerraformPlanResult {
  plan_id: string;
  environment: string;
  status: string;
  summary: {
    to_add: number;
    to_change: number;
    to_destroy: number;
  };
  resources: string[];
  generated_at: string;
}

export interface TerraformApplyResult {
  plan_id: string;
  apply_id: string;
  status: string;
  applied_at: string;
}

export interface DeploymentResult {
  deployment_id: string;
  release_name: string;
  chart: string;
  namespace: string;
  strategy: 'rolling' | 'canary' | 'blue-green' | string;
  status: string;
  timestamp: string;
}

export interface ComplianceScanResult {
  score: number;
  findings: Array<{ cluster: string; severity: string; issue: string }>;
  checked_clusters: number;
  timestamp: string;
}

export interface ObservabilityResult {
  metrics: {
    prometheus_targets_up_percent: number;
    cluster_cpu_avg_percent: number;
    function_error_rate_percent: number;
  };
  logs: {
    ingestion_status: string;
    events_per_minute: number;
  };
  traces: {
    otel_status: string;
    p95_ms: number;
  };
  timestamp: string;
}
