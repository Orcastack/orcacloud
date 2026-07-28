export type PortalVariant = 'standard' | 'home' | 'login' | 'cloud' | 'devops' | 'email' | 'enterprise' | 'domain';
export type PortalTarget = 'cloud' | 'devops' | 'email' | 'enterprise' | 'domain';

const publicPort = process.env.REACT_APP_PORTAL_PUBLIC_PORT || '3000';
const isLocalMultiDashboardEnvironment = process.env.REACT_APP_ENVIRONMENT === 'local-multi-dashboard';

const localPortalPorts = {
  home: '8081',
  login: '5000',
  cloud: '3000',
  devops: '3002',
  email: '3003',
  enterprise: '4000',
  domain: '3001',
} as const;

function inferPortalVariantFromPort(): PortalVariant | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isLocalMultiDashboardEnvironment) {
    return null;
  }

  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

  if (port === localPortalPorts.home) {
    return 'home';
  }
  if (port === localPortalPorts.login) {
    return 'login';
  }
  if (port === localPortalPorts.cloud) {
    return 'cloud';
  }
  if (port === localPortalPorts.devops) {
    return 'devops';
  }
  if (port === localPortalPorts.email) {
    return 'email';
  }
  if (port === localPortalPorts.enterprise) {
    return 'enterprise';
  }
  if (port === localPortalPorts.domain) {
    return 'domain';
  }

  return null;
}

function inferPortalVariantFromPathname(): PortalVariant | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { pathname } = window.location;

  if (pathname === '/login') {
    return 'login';
  }
  if (pathname === '/cloud' || pathname.startsWith('/dashboard')) {
    return 'cloud';
  }
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return null;
  }
  return null;
}

function inferPortalVariantFromQuery(): PortalVariant | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const portal = new URLSearchParams(window.location.search).get('portal');

  if (portal === 'home' || portal === 'login' || portal === 'cloud' || portal === 'devops' || portal === 'email' || portal === 'enterprise' || portal === 'domain') {
    return portal;
  }

  return null;
}

function inferPortalVariantFromHostname(): PortalVariant {
  if (typeof window === 'undefined') {
    return 'standard';
  }

  const portPortalVariant = inferPortalVariantFromPort();
  if (portPortalVariant) {
    return portPortalVariant;
  }

  const pathnamePortalVariant = inferPortalVariantFromPathname();
  if (pathnamePortalVariant) {
    return pathnamePortalVariant;
  }

  const queryPortalVariant = inferPortalVariantFromQuery();
  if (queryPortalVariant) {
    return queryPortalVariant;
  }

  const hostname = window.location.hostname;

  if (hostname === 'login.localhost') {
    return 'login';
  }
  if (hostname === 'cloud.localhost') {
    return 'cloud';
  }
  if (hostname === 'devop.localhost') {
    return 'devops';
  }
  if (hostname === 'email.localhost') {
    return 'email';
  }
  if (hostname === 'enterprise.localhost') {
    return 'enterprise';
  }
  if (hostname === 'devop.orcacloud.com') {
    return 'devops';
  }
  if (hostname === 'cloud.orcacloud.com') {
    return 'cloud';
  }
  if (hostname === 'email.orcacloud.com') {
    return 'email';
  }
  if (hostname === 'enterprise.orcacloud.com') {
    return 'enterprise';
  }
  if (hostname === 'domain.orcacloud.com') {
    return 'domain';
  }
  if (hostname === 'account.orcacloud.com') {
    return 'login';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'home';
  }

  return 'standard';
}

const configuredPortalVariant = (process.env.REACT_APP_PORTAL_VARIANT || 'standard') as PortalVariant;

function isLocalSingleHostMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!isLocalMultiDashboardEnvironment) {
    return false;
  }

  const hostname = window.location.hostname;
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

  const localPorts = Object.values(localPortalPorts);

  return hostname.endsWith('.localhost') || ((hostname === 'localhost' || hostname === '127.0.0.1') && localPorts.includes(port as typeof localPorts[number]));
}

function getLocalSingleHostBaseUrl(): string {
  if (typeof window === 'undefined') {
    return `http://localhost:${publicPort}`;
  }

  return window.location.origin;
}

export const portalVariant = configuredPortalVariant === 'standard'
  ? inferPortalVariantFromHostname()
  : configuredPortalVariant;

export const isMultiPortalVariant = portalVariant !== 'standard';

const singleHostBaseUrl = getLocalSingleHostBaseUrl();

export const portalHosts: Record<PortalTarget | 'home' | 'login', string> = isLocalSingleHostMode()
  ? {
      home: `${singleHostBaseUrl}/`,
      login: `http://localhost:${localPortalPorts.login}`,
      cloud: `http://localhost:${localPortalPorts.cloud}`,
      devops: `http://localhost:${localPortalPorts.devops}`,
      email: `http://localhost:${localPortalPorts.email}`,
      enterprise: `http://localhost:${localPortalPorts.enterprise}`,
      domain: `http://localhost:${localPortalPorts.domain}`,
    }
  : {
      home: 'https://orcacloud.com',
      login: 'https://account.orcacloud.com',
      cloud: 'https://cloud.orcacloud.com',
      devops: 'https://devop.orcacloud.com',
      email: 'https://email.orcacloud.com',
      enterprise: 'https://enterprise.orcacloud.com',
      domain: 'https://domain.orcacloud.com',
    };

export const portalTargetLabels: Record<PortalTarget, string> = {
  cloud: 'Cloud Dashboard',
  devops: 'DevOps Dashboard',
  email: 'Email Dashboard',
  enterprise: 'Enterprise Dashboard',
  domain: 'Domain Dashboard',
};

export const portalTargetPaths: Record<PortalTarget, string> = {
  cloud: '/dashboard',
  devops: '/dashboard',
  email: '/dashboard',
  enterprise: '/dashboard',
  domain: '/dashboard',
};

export function resolvePortalTarget(value: string | null | undefined): PortalTarget {
  if (value === 'devops' || value === 'email' || value === 'enterprise' || value === 'domain') {
    return value;
  }
  return 'cloud';
}

export function getPortalTargetUrl(target: PortalTarget): string {
  if (isLocalSingleHostMode()) {
    return portalHosts[target];
  }

  return `${portalHosts[target]}${portalTargetPaths[target]}`;
}

export function getPortalLoginUrl(target?: PortalTarget): string {
  if (isLocalSingleHostMode()) {
    if (!target) {
      return portalHosts.login;
    }

    return `${portalHosts.login}?target=${target}`;
  }

  if (!target) {
    return portalHosts.login;
  }
  return `${portalHosts.login}/?target=${target}`;
}

export function getPortalPlan(target: PortalTarget): 'cloud' | 'developer' | 'enterprise' {
  if (target === 'devops') {
    return 'developer';
  }
  if (target === 'enterprise') {
    return 'enterprise';
  }
  return 'cloud';
}
