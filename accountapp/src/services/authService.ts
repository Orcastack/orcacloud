import axios from 'axios';
import {
  User,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  CommunityMember,
  Discussion
} from '../types/auth';

// Create axios instance for auth
const ____authApi = axios.create({
  baseURL: '/api/v1/auth',
  headers: {
    'Content-Type': 'application/json',
  },
});

function ____formatAuthHeader(token: string): string {
  return token.split('.').length === 3 ? `Bearer ${token}` : `Token ${token}`
}

function ____unwrapEnvelope(payload: any) {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload.data
  }
  return payload
}

// Add request interceptor to include auth token
____authApi.interceptors.request.use((config) => {
  console.log('Auth API request:', config.method?.toUpperCase(), config.url, config.data);
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = ____formatAuthHeader(token);
  }
  return config;
});

// Add response interceptor for debugging
____authApi.interceptors.response.use(
  (response) => {
    response.data = ____unwrapEnvelope(response.data);
    console.log('Auth API response success:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Auth API response error:', error.response?.status, error.response?.data, error.message);
    return Promise.reject(error);
  }
);

// Normalize a backend user object into the frontend User shape
function normalizeUser(backendUser: any): User {
  return {
    id: backendUser.id,
    uuid: backendUser.uuid,
    username: backendUser.username,
    email: backendUser.email,
    first_name: backendUser.first_name || '',
    last_name: backendUser.last_name || '',
    avatar: backendUser.avatar,
    bio: backendUser.bio || '',
    github_url: backendUser.github_url || '',
    linkedin_url: backendUser.linkedin_url || '',
    website_url: backendUser.website_url || '',
    location: backendUser.location || '',
    skills: backendUser.skills || [],
    is_active: backendUser.is_active !== false,
    is_admin: !!(backendUser.is_staff || backendUser.is_superuser),
    role: backendUser.is_superuser ? 'admin' : (backendUser.is_staff ? 'staff' : undefined),
    date_joined: backendUser.date_joined,
    last_login: backendUser.last_login,
    user_type: backendUser.user_type || 'individual',
  } as User;
}

function normalizeAuthResponse(data: any): LoginResponse {
  return {
    message: data.message || 'Authentication successful',
    token: data.access_token || data.token,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    user: normalizeUser(data.user),
  };
}

// Auth Services
export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    console.log('AuthService login called with:', credentials);
    try {
      const response = await ____authApi.post<any>('/login/', credentials);
      console.log('AuthService login response:', response.data);

      // Normalize backend user payload to frontend User shape
      const backendUser = response.data.user;
      const normalizedUser: any = {
        id: backendUser.id,
        uuid: backendUser.uuid,
        username: backendUser.username,
        email: backendUser.email,
        first_name: backendUser.first_name,
        last_name: backendUser.last_name,
        avatar: backendUser.avatar,
        bio: backendUser.bio,
        github_url: backendUser.github_url,
        linkedin_url: backendUser.linkedin_url,
        website_url: backendUser.website_url,
        location: backendUser.location,
        skills: backendUser.skills || [],
        is_active: backendUser.is_active,
        // Map admin flags
        is_admin: !!backendUser.is_staff || !!backendUser.is_superuser,
        role: backendUser.is_superuser ? 'admin' : (backendUser.is_staff ? 'staff' : undefined),
        date_joined: backendUser.date_joined,
        last_login: backendUser.last_login,
        user_type: backendUser.user_type || 'individual',
      };

      const loginResp: LoginResponse = {
        message: response.data.message || 'Login successful',
        token: response.data.token,
        user: normalizedUser,
      };

      return loginResp;
    } catch (error: any) {
      console.error('AuthService login error:', error);
      throw new Error(error?.response?.data?.detail || 'Login failed. Backend authentication is required.');
    }
  },

  signup: async (userData: SignupRequest): Promise<SignupResponse> => {
    console.log('AuthService signup called with:', userData);
    try {
      const response = await ____authApi.post<any>('/signup/', userData);
      return normalizeAuthResponse(response.data);
    } catch (backendErr: any) {
      throw new Error(backendErr?.response?.data?.detail || 'Signup failed. Backend registration is required.');
    }
  },

  logout: async (): Promise<void> => {
    await ____authApi.post('/logout/');
  },

  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No valid session found.');
    }

    const response = await ____authApi.get<any>('/me/');
    const data = response.data;
    return normalizeUser(data.user || data);
  },

  refreshAccessToken: async (): Promise<{ token: string; refreshToken?: string }> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found.');
    }

    const response = await ____authApi.post<any>('/token/refresh/', { refresh_token: refreshToken });
    const data = response.data;
    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
    };
  },
};


export default authService;
