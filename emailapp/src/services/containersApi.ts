import apiClient from './apiClient';
import type { ContainerResource } from '../components/Containers/CreateContainerWizard';

// ─── Backend → Frontend mapper ───────────────────────────────────────────────

export function fromBackend(c: any): ContainerResource {
  return {
    id:           String(c.id ?? ''),
    name:         c.name            ?? '',
    type:         c.container_type  ?? 'runtime',
    project:      c.project_name    ?? '',
    projectId:    c.project_id      ?? '',
    pipeline:     c.pipeline        ?? '',
    image:        c.image           ?? '',
    tag:          c.image_tag       ?? 'latest',
    cpu:          c.cpu             ?? 0.5,
    memory:       c.memory          ?? 1024,
    replicas:     c.replicas        ?? 1,
    autoscaling:  c.autoscaling     ?? false,
    autoscaleMin: c.autoscale_min   ?? 1,
    autoscaleMax: c.autoscale_max   ?? 10,
    autoscaleCpu: c.autoscale_cpu   ?? 70,
    expose:       c.expose          ?? 'public',
    port:         c.port            ?? 3000,
    domain:       c.domain          ?? '',
    status:       c.status          ?? 'stopped',
    lastDeployed: c.last_deployed   ?? new Date().toISOString(),
    commitSha:    c.commit_sha      ?? '',
  };
}

// ─── Frontend → Backend POST payload mapper ───────────────────────────────────

export interface ContainerCreatePayload {
  name:          string;
  description?:  string;
  container_type: string;
  project_id:    string;
  project_name:  string;
  pipeline:      string;
  image:         string;
  image_tag:     string;
  commit_sha?:   string;
  cpu:           number;
  memory:        number;
  replicas:      number;
  autoscaling:   boolean;
  autoscale_min: number;
  autoscale_max: number;
  autoscale_cpu: number;
  expose:        string;
  port:          number;
  domain:        string;
  env_vars?:     Record<string, string>;
  labels?:       Record<string, string>;
}

// ─── API functions ──────────────────────────────────────────────────────────

export async function listContainers(): Promise<ContainerResource[]> {
  const { data } = await apiClient.get<any>('/api/services/containers/');
  const items: any[] = Array.isArray(data) ? data : (data?.results ?? []);
  return items.map(fromBackend);
}

export async function createContainer(
  payload: ContainerCreatePayload,
): Promise<ContainerResource> {
  const { data } = await apiClient.post<any>('/api/services/containers/', payload);
  return fromBackend(data);
}

export async function getContainer(id: string): Promise<ContainerResource> {
  const { data } = await apiClient.get<any>(`/api/services/containers/${id}/`);
  return fromBackend(data);
}

export async function deployContainer(
  id: string,
  opts?: { image_tag?: string; commit_sha?: string },
): Promise<void> {
  await apiClient.post(`/api/services/containers/${id}/deploy/`, opts ?? {});
}

export async function stopContainer(id: string): Promise<void> {
  await apiClient.post(`/api/services/containers/${id}/stop/`);
}

export async function deleteContainer(id: string): Promise<void> {
  await apiClient.delete(`/api/services/containers/${id}/`);
}
