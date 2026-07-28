/**
 * OrcaCloud – Kubernetes Cluster API Client
 * ───────────────────────────────────────────────────
 * Wraps /api/services/kubernetes-clusters/ endpoints.
 * Backed by compute.KubernetesClusterViewSet.
 */

import client from './apiClient';

const BASE = '/api/services/kubernetes-clusters';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClusterStatus =
  | 'pending'
  | 'provisioning'
  | 'running'
  | 'stopped'
  | 'error'
  | 'deleting';

export const K8S_VERSIONS = ['1.30.0', '1.29.0', '1.28.0', '1.27.0'];

export const CLUSTER_REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
];

export const CLUSTER_ADDONS = [
  { id: 'metrics-server',  label: 'Metrics Server' },
  { id: 'ingress-nginx',   label: 'NGINX Ingress' },
  { id: 'cert-manager',    label: 'Cert Manager' },
  { id: 'storage-class',   label: 'Storage Class' },
  { id: 'dashboard',       label: 'Kubernetes Dashboard' },
];

export interface KubernetesCluster {
  resource_id: string;
  cluster_id: string;
  name: string;
  description?: string;
  status: ClusterStatus;
  kubernetes_version: string;
  node_count: number;
  node_count_actual?: number;
  region: string;
  auto_scaling_enabled: boolean;
  min_nodes: number;
  max_nodes: number;
  rbac_enabled: boolean;
  network_policy_enabled: boolean;
  enabled_addons: string[];
  api_endpoint?: string;
  owner_username?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateClusterPayload {
  name: string;
  description?: string;
  kubernetes_version?: string;
  node_count?: number;
  region?: string;
  auto_scaling_enabled?: boolean;
  min_nodes?: number;
  max_nodes?: number;
  rbac_enabled?: boolean;
  network_policy_enabled?: boolean;
  enabled_addons?: string[];
  cluster_ip_range?: string;
  service_ip_range?: string;
}

function unwrap<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : ((data as any)?.results ?? []);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function listClusters(): Promise<KubernetesCluster[]> {
  const { data } = await client.get(`${BASE}/`);
  return unwrap<KubernetesCluster>(data);
}

export async function getCluster(resourceId: string): Promise<KubernetesCluster> {
  const { data } = await client.get(`${BASE}/${resourceId}/`);
  return data;
}

export async function createCluster(payload: CreateClusterPayload): Promise<KubernetesCluster> {
  const { data } = await client.post(`${BASE}/`, payload);
  return data;
}

export async function deleteCluster(resourceId: string): Promise<void> {
  await client.delete(`${BASE}/${resourceId}/`);
}

export async function scaleCluster(
  resourceId: string,
  desiredCount: number,
): Promise<{ status: string; node_count: number }> {
  const { data } = await client.post(`${BASE}/${resourceId}/scale/`, {
    desired_count: desiredCount,
  });
  return data;
}

export async function getClusterNodes(resourceId: string): Promise<unknown[]> {
  const { data } = await client.get(`${BASE}/${resourceId}/nodes/`);
  return Array.isArray(data) ? data : (data?.results ?? []);
}
