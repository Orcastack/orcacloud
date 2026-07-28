import axios from 'axios';
import { config } from '../config/environment';
import {
  Project,
  Team,
  FocusArea,
  Resource,
  ResourceCategory,
  CommunityLink,
  FAQ,
  ContactPerson,
  ContactMessage,
  OfficeLocation,
  Technology
} from '../types/api';

// Create axios instance with base configuration
const ____api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for CORS in production
  withCredentials: config.ENVIRONMENT === 'production',
});

// Request interceptor for adding auth token
____api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
____api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Projects API
export const projectsApi = {
  getAll: () => ____api.get<Project[]>('/projects/'),
  getBySlug: (slug: string) => ____api.get<Project>(`/projects/${slug}/`),
  getFeatured: () => ____api.get<Project[]>('/projects/?featured=true'),
  getByStatus: () => ____api.get<{[key: string]: Project[]}>('/projects/by_status/'),
};

// Teams API
export const teamsApi = {
  // Basic team endpoints
  getAll: () => ____api.get<Team[]>('/teams/'),
  getBySlug: (slug: string) => ____api.get<Team>(`/teams/${slug}/`),
  getMembers: (slug: string) => ____api.get(`/teams/${slug}/members/`),
  getSkills: (slug: string) => ____api.get(`/teams/${slug}/skills/`),

  // Enterprise-specific helpers used by pages/components
  list: (enterpriseId: string) => ____api.get<Team[]>(`/enterprises/${enterpriseId}/teams/`),
  create: (enterpriseId: string, data: any) => ____api.post(`/enterprises/${enterpriseId}/teams/`, data),

  // Membership flow
  join: (slug: string, data?: { membership_type?: string; role?: string; bio?: string }) =>
    ____api.post(`/teams/${slug}/join/`, data),
  leave: (slug: string) => ____api.post(`/teams/${slug}/leave/`),
  getMembership: (slug: string) => ____api.get(`/teams/${slug}/membership/`),

  // Team auth (if used)
  teamLogin: (data: { username: string; password: string; team_slug: string }) =>
    ____api.post('/auth/team-login/', data),
};

// Focus Areas API
export const focusAreasApi = {
  getAll: () => ____api.get<FocusArea[]>('/focus-areas/'),
  getBySlug: (slug: string) => ____api.get<FocusArea>(`/focus-areas/${slug}/`),
  getTechnologies: (slug: string) => ____api.get(`/focus-areas/${slug}/technologies/`),
  getSolutions: (slug: string) => ____api.get(`/focus-areas/${slug}/solutions/`),
};

// Resources API
export const ___resourcesApi = {
  getCategories: () => ____api.get<ResourceCategory[]>('/resource-categories/'),
  getResources: () => ____api.get<Resource[]>('/resources/'),
  getResourceBySlug: (slug: string) => ____api.get<Resource>(`/resources/${slug}/`),
  getFeaturedResources: () => ____api.get<Resource[]>('/resources/?featured=true'),
  getResourcesByCategory: () => ____api.get('/resources/by_category/'),
  getCommunityLinks: () => ____api.get<CommunityLink[]>('/community-links/'),
  getFAQs: () => ____api.get<FAQ[]>('/faqs/'),
  getFeaturedFAQs: () => ____api.get<FAQ[]>('/faqs/?featured=true'),
  getFAQsByCategory: () => ____api.get('/faqs/by_category/'),
};

// Contact API
export const contactApi = {
  getContacts: () => ____api.get<ContactPerson[]>('/contact-persons/'),
  getPrimaryContacts: () => ____api.get<ContactPerson[]>('/contact-persons/?is_primary=true'),
  getOfficeLocations: () => ____api.get<OfficeLocation[]>('/office-locations/'),
  getHeadquarters: () => ____api.get<OfficeLocation>('/office-locations/?is_headquarters=true'),
  sendMessage: (message: ContactMessage) => ____api.post('/contact-messages/', message),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => ____api.get('/dashboard/stats/'),
  getUserProfile: () => ____api.get('/dashboard/profile/'),
};

// Service functions for easier use
export const ____projectService = {
  getProjects: async (): Promise<Project[]> => {
    const response = await projectsApi.getAll();
    return response.data;
  },
  getProject: async (slug: string): Promise<Project> => {
    const response = await projectsApi.getBySlug(slug);
    return response.data;
  },
  getFeaturedProjects: async (): Promise<Project[]> => {
    const response = await projectsApi.getFeatured();
    return response.data;
  }
};

export const ____technologyService = {
  getTechnologies: async (): Promise<Technology[]> => {
    // For now, return a mock list since we don't have a technologies endpoint yet
    return [
      { id: 1, name: 'React', description: 'Frontend framework' },
      { id: 2, name: 'Django', description: 'Backend framework' },
      { id: 3, name: 'TypeScript', description: 'Programming language' },
      { id: 4, name: 'Python', description: 'Programming language' },
      { id: 5, name: 'PostgreSQL', description: 'Database' },
      { id: 6, name: 'Docker', description: 'Containerization' },
    ];
  }
};

export const ____focusAreaService = {
  getFocusAreas: async (): Promise<FocusArea[]> => {
    const response = await focusAreasApi.getAll();
    return response.data;
  },
  getFocusArea: async (slug: string): Promise<FocusArea> => {
    const response = await focusAreasApi.getBySlug(slug);
    return response.data;
  }
};

export default ____api;
