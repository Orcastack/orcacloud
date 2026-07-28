import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import ClusterIcon from '@mui/icons-material/DeviceHub';
import FunctionsIcon from '@mui/icons-material/Code';
import ContainerIcon from '@mui/icons-material/ViewInAr';
import DatabaseIcon from '@mui/icons-material/StorageRounded';
import BalancerIcon from '@mui/icons-material/CompareArrows';
import CdnIcon from '@mui/icons-material/PublicRounded';
import NetworkIcon from '@mui/icons-material/RouterRounded';
import OrchestrateIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PaletteIcon from '@mui/icons-material/Palette';
import HelpIcon from '@mui/icons-material/HelpOutline';
import PersonIcon from '@mui/icons-material/Person';
import BillingIcon from '@mui/icons-material/ReceiptLong';
import KeyIcon from '@mui/icons-material/Key';
import TuneIcon from '@mui/icons-material/Tune';
import GppGoodIcon from '@mui/icons-material/GppGood';
import ApiIcon from '@mui/icons-material/Api';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import TeamIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';
import MonitorIcon from '@mui/icons-material/QueryStats';
import DomainIcon from '@mui/icons-material/Language';
import CampaignIcon from '@mui/icons-material/Campaign';
import ViewListIcon from '@mui/icons-material/ViewList';
import MemoryIcon from '@mui/icons-material/Memory';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SecurityIcon from '@mui/icons-material/Security';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SourceIcon from '@mui/icons-material/Source';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import ArticleIcon from '@mui/icons-material/Article';

export type DashboardMode = 'cloud' | 'products' | 'sections' | 'developer' | 'marketing' | 'domains' | 'monitor' | 'enterprise' | 'docs' | 'audit' | 'wiki';

export interface NavItemConfig {
  label: string;
  icon: ReactNode;
  path?: string;
  badge?: string | number;
  badgeColor?: 'error' | 'warning' | 'success' | 'info';
  children?: NavItemConfig[];
  adminOnly?: boolean;
}

interface DashboardNavContext {
  mode: DashboardMode;
  orgSlug?: string;
  isAdmin?: boolean;
}

interface DashboardNavigation {
  routeBase: string;
  subtitle: string;
  primary: NavItemConfig[];
  account: NavItemConfig[];
  support: NavItemConfig[];
}

const I = (fontSize = '1.05rem') => ({ sx: { fontSize } });

const cloudPrimary: NavItemConfig[] = [
  { label: 'Overview', icon: <DashboardIcon {...I()} />, path: '/cloud' },
  {
    label: 'Products',
    icon: <ComputerIcon {...I()} />,
    path: '/products/Dashboard',
    children: [
      { label: 'Compute', icon: <ComputerIcon {...I('.95rem')} />, path: '/products/Dashboard/compute' },
      { label: 'Cloud Storage', icon: <StorageIcon {...I('.95rem')} />, path: '/products/Dashboard/storage' },
      { label: 'Kubernetes', icon: <ClusterIcon {...I('.95rem')} />, path: '/products/Dashboard/kubernetes' },
      { label: 'Serverless', icon: <FunctionsIcon {...I('.95rem')} />, path: '/products/Dashboard/serverless', badge: 'New', badgeColor: 'success' },
      { label: 'Container Registry', icon: <ContainerIcon {...I('.95rem')} />, path: '/products/Dashboard/containers' },
      { label: 'Databases', icon: <DatabaseIcon {...I('.95rem')} />, path: '/products/Dashboard/databases' },
      { label: 'Load Balancers', icon: <BalancerIcon {...I('.95rem')} />, path: '/products/Dashboard/load-balancers' },
      { label: 'CDN', icon: <CdnIcon {...I('.95rem')} />, path: '/products/Dashboard/cdn', badge: 'Beta', badgeColor: 'warning' },
      { label: 'GPU Workloads', icon: <MemoryIcon {...I('.95rem')} />, path: '/products/Dashboard/gpu', adminOnly: true },
      { label: 'Network', icon: <NetworkIcon {...I('.95rem')} />, path: '/products/Dashboard/network' },
      { label: 'Orchestration', icon: <OrchestrateIcon {...I('.95rem')} />, path: '/products/Dashboard/orchestration', adminOnly: true },
      { label: 'Auto Scaling', icon: <TuneIcon {...I('.95rem')} />, path: '/products/Dashboard/autoscaling', adminOnly: true },
      { label: 'Snapshots', icon: <StorageIcon {...I('.95rem')} />, path: '/products/Dashboard/snapshots' },
      { label: 'Firewall', icon: <SecurityIcon {...I('.95rem')} />, path: '/products/Dashboard/firewall' },
    ],
  },
  { label: 'Sections', icon: <ViewListIcon {...I()} />, path: '/sections/Dashboard' },
  {
    label: 'Domains',
    icon: <DomainIcon {...I()} />,
    path: '/domains/Dashboard',
    children: [
      { label: 'Domains', icon: <DomainIcon {...I('.95rem')} />, path: '/domains/Dashboard' },
      { label: 'DNS Zones', icon: <DomainIcon {...I('.95rem')} />, path: '/domains/Dashboard/dns' },
    ],
  },
  { label: 'Billing', icon: <BillingIcon {...I()} />, path: '/billing/Dashboard' },
  { label: 'Teams', icon: <TeamIcon {...I()} />, path: '/teams/Dashboard' },
  {
    label: 'Observability',
    icon: <MonitorIcon {...I()} />,
    path: '/observability/Dashboard',
    children: [
      { label: 'SLO / SLA', icon: <TrackChangesIcon {...I('.95rem')} />, path: '/observability/Dashboard/slo' },
      { label: 'Tracing', icon: <AccountTreeOutlinedIcon {...I('.95rem')} />, path: '/observability/Dashboard/tracing' },
      { label: 'Monitoring', icon: <MonitorIcon {...I('.95rem')} />, path: '/observability/Dashboard/dashboards' },
    ],
  },
  { label: 'Compliance', icon: <GppGoodIcon {...I()} />, path: '/compliance/Dashboard' },
  { label: 'Enterprise', icon: <GroupsIcon {...I()} />, path: '/enterprise' },
  { label: 'Developer', icon: <ComputerIcon {...I()} />, path: '/developer/Dashboard/repositories' },
];

const developerPrimary: NavItemConfig[] = [
  { label: 'Projects', icon: <FolderOpenIcon {...I()} />, path: '/developer/Dashboard/projects' },
  { label: 'Repositories', icon: <SourceIcon {...I()} />, path: '/developer/Dashboard/repositories' },
  { label: 'SSH Keys', icon: <KeyIcon {...I()} />, path: '/developer/Dashboard/ssh-keys' },
  { label: 'CI/CD Pipelines', icon: <OrchestrateIcon {...I()} />, path: '/developer/Dashboard/cicd' },
  { label: 'Containers', icon: <ContainerIcon {...I()} />, path: '/developer/Dashboard/containers' },
  { label: 'Kubernetes', icon: <ClusterIcon {...I()} />, path: '/developer/Dashboard/kubernetes' },
  { label: 'SDKs & Tools', icon: <ApiIcon {...I()} />, path: '/developer/Dashboard/sdks' },
  { label: 'Infra as Code', icon: <StorageIcon {...I()} />, path: '/developer/Dashboard/iac', adminOnly: true },
  { label: 'Service Catalog', icon: <ViewListIcon {...I()} />, path: '/developer/Dashboard/catalog' },
  { label: 'Sandbox', icon: <FunctionsIcon {...I()} />, path: '/developer/Dashboard/sandbox' },
  { label: 'Webhooks', icon: <NetworkIcon {...I()} />, path: '/developer/Dashboard/webhooks' },
  { label: 'Groups', icon: <GroupsIcon {...I()} />, path: '/developer/Dashboard/groups' },
  { label: 'Resource Control', icon: <TuneIcon {...I()} />, path: '/developer/Dashboard/resource-control', adminOnly: true },
  { label: 'Workplace', icon: <PersonIcon {...I()} />, path: '/developer/Dashboard/workspace' },
  { label: 'Environment', icon: <MemoryIcon {...I()} />, path: '/developer/Dashboard/environment' },
  { label: 'Operational', icon: <GppGoodIcon {...I()} />, path: '/developer/Dashboard/operational', adminOnly: true },
];

const productsPrimary: NavItemConfig[] = [
  { label: 'Overview', icon: <DashboardIcon {...I()} />, path: '/products/Dashboard' },
  { label: 'Compute', icon: <ComputerIcon {...I()} />, path: '/products/Dashboard/compute' },
  { label: 'Cloud Storage', icon: <StorageIcon {...I()} />, path: '/products/Dashboard/storage' },
  { label: 'Kubernetes', icon: <ClusterIcon {...I()} />, path: '/products/Dashboard/kubernetes' },
  { label: 'Serverless', icon: <FunctionsIcon {...I()} />, path: '/products/Dashboard/serverless', badge: 'New', badgeColor: 'success' },
  { label: 'Container Registry', icon: <ContainerIcon {...I()} />, path: '/products/Dashboard/containers' },
  { label: 'Databases', icon: <DatabaseIcon {...I()} />, path: '/products/Dashboard/databases' },
  { label: 'Load Balancers', icon: <BalancerIcon {...I()} />, path: '/products/Dashboard/load-balancers' },
  { label: 'CDN', icon: <CdnIcon {...I()} />, path: '/products/Dashboard/cdn', badge: 'Beta', badgeColor: 'warning' },
  { label: 'GPU Workloads', icon: <MemoryIcon {...I()} />, path: '/products/Dashboard/gpu', adminOnly: true },
  { label: 'Network', icon: <NetworkIcon {...I()} />, path: '/products/Dashboard/network' },
  { label: 'Orchestration', icon: <OrchestrateIcon {...I()} />, path: '/products/Dashboard/orchestration', adminOnly: true },
  { label: 'Auto Scaling', icon: <TuneIcon {...I()} />, path: '/products/Dashboard/autoscaling', adminOnly: true },
  { label: 'Snapshots', icon: <StorageIcon {...I()} />, path: '/products/Dashboard/snapshots' },
  { label: 'Firewall', icon: <SecurityIcon {...I()} />, path: '/products/Dashboard/firewall' },
];

const sectionsPrimary: NavItemConfig[] = [
  { label: 'Overview', icon: <DashboardIcon {...I()} />, path: '/sections/Dashboard' },
  { label: 'Products', icon: <ComputerIcon {...I()} />, path: '/products/Dashboard' },
  { label: 'Domains', icon: <DomainIcon {...I()} />, path: '/domains/Dashboard' },
  { label: 'Billing', icon: <BillingIcon {...I()} />, path: '/billing/Dashboard' },
  { label: 'Teams', icon: <TeamIcon {...I()} />, path: '/teams/Dashboard' },
  { label: 'Observability', icon: <MonitorIcon {...I()} />, path: '/observability/Dashboard' },
  { label: 'Compliance', icon: <GppGoodIcon {...I()} />, path: '/compliance/Dashboard' },
  { label: 'Support', icon: <HelpIcon {...I()} />, path: '/support/Dashboard' },
];

const marketingPrimary: NavItemConfig[] = [
  { label: 'Marketing Overview', icon: <MonitorIcon {...I()} />, path: '/marketing-dashboard/analytics' },
  { label: 'Campaigns', icon: <CampaignIcon {...I()} />, path: '/marketing-dashboard/campaigns' },
  { label: 'Sections', icon: <ViewListIcon {...I()} />, path: '/marketing-dashboard/sections' },
  { label: 'SEO & Domains', icon: <DomainIcon {...I()} />, path: '/marketing-dashboard/seo-domains' },
  { label: 'Audience Segmentation', icon: <TeamIcon {...I()} />, path: '/marketing-dashboard/audience-segmentation' },
  { label: 'Content Distribution', icon: <CdnIcon {...I()} />, path: '/marketing-dashboard/content-distribution' },
  { label: 'A/B Testing', icon: <TuneIcon {...I()} />, path: '/marketing-dashboard/ab-testing' },
  { label: 'Teams', icon: <TeamIcon {...I()} />, path: '/dashboard/teams' },
];

const domainsPrimary: NavItemConfig[] = [
  { label: 'Domain Service', icon: <DomainIcon {...I()} />, path: '/domains/dashboard' },
  { label: 'Sections', icon: <ViewListIcon {...I()} />, path: '/domains/dashboard/sections' },
  { label: 'Billing', icon: <BillingIcon {...I()} />, path: '/domains/dashboard' },
  { label: 'Admin Console', icon: <SettingsIcon {...I()} />, path: '/domains/dashboard' },
];

const monitorPrimary: NavItemConfig[] = [
  { label: 'Dashboards', icon: <DashboardIcon {...I()} />, path: '/monitor-dashboard/dashboards' },
  { label: 'Alerts', icon: <NotificationsNoneIcon {...I()} />, path: '/monitor-dashboard/alerts', badge: 3, badgeColor: 'error' },
  { label: 'Incidents', icon: <GppGoodIcon {...I()} />, path: '/monitor-dashboard/incidents' },
  { label: 'Logs', icon: <StorageIcon {...I()} />, path: '/monitor-dashboard/logs' },
  { label: 'Metrics', icon: <TuneIcon {...I()} />, path: '/monitor-dashboard/metrics' },
  { label: 'Developer Monitor', icon: <MonitorIcon {...I()} />, path: '/developer/monitor', adminOnly: true },
  { label: 'Sections', icon: <ViewListIcon {...I()} />, path: '/monitor-dashboard/sections' },
];

const docsPrimary: NavItemConfig[] = [];
const auditPrimary: NavItemConfig[] = [];

const accountByMode: Partial<Record<DashboardMode, NavItemConfig[]>> = {
  domains: [{ label: 'Billing', icon: <BillingIcon {...I()} />, path: '/dashboard/billing' }],
};

const supportByMode: Partial<Record<DashboardMode, NavItemConfig[]>> = {
  cloud: [
    { label: 'Support', icon: <HelpIcon {...I()} />, path: '/support/Dashboard' },
  ],
};

function filterAdminItems(items: NavItemConfig[], isAdmin: boolean): NavItemConfig[] {
  return items
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => ({
      ...item,
      children: item.children ? filterAdminItems(item.children, isAdmin) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0 || item.path);
}

export function getDashboardNavigation({ mode, orgSlug = '', isAdmin = false }: DashboardNavContext): DashboardNavigation {
  const enterprisePrimary: NavItemConfig[] = [
    { label: 'Overview', icon: <DashboardIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/overview` : '/enterprise' },
    { label: 'Organization', icon: <TeamIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/organization` : '/enterprise' },
    { label: 'Marketing', icon: <CampaignIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/marketing` : '/enterprise' },
    { label: 'Email Service', icon: <MailOutlineIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/email` : '/enterprise' },
    { label: 'Domains', icon: <DomainIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/domains` : '/enterprise' },
    { label: 'Branding', icon: <PaletteIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/branding` : '/enterprise' },
    { label: 'Workspace', icon: <WorkspacesIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/workspace` : '/enterprise' },
    { label: 'Docs', icon: <ArticleIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/docs` : '/enterprise' },
    { label: 'Billing', icon: <BillingIcon {...I()} />, path: '/billing' },
    { label: 'Compliance', icon: <GppGoodIcon {...I()} />, path: orgSlug ? `/enterprise/${orgSlug}/compliance` : '/enterprise' },
  ];

  const baseByMode: Record<DashboardMode, DashboardNavigation> = {
    cloud: { routeBase: '/cloud', subtitle: 'Cloud Platform', primary: cloudPrimary, account: [], support: supportByMode.cloud ?? [] },
    products: { routeBase: '/products/Dashboard', subtitle: 'Products Dashboard', primary: productsPrimary, account: [], support: [] },
    sections: { routeBase: '/sections/Dashboard', subtitle: 'Sections Dashboard', primary: sectionsPrimary, account: [], support: [] },
    developer: { routeBase: '/developer/Dashboard', subtitle: 'Developer Dashboard', primary: developerPrimary, account: [], support: [] },
    marketing: { routeBase: '/marketing-dashboard', subtitle: 'Marketing Dashboard', primary: marketingPrimary, account: [], support: [] },
    domains: { routeBase: '/domains/dashboard', subtitle: 'Domains Service', primary: domainsPrimary, account: accountByMode.domains ?? [], support: [] },
    monitor: { routeBase: '/monitor-dashboard', subtitle: 'Monitor Dashboard', primary: monitorPrimary, account: [], support: [] },
    enterprise: { routeBase: orgSlug ? `/enterprise/${orgSlug}/overview` : '/enterprise', subtitle: 'Enterprise Workspace', primary: enterprisePrimary, account: [], support: [] },
    docs: { routeBase: '/docs', subtitle: 'Documentation', primary: docsPrimary, account: [], support: [] },
    audit: { routeBase: '/audit-logs', subtitle: 'Audit Logs', primary: auditPrimary, account: [], support: [] },
    wiki: { routeBase: '/dashboard', subtitle: 'Knowledge Base', primary: [], account: [], support: [] },
  };

  const config = baseByMode[mode];
  return {
    ...config,
    primary: filterAdminItems(config.primary, isAdmin),
    account: filterAdminItems(config.account, isAdmin),
    support: filterAdminItems(config.support, isAdmin),
  };
}
