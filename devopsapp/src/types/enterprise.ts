export interface Enterprise {
  id: number | string;
  // legacy fields used by some UI pages/services — keep as optional aliases
  companyName?: string;
  companyUrl?: string | null;
  // another legacy alias used by UI
  domain?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  website?: string | null;
  // backend may return snake_case or camelCase depending on serializers/fetchers
  created_at?: string | null;
  updated_at?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TeamRef {
  id: number | string;
  name?: string;
  slug?: string;
  mission?: string;
}

export interface EnterpriseTeam {
  id: number | string;
  enterprise: number | string;
  team: TeamRef;
  role?: string | null;
  added_at?: string | null;
  addedAt?: string | null;
}

export interface EnterpriseGroup {
  id: number | string;
  enterprise: number | string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface MigrationRun {
  id: number | string;
  enterprise: number | string;
  run_id?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  details?: any;
}

// payloads
export interface CreateEnterprisePayload {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
}

export interface CreateTeamPayload {
  // either team_id to link existing, or name/slug/description to create
  team_id?: number | string;
  name?: string;
  slug?: string;
  description?: string;
  role?: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
}

// No anonymous default export required for type-only module
