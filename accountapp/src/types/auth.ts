// Authentication Types

export type SocialProvider = 'github' | 'google' | 'gitlab' | 'linkedin';

export interface SocialLoginRequest {
  provider: SocialProvider;
  code: string;
  redirect_uri: string;
}

export interface SocialLoginResponse {
  message: string;
  token: string;
  user: User;
  is_new_user: boolean;
}

export type UserType = 'individual' | 'organization';

export interface User {
  id: number;
  uuid?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
  skills: string[];
  is_active: boolean;
  is_admin?: boolean;
  role?: string;
  user_type: UserType;
  date_joined: string;
  last_login?: string;
  organization?: Organization;
}

export interface Organization {
  id: number;
  name: string;
  domain: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  is_registered: boolean;
  registration_date?: string;
  subscription_plan?: string;
  features_enabled: string[];
}

export interface OrganizationRegistrationRequest {
  name: string;
  domain: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user: User;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
}

export interface SignupResponse {
  message: string;
  token: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isOrganizationRegistered: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  isIndividualUser: boolean;
  isOrganizationUser: boolean;
  userDashboardType: 'individual' | 'organization' | null;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (userData: SignupRequest) => Promise<void>;
  signupOrganization: (userData: SignupRequest, orgData: OrganizationRegistrationRequest) => Promise<void>;
  socialLogin: (provider: SocialProvider) => Promise<void>;
  registerOrganization: (orgData: OrganizationRegistrationRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export interface CommunityMember {
  id: number;
  user: User;
  role: 'member' | 'contributor' | 'maintainer' | 'admin';
  contributions: number;
  reputation: number;
  badges: string[];
  joined_date: string;
  last_active: string;
}

export interface Discussion {
  id: number;
  title: string;
  content: string;
  author: User;
  category: 'general' | 'help' | 'showcase' | 'feedback' | 'ideas';
  tags: string[];
  likes: number;
  replies: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscussionReply {
  id: number;
  content: string;
  author: User;
  discussion: number;
  parent_reply?: number;
  likes: number;
  created_at: string;
  updated_at: string;
}
