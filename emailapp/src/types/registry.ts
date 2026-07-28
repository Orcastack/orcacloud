// OrcaCloud – Container Registry TypeScript Types

export type RepoVisibility = 'private' | 'public';
export type RepoStatus     = 'active' | 'deleting' | 'error';
export type TokenScope     = 'pull' | 'push' | 'admin';
export type ScanStatus     = 'pending' | 'scanning' | 'clean' | 'vulnerable' | 'error';
export type ReplicationMode = 'sync' | 'async' | 'on_demand';

export type RegistryRegion =
  | 'af-south-1' | 'eu-west-1' | 'ap-south-1' | 'us-east-1' | 'us-west-1';

// ── Vulnerability count ───────────────────────────────────────────────────────
export interface VulnCount {
  critical: number;
  high:     number;
  medium:   number;
  low:      number;
}

// ── Container Image (tag) ─────────────────────────────────────────────────────
export interface ContainerImage {
  id:                  string;
  tag:                 string;
  digest:              string;
  size_mb:             number;
  architecture:        string;
  os:                  string;
  pushed_by:           string;
  scan_status:         ScanStatus;
  vulnerability_count: VulnCount;
  layer_count:         number;
  created_at:          string;
  pull_command:        string;
}

// ── Registry Access Token ─────────────────────────────────────────────────────
export interface RegistryToken {
  id:              string;
  name:            string;
  token_masked:    string;  // full token immediately after create/rotate, masked after
  scope:           TokenScope;
  repository:      string | null;
  repository_name: string | null;
  expires_at:      string | null;
  is_active:       boolean;
  last_used_at:    string | null;
  created_at:      string;
}

// ── Replication Rule ──────────────────────────────────────────────────────────
export interface ReplicationRule {
  id:                   string;
  source_region:        RegistryRegion;
  source_region_display: string;
  target_region:        RegistryRegion;
  target_region_display: string;
  mode:                 ReplicationMode;
  is_active:            boolean;
  last_triggered:       string | null;
  created_at:           string;
}

// ── Usage snapshot ────────────────────────────────────────────────────────────
export interface RegistryUsage {
  storage_gb:      number;
  pull_count:      number;
  push_count:      number;
  transfer_gb:     number;
  hourly_cost_usd: string;
  created_at:      string;
}

// ── Container Repository (list) ───────────────────────────────────────────────
export interface ContainerRepository {
  id:            string;
  name:          string;
  description:   string;
  visibility:    RepoVisibility;
  region:        RegistryRegion;
  region_display: string;
  status:        RepoStatus;
  image_count:   number;
  storage_mb:    number;
  pull_count:    number;
  push_count:    number;
  last_pushed_at: string | null;
  created_at:    string;
  full_name:     string;
  // Detail-only
  updated_at?:          string;
  push_command?:        string;
  pull_command?:        string;
  login_command?:       string;
  images?:              ContainerImage[];
  tokens?:              RegistryToken[];
  replication_rules?:   ReplicationRule[];
  latest_usage?:        RegistryUsage | null;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateRepositoryPayload {
  name:        string;
  description?: string;
  visibility:  RepoVisibility;
  region:      RegistryRegion;
}

export interface CreateTokenPayload {
  name:          string;
  scope:         TokenScope;
  repository_id?: string;
  expires_days?:  number;
}

export interface ReplicatePayload {
  target_region: RegistryRegion;
  mode?:         ReplicationMode;
}

// ── Region catalogue ──────────────────────────────────────────────────────────
export interface RegistryRegionMeta {
  region: RegistryRegion;
  label:  string;
}

// ── Scan result ───────────────────────────────────────────────────────────────
export interface ScanResult {
  tag:             string;
  digest:          string;
  scan_status:     ScanStatus;
  vulnerabilities: VulnCount;
  message:         string;
}
