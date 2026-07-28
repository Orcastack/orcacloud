// Environment configuration for OrcaCloud
// This file handles API endpoints for different environments

interface Config {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

const ____getConfig = (): Config => {
  // Check if we're in production by looking at hostname
  const hostname = window.location.hostname;
  const isProduction = hostname === 'orcacloud.com' || hostname === 'www.orcacloud.com';
  const isStaging = hostname.includes('staging') || hostname.includes('preview');
  
  // Determine environment
  let environment: Config['ENVIRONMENT'] = 'development';
  if (isProduction) {
    environment = 'production';
  } else if (isStaging) {
    environment = 'staging';
  }
  
  // Configure API base URL based on environment
  let apiBaseUrl: string;
  
  switch (environment) {
    case 'production':
      apiBaseUrl = 'https://api.orcacloud.com';
      break;
    case 'staging':
      apiBaseUrl = 'https://api-staging.orcacloud.com';
      break;
    default:
      // Development - check if we're running on localhost with port 8080 (unified container)
      if (hostname === 'localhost' && window.location.port === '8080') {
        apiBaseUrl = 'http://localhost:8080/api';
      } else {
        // Default development setup (React dev server on 3000, Django on 8000)
        apiBaseUrl = 'http://localhost:8000/api';
      }
  }
  
  return {
    API_BASE_URL: apiBaseUrl,
    API_TIMEOUT: 10000,
    ENVIRONMENT: environment,
  };
};

// Export singleton config
export const config = ____getConfig();

// Export function to get current environment info
export const ____getEnvironmentInfo = () => ({
  environment: config.ENVIRONMENT,
  apiBaseUrl: config.API_BASE_URL,
  hostname: window.location.hostname,
  isProduction: config.ENVIRONMENT === 'production',
  isDevelopment: config.ENVIRONMENT === 'development',
  isStaging: config.ENVIRONMENT === 'staging',
});

// Export for debugging
export const ____debugConfig = () => {
  console.log('Environment Configuration:', {
    ...config,
    ...____getEnvironmentInfo(),
    location: window.location.href,
  });
};