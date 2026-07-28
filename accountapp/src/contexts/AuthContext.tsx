import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, SignupRequest, AuthContextType, SocialProvider, Organization, OrganizationRegistrationRequest } from '../types/auth';
import { authService } from '../services/authService';
import { setAuthToken, clearAuthToken } from '../services/apiClient';
import { SocialAuthService } from '../services/socialAuthService';
import { bootstrapPortalTransferFromUrl, clearStoredAuthSession, setStoredAuthSession } from '../portal/portalSession';

const ____AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  bootstrapPortalTransferFromUrl();

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Helper functions for dashboard access logic
  const isIndividualUser = (user: User | null): boolean => {
    return user?.user_type === 'individual';
  };

  const isOrganizationUser = (user: User | null): boolean => {
    return user?.user_type === 'organization' && !!organization?.is_registered;
  };

  const getUserDashboardType = (user: User | null): 'individual' | 'organization' | null => {
    if (!user) return null;
    if (isIndividualUser(user)) return 'individual';
    if (isOrganizationUser(user)) return 'organization';
    return null;
  };

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsInitializing(false);
        return;
      }
      try {
        setAuthToken(token);
        const userData = await Promise.race([
          authService.getCurrentUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timed out')), 3000)
          ),
        ]);
        setUser(userData as any);
        const ud = userData as any;
        if (ud.user_type === 'organization' && ud.organization) {
          setOrganization(ud.organization);
        }
      } catch (error) {
        console.warn('Auth init skipped (backend offline or token invalid):', error);
        clearStoredAuthSession();
        clearAuthToken();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Attempting login with:', credentials);
      const response = await authService.login(credentials);
      console.log('Login response:', response);

      // Ensure user has proper user_type (fallback for existing users)
      const userWithType = {
        ...response.user,
        user_type: response.user.user_type || (response.user.organization ? 'organization' : 'individual')
      };

      // Store token and set user
      setStoredAuthSession(response.token, userWithType);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }
      setAuthToken(response.token);
      setUser(userWithType);

      // Set organization if user is organization type
      if (userWithType.user_type === 'organization' && userWithType.organization) {
        setOrganization(userWithType.organization);
      }

      console.log('Login successful, user set:', userWithType);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupRequest): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Attempting individual signup with:', userData);
      const response = await authService.signup(userData);
      console.log('Individual signup response:', response);

      // Ensure user is tagged as individual
      const individualUser = { ...response.user, user_type: 'individual' as const };

      // Store token and set user
      setStoredAuthSession(response.token, individualUser);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }
      setAuthToken(response.token);
      setUser(individualUser);
      console.log('Individual signup successful, user set:', individualUser);
    } catch (error) {
      console.error('Individual signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: SocialProvider): Promise<void> => {
    try {
      // Check if this is a callback from OAuth provider
      if (SocialAuthService.isOAuthCallback()) {
        setIsLoading(true);
  const response = await SocialAuthService.handleCallback();

  // Store token
  setStoredAuthSession(response.token, response.user);
  setAuthToken(response.token);
  setUser(response.user);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Initiate OAuth flow
        SocialAuthService.initiateLogin(provider);
      }
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    clearStoredAuthSession();
    localStorage.removeItem('refreshToken');
    clearAuthToken();
    setUser(null);
  };

  const registerOrganization = async (orgData: OrganizationRegistrationRequest): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Registering organization:', orgData);
      throw new Error('Organization registration requires backend organization APIs. Local mock registration has been removed.');
    } catch (error) {
      console.error('Organization registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signupOrganization = async (userData: SignupRequest, orgData: OrganizationRegistrationRequest): Promise<void> => {
    setIsLoading(true);
    try {
      console.log('Attempting organization signup with:', { userData, orgData });
      throw new Error('Organization signup requires backend organization APIs. Local mock organization creation has been removed.');
    } catch (error) {
      console.error('Organization signup failed:', error);
      // Clean up on failure
      clearStoredAuthSession();
      setUser(null);
      setOrganization(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const refreshed = await authService.refreshAccessToken();
        localStorage.setItem('authToken', refreshed.token);
        if (refreshed.refreshToken) {
          localStorage.setItem('refreshToken', refreshed.refreshToken);
        }
        setAuthToken(refreshed.token);
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    organization,
    isAuthenticated: !!user,
    isOrganizationRegistered: !!organization?.is_registered,
    isLoading,
    isInitializing,
    isIndividualUser: isIndividualUser(user),
    isOrganizationUser: isOrganizationUser(user),
    userDashboardType: getUserDashboardType(user),
    login,
    signup,
    signupOrganization,
    socialLogin,
    registerOrganization,
    logout,
    refreshToken,
  };

  return (
    <____AuthContext.Provider value={value}>
      {children}
    </____AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(____AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
