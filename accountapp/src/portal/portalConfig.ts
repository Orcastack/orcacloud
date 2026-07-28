export type PortalVariant = 'standard' | 'home' | 'login' | 'cloud' | 'developer' | 'matrix' | 'enterprise' | 'mail' | 'devops';
export type PortalTarget = 'cloud' | 'developer' | 'matrix';

const publicPort = process.env.REACT_APP_PORTAL_PUBLIC_PORT || '3000';
const isLocalMultiDashboardEnvironment = process.env.REACT_APP_ENVIRONMENT === 'local-multi-dashboard';

const localPortalPorts = {
  home: '8081',
  login: '5000',
  cloud: '3000',
  developer: '3002',
  matrix: '4000',
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
  if (port === localPortalPorts.developer) {
    return 'developer';
  }
  if (port === localPortalPorts.matrix) {
    return 'matrix';
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
  if (pathname === '/developer' || pathname.startsWith('/developer/')) {
    return 'developer';
  }
  if (pathname === '/matrix' || pathname.startsWith('/matrix/')) {
    return 'matrix';
  }

  return null;
}

function inferPortalVariantFromQuery(): PortalVariant | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const portal = new URLSearchParams(window.location.search).get('portal');

  if (portal === 'home' || portal === 'login' || portal === 'cloud' || portal === 'developer' || portal === 'matrix' || portal === 'enterprise' || portal === 'mail' || portal === 'devops') {
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
  if (hostname === 'developer.localhost') {
    return 'developer';
  }
  if (hostname === 'matrix.localhost') {
    return 'matrix';
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
      developer: `http://localhost:${localPortalPorts.developer}`,
      matrix: `http://localhost:${localPortalPorts.matrix}`,
    }
  : {
      home: `http://localhost:${publicPort}`,
      login: `http://login.localhost:${publicPort}`,
      cloud: `http://cloud.localhost:${publicPort}`,
      developer: `http://developer.localhost:${publicPort}`,
      matrix: `http://matrix.localhost:${publicPort}`,
    };

export const portalTargetLabels: Record<PortalTarget, string> = {
  cloud: 'Cloud Dashboard',
  developer: 'Developer Dashboard',
  matrix: 'Matrix Dashboard',
};

export const portalTargetPaths: Record<PortalTarget, string> = {
  cloud: '/cloud',
  developer: '/developer/Dashboard',
  matrix: '/matrix',
};

export function resolvePortalTarget(value: string | null | undefined): PortalTarget {
  if (value === 'developer' || value === 'matrix') {
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
  if (target === 'developer') {
    return 'developer';
  }
  if (target === 'matrix') {
    return 'enterprise';
  }
  return 'cloud';
}
