// API Types for OrcaCloud

export interface Technology {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  website_url?: string;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  overview: string;
  description: string;
  image?: string;
  technologies: Technology[];
  status: 'active' | 'development' | 'completed' | 'paused';
  website_url?: string;
  github_url?: string;
  documentation_url?: string;
  is_featured: boolean;
  focus_areas: FocusArea[];
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  features: ProjectFeature[];
  images: ProjectImage[];
}

export interface ProjectFeature {
  id: number;
  title: string;
  description: string;
  icon?: string;
  order: number;
}

export interface ProjectImage {
  id: number;
  image: string;
  caption?: string;
  is_featured: boolean;
  order: number;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  mission: string;
  description: string;
  image?: string;
  color_theme: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members: TeamMember[];
  skills: TeamSkill[];
  membership_count?: number;
}

export interface TeamMembership {
  id: number;
  user: number;
  user_username: string;
  user_email: string;
  team: number;
  team_name: string;
  team_slug: string;
  membership_type: 'free' | 'premium' | 'lead' | 'admin';
  joined_at: string;
  is_active: boolean;
  last_login?: string;
  role?: string;
  bio?: string;
}

export interface UserTeamMembership {
  id: number;
  team: number;
  team_name: string;
  team_slug: string;
  team_mission: string;
  team_color_theme: string;
  membership_type: 'free' | 'premium' | 'lead' | 'admin';
  joined_at: string;
  is_active: boolean;
  last_login?: string;
  role?: string;
  bio?: string;
}

export interface TeamJoinRequest {
  membership_type?: 'free' | 'premium' | 'lead' | 'admin';
  role?: string;
  bio?: string;
}

export interface TeamLoginRequest {
  username: string;
  password: string;
  team_slug: string;
}

export interface TeamLoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
  team: {
    id: number;
    name: string;
    slug: string;
    membership_type: 'free' | 'premium' | 'lead' | 'admin';
    role?: string;
  };
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  email?: string;
  linkedin_url?: string;
  github_url?: string;
  is_lead: boolean;
  join_date: string;
  order: number;
}

export interface TeamSkill {
  id: number;
  name: string;
  description?: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface FocusArea {
  id: number;
  name: string;
  slug: string;
  description: string;
  detailed_description?: string;
  icon?: string;
  image?: string;
  color_theme: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  technologies: FocusAreaTechnology[];
  solutions: FocusAreaSolution[];
}

export interface FocusAreaTechnology {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  website_url?: string;
}

export interface FocusAreaSolution {
  id: number;
  title: string;
  description: string;
  benefits: string[];
  use_cases: string[];
  order: number;
}

export interface ResourceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  resource_count: number;
}

export interface Resource {
  id: number;
  title: string;
  slug: string;
  category: number;
  category_name: string;
  description: string;
  content?: string;
  resource_type: 'guideline' | 'documentation' | 'tutorial' | 'template' | 'tool' | 'link';
  external_url?: string;
  file_attachment?: string;
  tags: string[];
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityLink {
  id: number;
  platform: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  order: number;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category?: string;
  is_featured: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactPerson {
  id: number;
  name: string;
  title: string;
  department?: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  linkedin_url?: string;
  is_primary: boolean;
  is_active: boolean;
  order: number;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  company?: string;
  phone?: string;
  message_type: 'general' | 'partnership' | 'support' | 'career' | 'media' | 'other';
}

export interface OfficeLocation {
  id: number;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  is_headquarters: boolean;
  is_active: boolean;
}
