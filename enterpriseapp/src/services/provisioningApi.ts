/**
 * OrcaCloud – Workspace-bound Provisioning API Client
 *
 * Every call to this service MUST supply:
 *   workspace_id    – the workspace slug (e.g. "devops-team")
 *   environment_id  – one of "dev" | "staging" | "prod"
 *
 * The backend resolves workspace + environment → OpenStack project and creates
 * resources in the correct isolated tenant.
 *
 * Base URL is read from REACT_APP_API_URL (e.g. https://api.orcacloud.com/api/services)
 */

import apiClient from "./apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Environment = "dev" | "staging" | "prod";

export interface WorkspaceContext {
  workspace_id: string;
  environment_id: Environment;
}

/** Audit record returned alongside every provisioned resource */
export interface ProvisionedRecord {
  id: number;
  workspace_id: string;
  environment: Environment;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  openstack_project: string;
  region: string;
  status: string;
  metadata: Record<string, unknown>;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ── Compute ───────────────────────────────────────────────────────────────────

export interface CreateVMPayload extends WorkspaceContext {
  name: string;
  flavor_id: string;
  image_id: string;
  network_id?: string;
  key_name?: string;
  user_data?: string;
}

export interface ProvisionVMResponse {
  resource: Record<string, unknown>;
  provisioned: ProvisionedRecord;
}

export const provisionVM = (
  payload: CreateVMPayload
): Promise<ProvisionVMResponse> =>
  apiClient
    .post<ProvisionVMResponse>("/services/provision/compute/vm/", payload)
    .then((r) => r.data);

// ── Storage ───────────────────────────────────────────────────────────────────

export interface CreateVolumePayload extends WorkspaceContext {
  name: string;
  size_gb: number;
  volume_type?: string;
  description?: string;
}

export interface ProvisionVolumeResponse {
  resource: Record<string, unknown>;
  provisioned: ProvisionedRecord;
}

export const provisionVolume = (
  payload: CreateVolumePayload
): Promise<ProvisionVolumeResponse> =>
  apiClient
    .post<ProvisionVolumeResponse>("/services/provision/storage/volume/", payload)
    .then((r) => r.data);

// ── Networking ────────────────────────────────────────────────────────────────

export interface CreateNetworkPayload extends WorkspaceContext {
  name: string;
  subnet_cidr?: string;
  subnet_name?: string;
}

export interface ProvisionNetworkResponse {
  network: Record<string, unknown>;
  subnet?: Record<string, unknown>;
  provisioned: ProvisionedRecord;
}

export const provisionNetwork = (
  payload: CreateNetworkPayload
): Promise<ProvisionNetworkResponse> =>
  apiClient
    .post<ProvisionNetworkResponse>("/services/provision/network/", payload)
    .then((r) => r.data);

// ── Kubernetes ────────────────────────────────────────────────────────────────

export interface CreateKubernetesPayload extends WorkspaceContext {
  name: string;
  cluster_template_id: string;
  node_count: number;
  master_count?: number;
  keypair?: string;
}

export interface ProvisionKubernetesResponse {
  resource: Record<string, unknown>;
  provisioned: ProvisionedRecord;
}

export const provisionKubernetes = (
  payload: CreateKubernetesPayload
): Promise<ProvisionKubernetesResponse> =>
  apiClient
    .post<ProvisionKubernetesResponse>(
      "/services/provision/kubernetes/cluster/",
      payload
    )
    .then((r) => r.data);

// ── Floating IP ───────────────────────────────────────────────────────────────

export interface AllocateFloatingIPPayload extends WorkspaceContext {
  network_name?: string;
  server_id?: string;
  port_id?: string;
}

export interface ProvisionFloatingIPResponse {
  resource: Record<string, unknown>;
  provisioned: ProvisionedRecord;
}

export const provisionFloatingIP = (
  payload: AllocateFloatingIPPayload
): Promise<ProvisionFloatingIPResponse> =>
  apiClient
    .post<ProvisionFloatingIPResponse>(
      "/services/provision/floating-ip/",
      payload
    )
    .then((r) => r.data);

// ── Resource inventory ────────────────────────────────────────────────────────

export interface ListResourcesResponse {
  resources: ProvisionedRecord[];
}

export const listProvisionedResources = (
  workspaceId: string,
  environment?: Environment
): Promise<ListResourcesResponse> => {
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (environment) params.environment_id = environment;

  return apiClient
    .get<ListResourcesResponse>("/services/provision/resources/", { params })
    .then((r) => r.data);
};

// ── Workspace management ──────────────────────────────────────────────────────

export interface WorkspaceBinding {
  id: number;
  workspace: number;
  environment: Environment;
  openstack_project: string;
  openstack_region: string;
  quota_vcpus: number;
  quota_ram_gb: number;
  quota_storage_gb: number;
}

export interface Workspace {
  id: number;
  workspace_id: string;
  display_name: string;
  description: string;
  owner: number;
  members: number[];
  is_active: boolean;
  created_at: string;
  bindings: WorkspaceBinding[];
}

export interface ListWorkspacesResponse {
  workspaces: Workspace[];
}

export const listWorkspaces = (): Promise<ListWorkspacesResponse> =>
  apiClient
    .get<ListWorkspacesResponse>("/services/workspaces/")
    .then((r) => r.data);
