export interface KubernetesNode {
  node_name: string;
  instance_id: string;
  status: 'ready' | 'not_ready' | 'unknown';
  cpu_allocatable: number | null;
  memory_allocatable_mb: number | null;
  pods_allocatable: number | null;
  kubernetes_version: string;
  created_at?: string;
  updated_at?: string;
}

export interface KubernetesCluster {
  resource_id: string;
  cluster_id: string;
  name: string;
  description?: string;
  status: string;
  kubernetes_version: string;
  node_count: number;
  min_nodes: number;
  max_nodes: number;
  rbac_enabled: boolean;
  network_policy_enabled: boolean;
  enabled_addons: string[];
  api_endpoint?: string;
  region: string;
  nodes?: KubernetesNode[];
}

export interface CreateKubernetesClusterPayload {
  name: string;
  description?: string;
  kubernetes_version: string;
  node_count: number;
  min_nodes: number;
  max_nodes: number;
  region: string;
  enabled_addons: string[];
  rbac_enabled: boolean;
  network_policy_enabled: boolean;
}

export interface ClusterMetrics {
  cpu_percent: number;
  memory_percent: number;
  pod_health_percent: number;
  node_count: number;
  running_nodes: number;
}

export interface ServerlessFunction {
  resource_id: string;
  function_id: string;
  name: string;
  description?: string;
  runtime: string;
  handler: string;
  code_uri: string;
  memory_mb: number;
  timeout_seconds: number;
  status: string;
  invocation_count: number;
  last_invoked_at?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateServerlessFunctionPayload {
  name: string;
  description?: string;
  runtime: string;
  handler: string;
  code_uri: string;
  memory_mb: number;
  timeout_seconds: number;
  environment_variables?: Record<string, string>;
}
