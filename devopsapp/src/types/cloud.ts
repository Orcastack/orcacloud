// OrcaCloud – TypeScript types for Onboarding Dashboard

// ---- Onboarding ----

export interface OnboardingProgress {
  id: string;
  verify_email: boolean;
  add_ssh_key: boolean;
  create_vm: boolean;
  configure_network: boolean;
  attach_volume: boolean;
  explore_dashboard: boolean;
  completion_pct: number;
  completed_steps: string[];
  updated_at: string;
}

export interface OnboardingStepDef {
  key: keyof Omit<OnboardingProgress, 'id' | 'completion_pct' | 'completed_steps' | 'updated_at'>;
  label: string;
  description: string;
  actionLabel: string;
  actionPath?: string;
}

// ---- Dashboard Stats ----

export interface ComputeStats {
  total_vms: number;
  running: number;
  stopped: number;
}

export interface StorageStats {
  total_volumes: number;
  attached: number;
  detached: number;
}

export interface NetworkingStats {
  vpcs: number;
  security_groups: number;
}

export interface AccountInfo {
  username: string;
  email: string;
  role: string;
  billing_status: string;
  completion_pct: number;
}

export interface DashboardStats {
  compute: ComputeStats;
  storage: StorageStats;
  networking: NetworkingStats;
  account: AccountInfo;
}

// ---- Wizard Options ----

export interface CloudImage {
  image_id: string;
  name: string;
  os_name: string;
  os_type: 'linux' | 'windows' | 'custom';
  os_version: string;
}

export interface CloudFlavor {
  flavor_id: string;
  name: string;
  vcpus: number;
  memory_mb: number;
  disk_gb: number;
  hourly_cost_usd: string;
  is_gpu: boolean;
}

export interface CloudNetwork {
  id: string;
  name: string;
}

export interface WizardOptions {
  images: CloudImage[];
  flavors: CloudFlavor[];
  networks: CloudNetwork[];
}

// ---- Server Create ----

export interface CreateServerPayload {
  name: string;
  image: string;      // image_id
  flavor: string;     // flavor_id
  network?: string;   // VPC id
  key_name?: string;
}

// ---- VM Instance (OpenStack /cloud/servers/) ----

export type VMStatus =
  | 'ACTIVE'
  | 'SHUTOFF'
  | 'BUILD'
  | 'ERROR'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'REBOOT'
  | 'HARD_REBOOT'
  | 'DELETED';

export interface VMInstance {
  id: string;
  name: string;
  status: VMStatus;
  ip_address: string | null;
  flavor: { id: string; name?: string };
  image: { id: string; name?: string };
  availability_zone: string;
  created_at: string;
  updated_at: string;
  key_name: string | null;
  security_groups: string[];
}

export interface CreateVMPayload {
  name: string;
  image_id: string;
  flavor_id: string;
  network_id?: string;
  key_name?: string;
  wait?: boolean;
}
