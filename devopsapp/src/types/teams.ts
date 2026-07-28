// OrcaCloud — Team System TypeScript Types

export type TeamType = 'developer' | 'production' | 'marketing' | 'data' | 'custom';
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TeamStatus = 'active' | 'archived';
export type PortfolioType = 'developer' | 'marketing' | 'data' | 'general';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface TeamMember {
  id: number;
  user: UserSummary;
  role: TeamRole;
  joined_at: string;
}

export interface TeamPermission {
  id: number;
  permission_key: string;
  allowed: boolean;
}

export interface TeamResource {
  id: number;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  permissions: Record<string, boolean>;
  created_at: string;
}

export interface PortfolioItem {
  id: number;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  created_at: string;
}

export interface Portfolio {
  portfolio_id: string;
  name: string;
  portfolio_type: PortfolioType;
  description: string;
  item_count: number;
  items: PortfolioItem[];
  created_at: string;
  updated_at: string;
}

export interface TeamActivityLog {
  id: number;
  actor: UserSummary | null;
  action: string;
  target_type: string;
  target_id: string;
  target_name: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface TeamInvitation {
  invite_id: string;
  email: string;
  role: TeamRole;
  status: InviteStatus;
  invited_by: UserSummary;
  expires_at: string;
  created_at: string;
}

export interface TeamSummary {
  team_id: string;
  name: string;
  team_type: TeamType;
  description: string;
  avatar_color: string;
  status: TeamStatus;
  member_count: number;
  my_role: TeamRole | null;
  owner: UserSummary;
  created_at: string;
}

export interface Team extends TeamSummary {
  members: TeamMember[];
  permissions: TeamPermission[];
  portfolios: Portfolio[];
  resources: TeamResource[];
  updated_at: string;
}

export interface CreateTeamPayload {
  name: string;
  team_type: TeamType;
  description?: string;
  avatar_color?: string;
  members?: { user_id: number; role: TeamRole }[];
  apply_template?: boolean;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
  avatar_color?: string;
  status?: TeamStatus;
}

export interface AddMemberPayload {
  user_id: number;
  role: TeamRole;
}

export interface AttachResourcePayload {
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  permissions?: Record<string, boolean>;
}

export interface CreatePortfolioPayload {
  name: string;
  portfolio_type: PortfolioType;
  description?: string;
}

export interface CreateInvitationPayload {
  email: string;
  role: TeamRole;
}

export const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  developer:  'Developer Team',
  production: 'Production / Ops',
  marketing:  'Marketing Team',
  data:       'Data / Science',
  custom:     'Custom Team',
};

export const TEAM_TYPE_COLORS: Record<TeamType, string> = {
  developer:  '#153d75',
  production: '#F59E0B',
  marketing:  '#A855F7',
  data:       '#22C55E',
  custom:     '#6B7280',
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  owner:  '#EF4444',
  admin:  '#F59E0B',
  member: '#22C55E',
  viewer: '#6B7280',
};
