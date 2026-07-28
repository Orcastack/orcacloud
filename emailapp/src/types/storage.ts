// OrcaCloud – Cloud Storage type definitions

export type StorageClass =
  | 'standard'
  | 'standard-ia'
  | 'intelligent-tiering'
  | 'glacier'
  | 'deep-archive';

export type BucketACL =
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'authenticated-read';

export type EncryptionType = 'sse-s3' | 'sse-kms' | 'cse-kms';

export type VolumeType = 'gp3' | 'gp2' | 'io2' | 'io1' | 'st1' | 'sc1';

// ── Bucket ────────────────────────────────────────────────────────────────

export interface StorageBucket {
  resource_id: string;
  bucket_id: string;
  bucket_name: string;
  region: string;
  status: string;
  acl: BucketACL;
  versioning_enabled: boolean;
  mfa_delete_enabled: boolean;
  encryption_enabled: boolean;
  encryption_type: EncryptionType;
  kms_key_id: string;
  logging_enabled: boolean;
  log_target_bucket: string;
  log_prefix: string;
  total_objects: number;
  total_size_bytes: number;
  total_size_gb: number;
  owner_username: string;
  created_at: string;
  // detail-only
  object_count?: number;
  tags?: Record<string, string>;
  s3_objects?: S3Object[];
  lifecycle_rules?: LifecycleRule[];
}

export interface CreateBucketPayload {
  bucket_name: string;
  region: string;
  acl: BucketACL;
  versioning_enabled: boolean;
  encryption_enabled: boolean;
  encryption_type: EncryptionType;
  storage_class?: StorageClass;
}

// ── S3 Object ─────────────────────────────────────────────────────────────

export interface S3Object {
  id: string;
  object_key: string;
  size_bytes: number;
  content_type: string;
  etag: string;
  version_id: string;
  is_latest: boolean;
  metadata: Record<string, string>;
  tags: Record<string, string>;
  storage_class: StorageClass;
  is_public: boolean;
  acl: BucketACL;
  last_modified: string;
  created_at: string;
}

// ── Volume ────────────────────────────────────────────────────────────────

export interface StorageVolume {
  resource_id: string;
  volume_id: string;
  size_gb: number;
  volume_type: VolumeType;
  iops: number;
  throughput_mbps: number;
  region: string;
  availability_zone: string;
  attached_to_instance: string;
  attachment_device: string;
  is_attached: boolean;
  attached_at: string;
  encryption_enabled: boolean;
  kms_key_id: string;
  status: string;
  delete_on_termination: boolean;
  created_at: string;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export interface LifecycleRule {
  id: string;
  prefix: string;
  status: 'Enabled' | 'Disabled';
  transition_days_cold: number;
  transition_days_archive: number;
  expiration_days: number;
}

// ── Storage class catalogue ───────────────────────────────────────────────

export interface StorageClassInfo {
  id: StorageClass;
  name: string;
  description: string;
  durability: string;
  availability: string;
  price_gb: number;
}

// ── Region ────────────────────────────────────────────────────────────────

export interface StorageRegion {
  id: string;
  name: string;
  flag: string;
}

// ── Presigned URL ─────────────────────────────────────────────────────────

export interface PresignedUrlResult {
  url: string;
  expires_at: string;
  method: string;
  object_key: string;
  bucket: string;
}

// ── Swift sync result ─────────────────────────────────────────────────────

export interface SwiftSyncResult {
  success: boolean;
  bucket_name?: string;
  region?: string;
  status?: string;
  endpoint?: string;
  mock?: boolean;
  error?: string;
}
