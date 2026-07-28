// OrcaCloud – Managed Database TypeScript Types

export type DBEngine =
  | 'postgresql' | 'mysql' | 'mariadb'
  | 'mongodb' | 'redis'
  | 'clickhouse' | 'cassandra';

export type DBStatus =
  | 'provisioning' | 'running' | 'stopped'
  | 'restarting' | 'scaling' | 'deleting' | 'error' | 'backup';

export type DBTenancy = 'shared' | 'dedicated' | 'cluster';
export type DBRegion  = 'af-south-1' | 'eu-west-1' | 'ap-south-1' | 'us-east-1' | 'us-west-1';
export type BackupType = 'automated' | 'manual' | 'pitr';
export type BackupStatus = 'running' | 'completed' | 'failed';
export type DBRole = 'admin' | 'readwrite' | 'readonly';

// ── Engine catalogue (from /databases/engines/) ────────────────────────────
export interface DBEngineCatalogue {
  engine:   DBEngine;
  label:    string;
  versions: string[];
}

// ── Credential ────────────────────────────────────────────────────────────
export interface DBCredential {
  id:              number;
  username:        string;
  password:        string;   // masked '••••••••' in list, plaintext on create/rotate
  role:            DBRole;
  is_active:       boolean;
  last_rotated_at: string | null;
  created_at:      string;
}

// ── Backup record ─────────────────────────────────────────────────────────
export interface DBBackup {
  backup_id:   string;
  backup_type: BackupType;
  status:      BackupStatus;
  size_gb:     number;
  duration_s:  number;
  expires_at:  string | null;
  created_at:  string;
}

// ── Metric snapshot ───────────────────────────────────────────────────────
export interface DBMetric {
  id:                    number;
  cpu_percent:           number | null;
  memory_percent:        number | null;
  storage_used_gb:       number | null;
  active_connections:    number | null;
  queries_per_second:    number | null;
  avg_query_latency_ms:  number | null;
  replication_lag_ms:    number | null;
  iops_read:             number | null;
  iops_write:            number | null;
  created_at:            string;
}

// ── Main database record ──────────────────────────────────────────────────
export interface ManagedDatabase {
  id:                      string;
  name:                    string;
  description:             string;
  engine:                  DBEngine;
  engine_display:          string;
  version:                 string;
  tenancy_model:           DBTenancy;
  vcpus:                   number;
  memory_mb:               number;
  storage_gb:              number;
  read_replicas:           number;
  region:                  DBRegion;
  region_display:          string;
  status:                  DBStatus;
  host:                    string;
  port:                    number;
  database_name:           string;
  connection_uri:          string;
  ssl_enabled:             boolean;
  publicly_accessible:     boolean;
  backup_enabled:          boolean;
  backup_retention_days:   number;
  last_backup_at:          string | null;
  current_storage_gb:      number;
  connection_count:        number;
  hourly_cost_usd:         string;
  created_at:              string;
  updated_at:              string;
  provisioned_at:          string | null;
  default_port:            number;
  // Detail only
  allowed_ips?:    string[];
  vpc_id?:         string;
  credentials?:    DBCredential[];
  backups?:        DBBackup[];
  latest_metric?:  DBMetric | null;
  // Returned only on creation
  initial_password?: string;
}

// ── Create payload ────────────────────────────────────────────────────────
export interface CreateDatabasePayload {
  name:                  string;
  description?:          string;
  engine:                DBEngine;
  version:               string;
  tenancy_model:         DBTenancy;
  vcpus:                 number;
  memory_mb:             number;
  storage_gb:            number;
  read_replicas:         number;
  region:                DBRegion;
  database_name:         string;
  ssl_enabled:           boolean;
  publicly_accessible:   boolean;
  backup_enabled:        boolean;
  backup_retention_days: number;
  allowed_ips:           string[];
  hourly_cost_usd:       number;
}

// ── Migration ───────────────────────────────────────────────────────────────
export type DBMigrationStrategy = 'full_copy' | 'schema_only' | 'data_only' | 'incremental';

export interface MigratePayload {
  target_id:       string;
  strategy:        DBMigrationStrategy;
  tables:          string[];   // empty = all
  truncate_target: boolean;
  dry_run:         boolean;
}

export interface DBMigrationResult {
  migration_id:    string;
  status:          'completed' | 'simulated' | 'failed';
  dry_run:         boolean;
  source:          { id: string; name: string; engine: DBEngine };
  target:          { id: string; name: string; engine: DBEngine };
  strategy:        DBMigrationStrategy;
  tables:          string[] | string;
  tables_migrated: number;
  rows_migrated:   number;
  duration_s:      number;
  truncate_target: boolean;
  warnings:        string[];
  message:         string;
}

// ── Scale payload ─────────────────────────────────────────────────────────
export interface ScaleDatabasePayload {
  vcpus?:         number;
  memory_mb?:     number;
  storage_gb?:    number;
  read_replicas?: number;
}

// ── Plan / pricing helpers ────────────────────────────────────────────────
export interface DBPlan {
  id:          string;
  label:       string;
  vcpus:       number;
  memory_mb:   number;
  storage_gb:  number;
  hourly_usd:  number;
  recommended?: boolean;
}

export const DB_PLANS: DBPlan[] = [
  { id: 'starter',  label: 'Starter',      vcpus: 1, memory_mb: 1024,  storage_gb: 20,  hourly_usd: 0.015 },
  { id: 'basic',    label: 'Basic',        vcpus: 2, memory_mb: 2048,  storage_gb: 50,  hourly_usd: 0.030 },
  { id: 'standard', label: 'Standard',     vcpus: 4, memory_mb: 8192,  storage_gb: 100, hourly_usd: 0.075, recommended: true },
  { id: 'pro',      label: 'Professional', vcpus: 8, memory_mb: 16384, storage_gb: 250, hourly_usd: 0.140 },
  { id: 'enterprise', label: 'Enterprise', vcpus: 16, memory_mb: 65536, storage_gb: 1000, hourly_usd: 0.450 },
];

export const ENGINE_META: Record<DBEngine, {
  color: string; category: string; icon: string; description: string;
}> = {
  postgresql: { color: '#336791', category: 'SQL',       icon: 'PG',  description: 'Advanced open-source SQL, ACID compliant' },
  mysql:      { color: '#4479A1', category: 'SQL',       icon: 'MY',  description: 'The world\'s most popular open-source SQL database' },
  mariadb:    { color: '#C0765A', category: 'SQL',       icon: 'MA',  description: 'MySQL-compatible with extra features' },
  mongodb:    { color: '#47A248', category: 'NoSQL',     icon: 'MG',  description: 'Document-based, horizontally scalable' },
  redis:      { color: '#DC382D', category: 'Cache',     icon: 'RD',  description: 'In-memory data structure store, ultra-fast' },
  clickhouse: { color: '#FFCC01', category: 'Analytics', icon: 'CH',  description: 'Columnar OLAP for real-time analytics' },
  cassandra:  { color: '#1287B1', category: 'Distributed', icon: 'CA', description: 'Masterless, multi-region, high write throughput' },
};
