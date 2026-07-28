import { SocialProvider, SocialLoginRequest, SocialLoginResponse } from '../types/auth';

// Social OAuth Configuration
const ____SOCIAL_CONFIG = {
  github: {
    clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || 'your-github-client-id',
    redirectUri: `${window.location.origin}/auth/github/callback`,
    scope: 'user:email',
    authUrl: 'https://github.com/login/oauth/authorize',
  },
  google: {
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id',
    redirectUri: `${window.location.origin}/auth/google/callback`,
    scope: 'openid profile email',
    authUrl: 'https://accounts.google.com/oauth/v2/auth',
  },
  gitlab: {
    clientId: process.env.REACT_APP_GITLAB_CLIENT_ID || 'your-gitlab-client-id',
    redirectUri: `${window.location.origin}/auth/gitlab/callback`,
    scope: 'read_user',
    authUrl: 'https://gitlab.com/oauth/authorize',
  },
  linkedin: {
    clientId: process.env.REACT_APP_LINKEDIN_CLIENT_ID || 'your-linkedin-client-id',
    redirectUri: `${window.location.origin}/auth/linkedin/callback`,
    scope: 'r_liteprofile r_emailaddress',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
};

export class SocialAuthService {
  /**
   * Initiates OAuth flow for the specified provider
   */
  static initiateLogin(provider: SocialProvider): void {
    const config = ____SOCIAL_CONFIG[provider];
    
    if (!config) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Store provider and redirect info for callback handling
    sessionStorage.setItem('oauth_provider', provider);
    sessionStorage.setItem('oauth_redirect_uri', config.redirectUri);

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: this.generateState(), // CSRF protection
    });

    // Add provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    
    // Open OAuth flow
    window.location.href = authUrl;
  }

  /**
   * Handles OAuth callback and exchanges code for tokens
   */
  static async handleCallback(): Promise<SocialLoginResponse> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check for OAuth errors
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Verify state for CSRF protection
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    const provider = sessionStorage.getItem('oauth_provider') as SocialProvider;
    const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

    if (!provider || !redirectUri) {
      throw new Error('Missing OAuth session data');
    }

    // Clean up session storage
    sessionStorage.removeItem('oauth_provider');
    sessionStorage.removeItem('oauth_redirect_uri');
    sessionStorage.removeItem('oauth_state');

    // Exchange code for token via backend
    const response = await fetch('/api/auth/social/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        code,
        redirect_uri: redirectUri,
      } as SocialLoginRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate a random state string for CSRF protection
   */
  private static generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    return state;
  }

  /**
   * Check if current URL is an OAuth callback
   */
  static isOAuthCallback(): boolean {
    const path = window.location.pathname;
    return path.includes('/auth/') && path.includes('/callback');
  }

  /**
   * Get provider-specific button styling and icons
   */
  static getProviderInfo(provider: SocialProvider) {
    const providerInfo = {
      github: {
        name: 'GitHub',
        color: '#333',
        hoverColor: '#24292e',
        textColor: 'white',
      },
      google: {
        name: 'Google',
        color: '#4285f4',
        hoverColor: '#357ae8',
        textColor: 'white',
      },
      gitlab: {
        name: 'GitLab',
        color: '#fc6d26',
        hoverColor: '#e85d1c',
        textColor: 'white',
      },
      linkedin: {
        name: 'LinkedIn',
        color: '#0077b5',
        hoverColor: '#005885',
        textColor: 'white',
      },
    };

    return providerInfo[provider];
  }
}

export default SocialAuthService;
