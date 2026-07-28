import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import './styles/professional.css';
import './styles/orcacloud-carbon.css';

// Context
import { CustomThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';

// Observability
import { initializeOpenTelemetry } from './observability/telemetry';
import { TelemetryErrorBoundary } from './observability/hooks';

// Components
import CloudPlatformHeader from './components/Layout/CloudPlatformHeader';
import Footer from './components/Layout/Footer';
import DashboardLayout from './components/Layout/DashboardLayout';

// Pages
import Homepage from './pages/Homepage';
import FeaturesPage from './pages/FeaturesPage';
import DocsPage from './pages/DocsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import WikiPage from './pages/WikiPage';
import DeveloperPage from './pages/DeveloperPage';
import ResourcesPage from './pages/ResourcesPage';
import BareMetalVpsPage from './pages/BareMetalVpsPage';
import AboutPage from './pages/AboutPage';
import ContactSalesPage from './pages/ContactSalesPage';
import SupportPage from './pages/SupportPage';
import OnboardingDashboard  from './pages/OnboardingDashboard';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import AccountSettingsPage       from './pages/AccountSettingsPage';
import DatabasePage              from './pages/DatabasePage';
import ContainerRegistryPage     from './pages/ContainerRegistryPage';
import ComputePage               from './pages/ComputePage';
import StoragePage               from './pages/StoragePage';
import KubernetesPage            from './pages/KubernetesPage';
import ServerlessPage from './pages/ServerlessPage';
import DomainPage from './pages/DomainPage';
import DomainsLandingPage from './pages/DomainsLandingPage';
import DomainsServiceDashboardPage from './pages/DomainsServiceDashboardPage';
import DomainDetailPage from './pages/DomainDetailPage';
import EmailMarketingPage from './pages/EmailMarketingPage';
import BillingPage               from './pages/BillingPage';
import LoadBalancersPage         from './pages/LoadBalancersPage';
import CDNPage                   from './pages/CDNPage';
import NetworkPage               from './pages/NetworkPage';
import OrchestrationPage         from './pages/OrchestrationPage';
import DevDeploymentsPage        from './pages/DevDeploymentsPage';
import DevPipelinesPage          from './pages/DevPipelinesPage';
import PipelineBuilderPage       from './pages/PipelineBuilderPage';
import PipelineExecutionPage     from './pages/PipelineExecutionPage';
import DevContainersPage        from './pages/DevContainersPage';
import DevKubernetesPage        from './pages/DevKubernetesPage';
import KubernetesSetupPage      from './pages/KubernetesSetupPage';
import KubernetesMonitorPage    from './pages/KubernetesMonitorPage';
import DevMonitoringPage         from './pages/DevMonitoringPage';
import DevCloudManagePage        from './pages/DevCloudManagePage';
import DevApiManagementPage      from './pages/DevApiManagementPage';
import DevResourceControlPage    from './pages/DevResourceControlPage';
import DevWorkspacePage          from './pages/DevWorkspacePage';
import WorkspaceDashboardPage    from './pages/WorkspaceDashboardPage';
import DevSettingsPage           from './pages/DevSettingsPage';
import MarketingSettingsPage     from './pages/MarketingSettingsPage';
import MarketingOverviewPage     from './pages/MarketingOverviewPage';
import MarketingAudiencePage     from './pages/MarketingAudiencePage';
import MarketingAbTestingPage    from './pages/MarketingAbTestingPage';
import MarketingContentPage      from './pages/MarketingContentPage';
import MarketingSeoPage          from './pages/MarketingSeoPage';
import DashboardSectionsPage     from './pages/DashboardSectionsPage';
import MonitorSettingsPage        from './pages/MonitorSettingsPage';
import TeamsPage                  from './pages/TeamsPage';
import DevGroupsPage              from './pages/DevGroupsPage';
import GroupCreatePage            from './pages/GroupCreatePage';
import GroupDashboardPage         from './pages/GroupDashboardPage';
import GroupPipelineDashboardPage from './pages/GroupPipelineDashboardPage';
import DevProjectsPage            from './pages/DevProjectsPage';
import DevProjectDetailPage       from './pages/DevProjectDetailPage';
import ProjectEntryPage           from './pages/ProjectEntryPage';
import ProjectImportPage          from './pages/ProjectImportPage';
import ProjectCreatePage          from './pages/ProjectCreatePage';
import ProjectDashboardPage       from './pages/ProjectDashboardPage';
import RepoSetupPage              from './pages/RepoSetupPage';
import RepositoryPage             from './pages/RepositoryPage';
import DevEnvironmentPage         from './pages/DevEnvironmentPage';
import EnvironmentDetailPage      from './pages/EnvironmentDetailPage';
import DevOperationalPage         from './pages/DevOperationalPage'
import DevDeployAppPage           from './pages/DevDeployAppPage';
import TeamDetailPage             from './pages/TeamDetailPage';
import EnterpriseDashboardPage   from './pages/EnterpriseDashboardPage';
import BusinessWorkspacePage     from './pages/BusinessWorkspacePage';
import EnterpriseEntryRoute      from './pages/EnterpriseEntryRoute';
import MarketingWorkspacePage    from './pages/MarketingWorkspacePage';
import EnterpriseMeetingsPage    from './pages/EnterpriseMeetingsPage';
import EnterpriseDeveloperHubPage from './pages/EnterpriseDeveloperHubPage';
import EnterpriseEmailPage        from './pages/EnterpriseEmailPage';
import CreateOrganizationPage    from './pages/CreateOrganizationPage';
import IAMPage                   from './pages/IAMPage';
import KMSPage                   from './pages/KMSPage';
import SecretsVaultPage          from './pages/SecretsVaultPage';
import ZeroTrustPage             from './pages/ZeroTrustPage';
import CompliancePage            from './pages/CompliancePage';
import GPUWorkloadsPage          from './pages/GPUWorkloadsPage';
import SLOPage                   from './pages/SLOPage';
import TracingPage               from './pages/TracingPage';
import DDoSPage                  from './pages/DDoSPage';
import AutoScalingPage           from './pages/AutoScalingPage';
import SnapshotsPage             from './pages/SnapshotsPage';
import FirewallPage              from './pages/FirewallPage';
import DNSPage                   from './pages/DNSPage';
import OrganizationPage          from './pages/OrganizationPage';
import GovernancePage            from './pages/GovernancePage';
import MonitorCustomDashboardsPage from './pages/MonitorCustomDashboardsPage';
import DevSDKsPage               from './pages/DevSDKsPage';
import DevIaCPage                from './pages/DevIaCPage';
import DevCatalogPage            from './pages/DevCatalogPage';
import DevSandboxPage            from './pages/DevSandboxPage';
import DevWebhooksPage           from './pages/DevWebhooksPage';
import DevRepositoriesPage       from './pages/DevRepositoriesPage';
import DevSSHKeysPage            from './pages/DevSSHKeysPage';
import PortalEntryPage           from './pages/PortalEntryPage';
import PortalLoginPage           from './pages/PortalLoginPage';
import PortalMatrixPage          from './pages/PortalMatrixPage';
import ModuleLandingPage         from './pages/ModuleLandingPage';
import { getPortalLoginUrl, portalVariant } from './portal/portalConfig';

const DomainAppRedirect: React.FC = () => {
  if (typeof window !== 'undefined') window.location.replace('https://domain.orcacloud.com/dashboard');
  return null;
};

// Redirect /developer/Dashboard/groups/:groupId → /groups/:groupId
const RedirectToGroupPage: React.FC = () => {
  const { groupId, section } = useParams<{ groupId: string; section?: string }>();
  if (section) return <Navigate to={`/groups/${groupId}/${section}`} replace />;
  return <Navigate to={`/groups/${groupId}`} replace />;
};

const resolveAssignedModulePath = (user: any): string | null => {
  const assignedModule = user?.assigned_module || user?.default_module || user?.module || null;

  switch (assignedModule) {
    case 'products':
      return '/products/Dashboard';
    case 'sections':
      return '/sections/Dashboard';
    case 'domains':
      return '/domains/Dashboard';
    case 'billing':
      return '/billing/Dashboard';
    case 'teams':
      return '/teams/Dashboard';
    case 'observability':
      return '/observability/Dashboard';
    case 'compliance':
      return '/compliance/Dashboard';
    case 'enterprise':
      return '/enterprise';
    case 'developer':
      return '/developer/Dashboard';
    case 'support':
      return '/support/Dashboard';
    default:
      return null;
  }
};

// Protected route – redirects to home if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitializing } = useAuth() as any;
  const { state: onboardingState } = useOnboarding();
  const location = useLocation();
  if (isInitializing) return null; // wait for token verification before deciding
  if (!user) {
    if (portalVariant === 'cloud' || portalVariant === 'devops' || portalVariant === 'email' || portalVariant === 'enterprise') {
      window.location.assign(getPortalLoginUrl(portalVariant));
      return null;
    }
    return <Navigate to="/" replace />;
  }
  // New users who haven't completed onboarding are redirected there first
  if (!onboardingState.isCompleted) return <Navigate to="/onboarding" replace />;
  // Developer-plan users who land on /dashboard get sent to the dev dashboard
  if (onboardingState.userPlan === 'developer' && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/cloud'))) {
    return <Navigate to="/developer/Dashboard" replace />;
  }
  return <>{children}</>;
};

// Requires login only – used for the onboarding flow itself
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitializing } = useAuth() as any;
  if (isInitializing) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Renders the correct shell depending on whether we are inside /dashboard/*
const AppShell: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth() as any;
  const { state: onboardingState } = useOnboarding();
  const isMatrixDashboard = location.pathname.startsWith('/matrix');
  const isAdminUser = Boolean(user?.is_admin) || /admin|owner/i.test(user?.role || '') || onboardingState.userPlan === 'enterprise';
  const assignedModulePath = resolveAssignedModulePath(user);

  const isDashboardApp = portalVariant === 'cloud' || portalVariant === 'devops' || portalVariant === 'email' || portalVariant === 'enterprise';
  const isStaticPath = ['/', '/features', '/about', '/domains', '/resources', '/support', '/contact', '/account', '/developer'].includes(location.pathname);

  if (portalVariant === 'login') {
    return (
      <Routes>
        <Route path="/" element={<PortalLoginPage />} />
        <Route path="/login" element={<PortalLoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isDashboardApp && isStaticPath) {
    return <Navigate to="/dashboard" replace />;
  }

  if (portalVariant === 'cloud' && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  if (portalVariant === 'devops' && (location.pathname === '/' || location.pathname === '/devops')) {
    return <Navigate to="/dashboard" replace />;
  }

  if (portalVariant === 'enterprise' && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  if (portalVariant === 'email' && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  const isDashboard = portalVariant === 'cloud' && location.pathname.startsWith('/dashboard');
  const isCloudDashboardHome = location.pathname === '/cloud';
  const isDeveloperDashboard = portalVariant === 'devops' && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/developer/Dashboard'));
  const isProductsDashboard = location.pathname.startsWith('/products/Dashboard');
  const isSectionsDashboard = location.pathname.startsWith('/sections/Dashboard');
  const isStandaloneDomainsDashboard = location.pathname.startsWith('/domains/Dashboard');
  const isStandaloneBillingDashboard = location.pathname.startsWith('/billing/Dashboard');
  const isStandaloneTeamsDashboard = location.pathname.startsWith('/teams/Dashboard');
  const isStandaloneObservabilityDashboard = location.pathname.startsWith('/observability/Dashboard');
  const isStandaloneComplianceDashboard = location.pathname.startsWith('/compliance/Dashboard');
  const isStandaloneSupportDashboard = location.pathname.startsWith('/support/Dashboard');
  const isProjectPage = location.pathname.startsWith('/developer/Dashboard/projects/');
  const isCicdPage = location.pathname.startsWith('/developer/Dashboard/cicd/builder') ||
                     location.pathname.startsWith('/developer/Dashboard/cicd/runs');
  const isWorkspaceDashboard = /^\/developer\/Dashboard\/workspace\/[^\/]+/.test(location.pathname);
  const isEnvironmentDetailPage = /^\/developer\/Dashboard\/environment\/[^\/]+/.test(location.pathname);
  const isDevMonitor = location.pathname.startsWith('/developer/monitor');
  const isOperationalPage = location.pathname === '/developer/Dashboard/operational';
  const isRepositoriesPage   = location.pathname === '/developer/Dashboard/repositories';
  const isSSHKeysPage        = location.pathname === '/developer/Dashboard/ssh-keys';
  const isStandaloneRepoPage  = location.pathname.startsWith('/developer/Dashboard/repo/');
  const isMarketingDashboard = portalVariant === 'email' && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/marketing-dashboard'));
  const isDomainsDashboard = location.pathname.startsWith('/domains/dashboard');
  const isMonitorDashboard = location.pathname.startsWith('/monitor-dashboard');
  const isBusinessWorkspace       = /^\/enterprise\/[^\/]+\/workspace/.test(location.pathname);
  const isEnterpriseMarketing     = /^\/enterprise\/[^\/]+\/marketing/.test(location.pathname);
  const isEnterpriseOrganization   = /^\/enterprise\/[^\/]+\/organization/.test(location.pathname);
  const isWikiPage                 = /^\/enterprise\/[^\/]+\/wiki$/.test(location.pathname);
  const isMeetingsPage             = /^\/enterprise\/[^\/]+\/meetings(\/.*)?$/.test(location.pathname);
  const isDeveloperHubPage         = /^\/enterprise\/[^\/]+\/developer-hub(\/.*)?$/.test(location.pathname);
  const isEmailPage                = /^\/enterprise\/[^\/]+\/email(\/.*)?$/.test(location.pathname);
  const isEnterpriseDashboard = portalVariant === 'enterprise' && !isBusinessWorkspace && !isEnterpriseMarketing && !isEnterpriseOrganization && !isWikiPage && !isMeetingsPage && !isDeveloperHubPage && !isEmailPage &&
    (location.pathname.startsWith('/enterprise') || location.pathname.startsWith('/dashboard')) &&
    !location.pathname.startsWith('/enterprise/organizations/create');
  const isGroupsPage = location.pathname.startsWith('/groups');
  const isBillingPage = location.pathname === '/billing';
  const isDocsPage = location.pathname === '/docs';
  const isAuditLogsPage = location.pathname === '/audit-logs';

  if (isWikiPage) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="wiki">
          <Routes>
            <Route path="/enterprise/:orgSlug/wiki" element={<WikiPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isMeetingsPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/meetings"   element={<EnterpriseMeetingsPage />} />
          <Route path="/enterprise/:orgSlug/meetings/*" element={<EnterpriseMeetingsPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isDeveloperHubPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/developer-hub"   element={<EnterpriseDeveloperHubPage />} />
          <Route path="/enterprise/:orgSlug/developer-hub/*" element={<EnterpriseDeveloperHubPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isEmailPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/email"   element={<EnterpriseEmailPage />} />
          <Route path="/enterprise/:orgSlug/email/*" element={<EnterpriseEmailPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isWorkspaceDashboard) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/workspace/:workspaceId" element={<WorkspaceDashboardPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isEnvironmentDetailPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/environment/:envId" element={<EnvironmentDetailPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isGroupsPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/groups/new"                                   element={<GroupCreatePage />} />
          <Route path="/groups/:groupId/pipelines/:pipelineId"        element={<GroupPipelineDashboardPage />} />
          <Route path="/groups/:groupId"                              element={<GroupDashboardPage />} />
          <Route path="/groups/:groupId/:section"                     element={<GroupDashboardPage />} />
          <Route path="/groups/:groupId/:section/:sub"                element={<GroupDashboardPage />} />
          <Route path="/groups/*"                                     element={<Navigate to="/developer/Dashboard/groups" replace />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isProjectPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/projects/new"             element={<ProjectCreatePage />} />
          <Route path="/developer/Dashboard/projects/import"           element={<ProjectImportPage />} />
          <Route path="/developer/Dashboard/projects/create"           element={<ProjectCreatePage />} />
          <Route path="/developer/Dashboard/projects/repo/setup"       element={<RepoSetupPage />} />
          <Route path="/developer/Dashboard/projects/:id"              element={<ProjectDashboardPage />} />
          <Route path="/developer/Dashboard/projects/:id/detail"       element={<DevProjectDetailPage />} />
          <Route path="/developer/Dashboard/projects/:id/repo"         element={<RepositoryPage />} />
          <Route path="/developer/Dashboard/projects/*"                element={<Navigate to="/developer/Dashboard/projects" replace />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isDevMonitor) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/monitor" element={<DevMonitoringPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isCicdPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/cicd/builder"         element={<PipelineBuilderPage />} />
          <Route path="/developer/Dashboard/cicd/runs/:runId"      element={<PipelineExecutionPage />} />
          <Route path="/developer/Dashboard/cicd/runs"             element={<PipelineExecutionPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isOperationalPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/operational" element={<DevOperationalPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isStandaloneRepoPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/developer/Dashboard/repo/:repoId" element={<RepositoryPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isRepositoriesPage) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="developer">
          <Routes>
            <Route path="/developer/Dashboard/repositories" element={<DevRepositoriesPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isSSHKeysPage) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="developer">
          <Routes>
            <Route path="/developer/Dashboard/ssh-keys" element={<DevSSHKeysPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isDeveloperDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="developer">
          <Routes>
            <Route path="/dashboard" element={<DevRepositoriesPage />} />
            <Route path="/developer/Dashboard" element={<Navigate to="/developer/Dashboard/repositories" replace />} />
            <Route path="/developer/Dashboard/deploy-app"  element={<DevDeployAppPage />} />
            <Route path="/developer/Dashboard/deployments" element={<Navigate to="/developer/Dashboard/workspace" replace />} />
            <Route path="/developer/Dashboard/projects"  element={<DevProjectsPage />} />
            <Route path="/developer/Dashboard/cloud-manage" element={<DevCloudManagePage />} />
            <Route path="/developer/Dashboard/containers" element={<DevContainersPage />} />
            <Route path="/developer/Dashboard/kubernetes" element={<DevKubernetesPage />} />
            <Route path="/developer/Dashboard/kubernetes/setup/:projectId" element={<KubernetesSetupPage />} />
            <Route path="/developer/Dashboard/kubernetes/monitor/:configId" element={<KubernetesMonitorPage />} />
            <Route path="/developer/Dashboard/api-management" element={<DevApiManagementPage />} />
            <Route path="/developer/Dashboard/resource-control" element={<DevResourceControlPage />} />
            <Route path="/developer/Dashboard/workspace" element={<DevWorkspacePage />} />
            <Route path="/developer/Dashboard/cicd"       element={<DevPipelinesPage />} />
            <Route path="/developer/Dashboard/groups" element={<DevGroupsPage />} />
            <Route path="/developer/Dashboard/groups/:groupId" element={<RedirectToGroupPage />} />
            <Route path="/developer/Dashboard/groups/:groupId/:section" element={<RedirectToGroupPage />} />
            <Route path="/developer/Dashboard/environment" element={<DevEnvironmentPage />} />
            <Route path="/developer/Dashboard/sections" element={<DashboardSectionsPage dashboardMode="developer" />} />
            <Route path="/developer/Dashboard/settings/*" element={<DevSettingsPage />} />
            <Route path="/developer/Dashboard/sdks"      element={<DevSDKsPage />} />
            <Route path="/developer/Dashboard/iac"       element={<DevIaCPage />} />
            <Route path="/developer/Dashboard/catalog"   element={<DevCatalogPage />} />
            <Route path="/developer/Dashboard/sandbox"   element={<DevSandboxPage />} />
            <Route path="/developer/Dashboard/webhooks"  element={<DevWebhooksPage />} />
            <Route path="/developer/Dashboard/*" element={<Navigate to="/developer/Dashboard/repositories" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isMarketingDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="marketing">
          <Routes>
            <Route path="/dashboard" element={<MarketingOverviewPage />} />
            <Route path="/marketing-dashboard" element={<Navigate to="/marketing-dashboard/analytics" replace />} />
            <Route path="/marketing-dashboard/analytics" element={<MarketingOverviewPage />} />
            <Route path="/marketing-dashboard/campaigns" element={<EmailMarketingPage />} />
            <Route path="/marketing-dashboard/seo-domains" element={<MarketingSeoPage />} />
            <Route path="/marketing-dashboard/audience-segmentation" element={<MarketingAudiencePage />} />
            <Route path="/marketing-dashboard/content-distribution" element={<MarketingContentPage />} />
            <Route path="/marketing-dashboard/ab-testing" element={<MarketingAbTestingPage />} />
            <Route path="/marketing-dashboard/sections" element={<DashboardSectionsPage dashboardMode="marketing" />} />
            <Route path="/marketing-dashboard/settings/*" element={<MarketingSettingsPage />} />
            <Route path="/marketing-dashboard/*" element={<Navigate to="/marketing-dashboard/analytics" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isCloudDashboardHome) {
    if (!isAdminUser && onboardingState.userPlan !== 'developer' && assignedModulePath && assignedModulePath !== '/cloud') {
      return <Navigate to={assignedModulePath} replace />;
    }

    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Routes>
            <Route path="/cloud" element={<OnboardingDashboard />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isProductsDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="products">
          <Routes>
            <Route path="/products/Dashboard"               element={<ModuleLandingPage title="Products" description="Manage compute, storage, networking, and platform product surfaces." items={[
              { label: 'Compute', path: '/products/Dashboard/compute', description: 'Virtual machines, images, and lifecycle operations.' },
              { label: 'Storage', path: '/products/Dashboard/storage', description: 'Volumes, snapshots, and persistent storage services.' },
              { label: 'Kubernetes', path: '/products/Dashboard/kubernetes', description: 'Clusters, workloads, and container orchestration.' },
              { label: 'Networking', path: '/products/Dashboard/network', description: 'VPCs, firewall controls, and traffic routing.' },
              { label: 'Databases', path: '/products/Dashboard/databases', description: 'Managed database services and connectivity.' },
            ]} />} />
            <Route path="/products/Dashboard/compute"       element={<ComputePage />} />
            <Route path="/products/Dashboard/compute/create" element={<ComputePage />} />
            <Route path="/products/Dashboard/kubernetes"    element={<KubernetesPage />} />
            <Route path="/products/Dashboard/kubernetes/:id" element={<KubernetesPage />} />
            <Route path="/products/Dashboard/serverless"    element={<ServerlessPage />} />
            <Route path="/products/Dashboard/serverless/:id" element={<ServerlessPage />} />
            <Route path="/products/Dashboard/databases"     element={<DatabasePage />} />
            <Route path="/products/Dashboard/databases/:id" element={<DatabasePage />} />
            <Route path="/products/Dashboard/containers"    element={<ContainerRegistryPage />} />
            <Route path="/products/Dashboard/containers/:id" element={<ContainerRegistryPage />} />
            <Route path="/products/Dashboard/storage"       element={<StoragePage />} />
            <Route path="/products/Dashboard/storage/:id"   element={<StoragePage />} />
            <Route path="/products/Dashboard/load-balancers" element={<LoadBalancersPage />} />
            <Route path="/products/Dashboard/cdn"           element={<CDNPage />} />
            <Route path="/products/Dashboard/network"       element={<NetworkPage />} />
            <Route path="/products/Dashboard/orchestration" element={<OrchestrationPage />} />
            <Route path="/products/Dashboard/gpu"           element={<GPUWorkloadsPage />} />
            <Route path="/products/Dashboard/autoscaling"   element={<AutoScalingPage />} />
            <Route path="/products/Dashboard/snapshots"     element={<SnapshotsPage />} />
            <Route path="/products/Dashboard/firewall"      element={<FirewallPage />} />
            <Route path="/products/Dashboard/*"             element={<Navigate to="/products/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isSectionsDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="sections">
          <Routes>
            <Route path="/sections/Dashboard"   element={<DashboardSectionsPage dashboardMode="cloud" />} />
            <Route path="/sections/Dashboard/*" element={<Navigate to="/sections/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneDomainsDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="domains">
          <Routes>
            <Route path="/domains/Dashboard/*"    element={<DomainAppRedirect />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneBillingDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideSidebar>
          <Routes>
            <Route path="/billing/Dashboard"   element={<BillingPage />} />
            <Route path="/billing/Dashboard/*" element={<Navigate to="/billing/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneTeamsDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideSidebar>
          <Routes>
            <Route path="/teams/Dashboard"         element={<TeamsPage />} />
            <Route path="/teams/Dashboard/:teamId" element={<TeamDetailPage />} />
            <Route path="/teams/Dashboard/*"       element={<Navigate to="/teams/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneObservabilityDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="monitor">
          <Routes>
            <Route path="/observability/Dashboard"            element={<ModuleLandingPage title="Observability" description="Review monitoring, tracing, service levels, and incident response." items={[
              { label: 'Monitoring', path: '/observability/Dashboard/dashboards', description: 'Dashboards, alerts, and service telemetry.' },
              { label: 'SLO / SLA', path: '/observability/Dashboard/slo', description: 'Service targets and reliability posture.' },
              { label: 'Tracing', path: '/observability/Dashboard/tracing', description: 'Request flow inspection and dependency tracing.' },
              { label: 'Incidents', path: '/observability/Dashboard/incidents', description: 'Active incidents and operational history.' },
            ]} />} />
            <Route path="/observability/Dashboard/dashboards" element={<MonitorCustomDashboardsPage />} />
            <Route path="/observability/Dashboard/incidents"  element={<Navigate to="/observability/Dashboard/dashboards" replace />} />
            <Route path="/observability/Dashboard/alerts"     element={<Navigate to="/observability/Dashboard/dashboards" replace />} />
            <Route path="/observability/Dashboard/metrics"    element={<Navigate to="/observability/Dashboard/dashboards" replace />} />
            <Route path="/observability/Dashboard/logs"       element={<Navigate to="/observability/Dashboard/dashboards" replace />} />
            <Route path="/observability/Dashboard/slo"        element={<SLOPage />} />
            <Route path="/observability/Dashboard/tracing"    element={<TracingPage />} />
            <Route path="/observability/Dashboard/*"          element={<Navigate to="/observability/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneComplianceDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideSidebar>
          <Routes>
            <Route path="/compliance/Dashboard"   element={<CompliancePage />} />
            <Route path="/compliance/Dashboard/*" element={<Navigate to="/compliance/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isStandaloneSupportDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout hideSidebar>
          <Routes>
            <Route path="/support/Dashboard"   element={<SupportPage />} />
            <Route path="/support/Dashboard/*" element={<Navigate to="/support/Dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Routes>
            <Route path="/dashboard"                         element={<Navigate to="/cloud" replace />} />
            <Route path="/dashboard/compute"                 element={<ComputePage />} />
            <Route path="/dashboard/compute/create"          element={<ComputePage />} />
            <Route path="/dashboard/kubernetes"              element={<KubernetesPage />} />
            <Route path="/dashboard/kubernetes/:id"          element={<KubernetesPage />} />
            <Route path="/dashboard/serverless"              element={<ServerlessPage />} />
            <Route path="/dashboard/serverless/:id"          element={<ServerlessPage />} />
            <Route path="/dashboard/settings"                element={<AccountSettingsPage />} />
            <Route path="/dashboard/settings/:section"       element={<AccountSettingsPage />} />
            <Route path="/dashboard/databases"               element={<DatabasePage />} />
            <Route path="/dashboard/databases/:id"           element={<DatabasePage />} />
            <Route path="/dashboard/containers"              element={<ContainerRegistryPage />} />
            <Route path="/dashboard/containers/:id"          element={<ContainerRegistryPage />} />
            <Route path="/dashboard/storage"                  element={<StoragePage />} />
            <Route path="/dashboard/storage/:id"              element={<StoragePage />} />
            <Route path="/dashboard/domain"                   element={<DomainAppRedirect />} />
            <Route path="/dashboard/domains/*"                element={<DomainAppRedirect />} />
            <Route path="/dashboard/email-marketing"          element={<Navigate to="/marketing-dashboard/campaigns" replace />} />
            <Route path="/dashboard/developer-tools"          element={<Navigate to="/developer/Dashboard/repositories" replace />} />
            <Route path="/dashboard/marketing-tools"          element={<Navigate to="/marketing-dashboard/analytics" replace />} />
            <Route path="/dashboard/monitoring"               element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/dashboard/load-balancers"           element={<LoadBalancersPage />} />
            <Route path="/dashboard/cdn"                      element={<CDNPage />} />
            <Route path="/dashboard/network"                  element={<NetworkPage />} />
            <Route path="/dashboard/orchestration"            element={<OrchestrationPage />} />
            <Route path="/dashboard/iam"                      element={<IAMPage />} />
            <Route path="/dashboard/kms"                      element={<KMSPage />} />
            <Route path="/dashboard/secrets"                  element={<SecretsVaultPage />} />
            <Route path="/dashboard/zero-trust"               element={<ZeroTrustPage />} />
            <Route path="/dashboard/compliance"               element={<CompliancePage />} />
            <Route path="/dashboard/gpu"                      element={<GPUWorkloadsPage />} />
            <Route path="/dashboard/slo"                      element={<SLOPage />} />
            <Route path="/dashboard/tracing"                  element={<TracingPage />} />
            <Route path="/dashboard/ddos"                     element={<DDoSPage />} />
            <Route path="/dashboard/sections"                 element={<DashboardSectionsPage dashboardMode="cloud" />} />
            <Route path="/dashboard/teams"                    element={<TeamsPage />} />
            <Route path="/dashboard/teams/:teamId"            element={<TeamDetailPage />} />
            <Route path="/dashboard/autoscaling"              element={<AutoScalingPage />} />
            <Route path="/dashboard/snapshots"               element={<SnapshotsPage />} />
            <Route path="/dashboard/firewall"                element={<FirewallPage />} />
            <Route path="/dashboard/dns"                     element={<DNSPage />} />
            <Route path="/dashboard/organization"            element={<OrganizationPage />} />
            <Route path="/dashboard/deployments"             element={<DevDeploymentsPage />} />
            <Route path="/dashboard/governance"              element={<GovernancePage />} />
            <Route path="/dashboard/*"                       element={<Navigate to="/cloud" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isDomainsDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="domains">
          <Routes>
            <Route path="/domains/dashboard/*"        element={<DomainAppRedirect />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // ── Business Workspace (standalone, own sidebar + DashboardTopBar) ──
  if (isBusinessWorkspace) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/workspace"         element={<BusinessWorkspacePage />} />
          <Route path="/enterprise/:orgSlug/workspace/:module"   element={<BusinessWorkspacePage />} />
          <Route path="/enterprise/:orgSlug/workspace/:module/*"  element={<BusinessWorkspacePage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  // ── Org sub-dashboard (standalone, owns its own sidebar) ──
  if (isEnterpriseOrganization) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/:section"   element={<EnterpriseDashboardPage />} />
          <Route path="/enterprise/:orgSlug/:section/*" element={<EnterpriseDashboardPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  // ── Org-scoped Marketing Workspace (standalone, own sidebar, no enterprise chrome) ──
  if (isEnterpriseMarketing) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/:orgSlug/marketing"          element={<MarketingWorkspacePage />} />
          <Route path="/enterprise/:orgSlug/marketing/:view"    element={<MarketingWorkspacePage />} />
          <Route path="/enterprise/:orgSlug/marketing/:view/*"  element={<MarketingWorkspacePage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isEnterpriseDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="enterprise">
          <Routes>
            {/* Entry: resolve org or go to create */}
            <Route path="/dashboard" element={<EnterpriseEntryRoute />} />
            <Route path="/enterprise" element={<EnterpriseEntryRoute />} />
            <Route path="/enterprise/:orgSlug" element={<EnterpriseEntryRoute />} />
            {/* Dashboard sections */}
            <Route path="/enterprise/:orgSlug/:section" element={<EnterpriseDashboardPage />} />
            <Route path="/enterprise/:orgSlug/:section/*" element={<EnterpriseDashboardPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // ── Create Org (standalone, no dashboard chrome) ───────────────────────────
  if (location.pathname.startsWith('/enterprise/organizations/create')) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/enterprise/organizations/create" element={<CreateOrganizationPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isBillingPage) {
    return (
      <ProtectedRoute>
        <Routes>
          <Route path="/billing" element={<BillingPage />} />
        </Routes>
      </ProtectedRoute>
    );
  }

  if (isMonitorDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="monitor">
          <Routes>
            <Route path="/monitor-dashboard"           element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/overview"  element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/incidents" element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/alerts"    element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/metrics"   element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/logs"      element={<Navigate to="/monitor-dashboard/dashboards" replace />} />
            <Route path="/monitor-dashboard/sections"   element={<DashboardSectionsPage dashboardMode="monitor" />} />
            <Route path="/monitor-dashboard/settings"   element={<MonitorSettingsPage />} />
            <Route path="/monitor-dashboard/dashboards" element={<MonitorCustomDashboardsPage />} />
            <Route path="/monitor-dashboard/*"          element={<Navigate to="/monitor-dashboard/overview" replace />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isMatrixDashboard) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="monitor">
          <Routes>
            <Route path="/matrix" element={<PortalMatrixPage />} />
            <Route path="/matrix/*" element={<PortalMatrixPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isDocsPage) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="docs">
          <Routes>
            <Route path="/docs" element={<DocsPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (isAuditLogsPage) {
    return (
      <ProtectedRoute>
        <DashboardLayout dashboardMode="audit">
          <Routes>
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Routes>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CloudPlatformHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          <Route path="/"          element={<Homepage />} />
          <Route path="/portal"    element={<PortalEntryPage />} />
          <Route path="/features"  element={<FeaturesPage />} />
          <Route path="/bare-metal-vps/:slug" element={<BareMetalVpsPage />} />
          <Route path="/developer" element={<DeveloperPage />} />
          <Route path="/about"     element={<AboutPage />} />
          <Route path="/domains/*" element={<DomainAppRedirect />} />

          {/* Onboarding Routes */}
          <Route path="/onboarding" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/account" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/plan" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/project" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/checklist" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/deploy" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/dashboard" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/advanced" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />
          <Route path="/onboarding/enterprise" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />

          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/support"   element={<SupportPage />} />
          <Route path="/contact"   element={<ContactSalesPage />} />          <Route path="/account"   element={<AboutPage />} />
          <Route path="*"          element={<Homepage />} />
        </Routes>
      </Box>
      <Footer />
    </Box>
  );
};

function getRouterBasename(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '/';
    }
  }

  return process.env.PUBLIC_URL || '/';
}

const routerBasename = getRouterBasename();

function App() {
  useEffect(() => {
    initializeOpenTelemetry();
  }, []);

  return (
    <TelemetryErrorBoundary componentName="App">
      <Router basename={routerBasename}>
        <CustomThemeProvider>
          <AuthProvider>
            <OnboardingProvider>
              <AppShell />
            </OnboardingProvider>
          </AuthProvider>
        </CustomThemeProvider>
      </Router>
    </TelemetryErrorBoundary>
  );
}

export default App;
