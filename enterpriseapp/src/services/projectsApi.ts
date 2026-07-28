import apiClient from './apiClient';
import type { ContextListParams } from './resourceContext';

export interface BackendProject {
  id:                  string;
  owner?:              number;
  owner_username?:     string;
  created_by?:         number | null;
  created_by_username?: string | null;
  name:                string;
  project_key:         string;
  namespace:           string;
  description:         string;
  visibility:          'private' | 'team' | 'public';
  avatar_color:        string;
  last_activity:       string | null;
  repo_count:          number;
  pipeline_count:      number;
  has_repo:            boolean;
  /** 'personal' | 'workspace' | 'group' */
  context?:            'personal' | 'workspace' | 'group';
  workspace_id?:       string;
  workspace_name?:     string;
  group_id?:           string;
  group_name?:         string;
  // Context-aware architecture fields
  /** 'enterprise' | 'developer' — role identity at creation time */
  created_by_role?:    'enterprise' | 'developer';
  /** Owning entity ID: enterprise org slug, group id, or '' */
  parent_context_id?:  string;
  /** Frontend URL to navigate back to from this project */
  return_path?:        string;
  created_at?:         string;
  updated_at?:         string;
}

export interface ProjectStats {
  repo_count:        number;
  pipeline_count:    number;
  environment_count: number;
  has_repo:          boolean;
}

export interface CreateBackendProjectPayload {
  name:           string;
  project_key?:   string;
  description?:   string;
  visibility?:    'private' | 'team' | 'public';
  avatar_color?:  string;
  /** Where this project is being created from */
  context?:       'personal' | 'workspace' | 'group';
  workspace_id?:  string;
  workspace_name?: string;
  group_id?:      string;
  group_name?:    string;
  // Context-aware architecture fields
  /** Set from current URL via getResourceOrigin() */
  created_by_role?:   'enterprise' | 'developer';
  parent_context_id?: string;
  return_path?:       string;
}

/**
 * List projects for the current user filtered by dashboard context.
 *
 * Pass no args to list all user projects (backward compatible).
 * Pass `{ dashboard: 'developer' }` for only developer-created projects.
 * Pass `{ dashboard: 'enterprise', parent_context_id: orgSlug }` for enterprise projects.
 * Pass `{ dashboard: 'group', parent_context_id: groupId }` for group projects.
 */
export async function listProjects(params?: ContextListParams): Promise<BackendProject[]> {
  const response = await apiClient.get<BackendProject[] | { results: BackendProject[]; count: number }>(
    '/api/services/pipelines/projects/',
    params ? { params } : undefined,
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function createProject(payload: CreateBackendProjectPayload): Promise<BackendProject> {
  const response = await apiClient.post<BackendProject>('/api/services/pipelines/projects/', payload);
  return response.data;
}

export async function getProject(projectId: string): Promise<BackendProject> {
  if (!projectId || projectId === 'new' || projectId === 'create') {
    throw new Error('Invalid project id for detail endpoint.');
  }
  const response = await apiClient.get<BackendProject>(`/api/services/pipelines/projects/${projectId}/`);
  return response.data;
}

export async function updateProject(projectId: string, payload: Partial<CreateBackendProjectPayload>): Promise<BackendProject> {
  const response = await apiClient.patch<BackendProject>(`/api/services/pipelines/projects/${projectId}/`, payload);
  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!projectId || projectId === 'new' || projectId === 'create') {
    throw new Error('Invalid project id for delete endpoint.');
  }
  await apiClient.delete(`/api/services/pipelines/projects/${projectId}/`);
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const response = await apiClient.get<ProjectStats>(`/api/services/pipelines/projects/${projectId}/stats/`);
  return response.data;
}

export interface BackendRepository {
  id:              string;
  project:         string | null;
  project_name?:   string | null;
  owner?:              string | null;
  owner_username?:     string | null;
  created_by?:         string | null;
  created_by_username?: string | null;
  provider:            string;
  repo_name:       string;
  repo_description?: string;
  visibility?:     'private' | 'public' | 'team';
  default_branch:  string;
  is_bare?:        boolean;
  disk_path?:      string;
  storage_bucket?: string;
  clone_https_url?: string;
  clone_ssh_url?:   string;
  workspace_id?:    string;
  workspace_name?:  string;
  group_id?:        string;
  group_name?:      string;
  created_at?:     string;
  updated_at?:     string;
}

export interface CreateStandaloneRepoPayload {
  repo_name:        string;
  repo_description?: string;
  visibility:       'private' | 'public';
  default_branch:   string;
  workspace_id?:    string;
  workspace_name?:  string;
  group_id?:        string;
  group_name?:      string;
}

export async function listProjectRepos(projectId: string): Promise<BackendRepository[]> {
  const response = await apiClient.get<BackendRepository[] | { results: BackendRepository[] }>(
    `/api/services/pipelines/repositories/?project=${projectId}`,
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function listAllRepos(): Promise<BackendRepository[]> {
  const response = await apiClient.get<BackendRepository[] | { results: BackendRepository[] }>(
    `/api/services/pipelines/repositories/`,
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function listReposByWorkspace(workspaceId: string): Promise<BackendRepository[]> {
  const response = await apiClient.get<BackendRepository[] | { results: BackendRepository[] }>(
    `/api/services/pipelines/repositories/?workspace_id=${workspaceId}`,
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function listReposByGroup(groupId: string): Promise<BackendRepository[]> {
  const response = await apiClient.get<BackendRepository[] | { results: BackendRepository[] }>(
    `/api/services/pipelines/repositories/?group_id=${groupId}`,
  );
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function createStandaloneRepo(payload: CreateStandaloneRepoPayload): Promise<BackendRepository> {
  const { data } = await apiClient.post<BackendRepository>(
    `/api/services/pipelines/repositories/`,
    { ...payload, project: null },
  );
  return data;
}

export async function getRepo(repoId: string): Promise<BackendRepository> {
  const { data } = await apiClient.get<BackendRepository>(`/api/services/pipelines/repositories/${repoId}/`);
  return data;
}

export async function updateRepo(repoId: string, payload: Partial<Pick<BackendRepository, 'repo_name' | 'default_branch'>>): Promise<BackendRepository> {
  const response = await apiClient.patch<BackendRepository>(`/api/services/pipelines/repositories/${repoId}/`, payload);
  return response.data;
}

export async function deleteRepo(repoId: string): Promise<void> {
  await apiClient.delete(`/api/services/pipelines/repositories/${repoId}/`);
}

export interface TreeNode {
  name:      string;
  type:      'file' | 'dir';
  path:      string;
  content?:  string;
  children?: TreeNode[];
}

export async function getRepoTree(repoId: string): Promise<TreeNode[]> {
  const response = await apiClient.get<TreeNode[]>(
    `/api/services/pipelines/repositories/${repoId}/tree/`,
  );
  return response.data;
}

// ─── Repository rich API ──────────────────────────────────────────────────────

export interface RepoAuthor {
  name: string;
  email: string;
  avatar: string;
}

export interface RepoCommit {
  sha: string;
  short_sha: string;
  message: string;
  author: RepoAuthor;
  timestamp: string;
  branch: string;
  pipeline_status: 'success' | 'failure' | 'running' | 'skipped' | 'pending' | '';
  files_changed: number;
}

export interface RepoBranch {
  name: string;
  sha: string;
  protected: boolean;
  ahead: number;
  behind: number;
  last_commit_message: string;
  last_commit_date: string;
}

export interface RepoTag {
  name: string;
  sha: string;
  message: string;
  date: string;
}

export interface BlameHunk {
  line_number: number;
  content: string;
  sha: string;
  short_sha: string;
  author: string;
  email: string;
  message: string;
  date: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
}

export interface DiffChunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}

export interface DiffResult {
  base: string;
  head: string;
  total_additions: number;
  total_deletions: number;
  files: DiffFile[];
}

export interface SearchResultMatch {
  line: number;
  content: string;
}

export interface SearchResult {
  type: 'code' | 'file';
  path: string;
  name: string;
  node_type?: string;
  matches?: SearchResultMatch[];
  total_matches?: number;
}

export interface FileDetail {
  path: string;
  name: string;
  content: string;
  size: number;
  lines: number;
  type: string;
  last_commit: RepoCommit;
}

const REPO_BASE = (id: string) => `/api/services/pipelines/repositories/${id}`;

export async function getRepoBranches(repoId: string): Promise<RepoBranch[]> {
  const { data } = await apiClient.get<RepoBranch[]>(`${REPO_BASE(repoId)}/branches/`);
  return data;
}

export async function getRepoTags(repoId: string): Promise<RepoTag[]> {
  const { data } = await apiClient.get<RepoTag[]>(`${REPO_BASE(repoId)}/tags/`);
  return data;
}

export async function getRepoCommits(repoId: string, branch?: string, path?: string): Promise<RepoCommit[]> {
  const params = new URLSearchParams();
  if (branch) params.set('branch', branch);
  if (path)   params.set('path', path);
  const { data } = await apiClient.get<RepoCommit[]>(`${REPO_BASE(repoId)}/commits/?${params}`);
  return data;
}

export async function getRepoFileDetail(repoId: string, path: string): Promise<FileDetail> {
  const { data } = await apiClient.get<FileDetail>(`${REPO_BASE(repoId)}/file/?path=${encodeURIComponent(path)}`);
  return data;
}

export async function getRepoBlame(repoId: string, path: string): Promise<BlameHunk[]> {
  const { data } = await apiClient.get<BlameHunk[]>(`${REPO_BASE(repoId)}/blame/?path=${encodeURIComponent(path)}`);
  return data;
}

export async function getRepoDiff(repoId: string, base: string, head: string): Promise<DiffResult> {
  const { data } = await apiClient.get<DiffResult>(`${REPO_BASE(repoId)}/diff/?base=${base}&head=${head}`);
  return data;
}

export async function searchRepo(repoId: string, query: string, type: 'code' | 'file' = 'code'): Promise<SearchResult[]> {
  const { data } = await apiClient.get<SearchResult[]>(`${REPO_BASE(repoId)}/search/?q=${encodeURIComponent(query)}&type=${type}`);
  return data;
}

export async function initRepo(repoId: string): Promise<TreeNode[]> {
  const { data } = await apiClient.post<TreeNode[]>(`${REPO_BASE(repoId)}/init/`);
  return data;
}
export async function initProjectRepo(
  projectId: string,
  repoName?: string,
): Promise<BackendRepository> {
  const { data } = await apiClient.post<BackendRepository>(
    `/api/services/pipelines/projects/${projectId}/init-repo/`,
    repoName ? { repo_name: repoName } : {},
  );
  return data;
}


// ---------------------------------------------------------------------------
// Clone URLs
// ---------------------------------------------------------------------------

export interface CloneUrls {
  https:     string;
  ssh:       string;
  repo_name: string;
}

export async function getRepoCloneUrls(repoId: string): Promise<CloneUrls> {
  const { data } = await apiClient.get<CloneUrls>(
    `${REPO_BASE(repoId)}/clone-urls/`,
  );
  return data;
}

// ---------------------------------------------------------------------------
// Import repository from external source (GitHub, GitLab, Bitbucket)
// ---------------------------------------------------------------------------

export interface ImportRepoPayload {
  source_url:   string;
  repo_name?:   string;
  project_id?:  string;
  description?: string;
  visibility?:  'private' | 'public' | 'team';
}

export async function importRepo(payload: ImportRepoPayload): Promise<BackendRepository> {
  const { data } = await apiClient.post<BackendRepository>(
    '/api/services/pipelines/repositories/import/',
    payload,
  );
  return data;
}

// ---------------------------------------------------------------------------
// SSH Keys
// ---------------------------------------------------------------------------

export interface SSHKey {
  id:          string;
  title:       string;
  public_key:  string;
  fingerprint: string;
  last_used:   string | null;
  created_at:  string;
  updated_at:  string;
}

export async function listSSHKeys(): Promise<SSHKey[]> {
  const response = await apiClient.get<SSHKey[] | { results: SSHKey[] }>('/api/services/pipelines/ssh-keys/');
  const d = response.data;
  return Array.isArray(d) ? d : (d as any).results ?? [];
}

export async function addSSHKey(title: string, publicKey: string): Promise<SSHKey> {
  const { data } = await apiClient.post<SSHKey>('/api/services/pipelines/ssh-keys/', {
    title,
    public_key: publicKey,
  });
  return data;
}

export async function deleteSSHKey(keyId: string): Promise<void> {
  await apiClient.delete(`/api/services/pipelines/ssh-keys/${keyId}/`);
}
