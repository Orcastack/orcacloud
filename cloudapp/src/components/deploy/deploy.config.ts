import React from 'react';
import ComputerIcon       from '@mui/icons-material/Computer';
import StorageIcon        from '@mui/icons-material/Storage';
import FolderIcon         from '@mui/icons-material/FolderOpen';
import DatabaseIcon       from '@mui/icons-material/StorageRounded';
import ClusterIcon        from '@mui/icons-material/DeviceHub';
import FunctionsIcon      from '@mui/icons-material/Code';
import ContainerIcon      from '@mui/icons-material/ViewInAr';
import BalancerIcon       from '@mui/icons-material/CompareArrows';
import CdnDownIcon        from '@mui/icons-material/CloudDownload';
import CdnUpIcon          from '@mui/icons-material/CloudUpload';
import IpIcon             from '@mui/icons-material/Router';
import NetworkIcon        from '@mui/icons-material/RouterRounded';

export type BadgeColor = 'success' | 'warning' | 'info' | 'error';

export interface DeployItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactElement;
  route: string;
  permission: string;
  /** optional modal open key — if set, clicking opens a modal instead of navigating */
  modal?: string;
  badge?: string;
  badgeColor?: BadgeColor;
  category: 'compute' | 'storage' | 'networking' | 'developer';
}

export const DEPLOY_ITEMS: DeployItem[] = [
  // ── Compute ───────────────────────────────────────────────────────────────
  {
    id: 'server',
    label: 'Deploy New Server',
    description: 'Launch a virtual machine',
    icon: React.createElement(ComputerIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/compute',
    permission: 'deploy.server',
    category: 'compute',
  },
  {
    id: 'kubernetes',
    label: 'Deploy Cluster',
    description: 'Managed Kubernetes cluster',
    icon: React.createElement(ClusterIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/kubernetes',
    permission: 'deploy.kubernetes',
    category: 'compute',
  },
  {
    id: 'serverless',
    label: 'Add Serverless Inference',
    description: 'Run workloads without managing servers',
    icon: React.createElement(FunctionsIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/serverless',
    permission: 'deploy.serverless',
    badge: 'BETA',
    badgeColor: 'warning',
    category: 'compute',
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    id: 'object-storage',
    label: 'Deploy Storage',
    description: 'S3-compatible object storage',
    icon: React.createElement(StorageIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/storage',
    permission: 'deploy.object_storage',
    category: 'storage',
  },
  {
    id: 'file-system',
    label: 'Add File System',
    description: 'Shared network file storage',
    icon: React.createElement(FolderIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/storage',
    permission: 'deploy.file_system',
    category: 'storage',
  },

  // ── Networking ────────────────────────────────────────────────────────────
  {
    id: 'load-balancer',
    label: 'Deploy Load Balancer',
    description: 'Distribute traffic across targets',
    icon: React.createElement(BalancerIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/load-balancers',
    permission: 'deploy.load_balancer',
    category: 'networking',
  },
  {
    id: 'cdn-pull',
    label: 'Add CDN Pull Zone',
    description: 'Cache content from your origin',
    icon: React.createElement(CdnDownIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/cdn',
    permission: 'deploy.cdn',
    category: 'networking',
  },
  {
    id: 'cdn-push',
    label: 'Add CDN Push Zone',
    description: 'Push static assets to edge nodes',
    icon: React.createElement(CdnUpIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/cdn',
    permission: 'deploy.cdn',
    badge: 'BETA',
    badgeColor: 'warning',
    category: 'networking',
  },
  {
    id: 'reserved-ip',
    label: 'Add Reserved IP',
    description: 'Reserve a static IP address',
    icon: React.createElement(IpIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/network',
    permission: 'deploy.reserved_ip',
    category: 'networking',
  },
  {
    id: 'network',
    label: 'Add Private Network',
    description: 'Isolated VPC networking',
    icon: React.createElement(NetworkIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/network',
    permission: 'deploy.network',
    category: 'networking',
  },

  // ── Developer ─────────────────────────────────────────────────────────────
  {
    id: 'container-registry',
    label: 'Deploy Container',
    description: 'Private multi-region registry',
    icon: React.createElement(ContainerIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/containers',
    permission: 'deploy.registry',
    category: 'developer',
  },
  {
    id: 'managed-db',
    label: 'Deploy Database',
    description: 'Fully managed SQL/NoSQL',
    icon: React.createElement(DatabaseIcon, { fontSize: 'small' }),
    route: '/products/Dashboard/databases',
    permission: 'deploy.database',
    category: 'developer',
  },
];

export const DEPLOY_CATEGORIES = [
  { key: 'compute',    label: 'Compute'    },
  { key: 'storage',    label: 'Storage'    },
  { key: 'networking', label: 'Networking' },
  { key: 'developer',  label: 'Developer'  },
] as const;
