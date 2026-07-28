import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Tooltip,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CampaignIcon from '@mui/icons-material/Campaign';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HubIcon from '@mui/icons-material/Hub';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import InsightsIcon from '@mui/icons-material/Insights';
import LanguageIcon from '@mui/icons-material/Language';
import GroupsIcon from '@mui/icons-material/Groups';
import PublishIcon from '@mui/icons-material/Publish';
import ScienceIcon from '@mui/icons-material/Science';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardTokens, computeUiTokens } from '../../styles/dashboardDesignSystem';

const GLOBAL_WIDTH = 86;
const SECTION_WIDTH = 272;
const RADIUS = '2px';

interface NavEntry {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const developerNav: NavEntry[] = [
  { label: 'Deployments', path: '/developer/Dashboard/deployments', icon: <RocketLaunchIcon /> },
  { label: 'CI/CD Pipelines', path: '/developer/Dashboard/cicd', icon: <AutorenewIcon /> },
  { label: 'Containers', path: '/developer/Dashboard/containers', icon: <ViewInArIcon /> },
  { label: 'Kubernetes', path: '/developer/Dashboard/kubernetes', icon: <HubIcon /> },
  { label: 'Monitoring', path: '/developer/Dashboard/monitoring', icon: <MonitorHeartIcon /> },
  { label: 'API Management', path: '/developer/Dashboard/api-management', icon: <ApiIcon /> },
  { label: 'Resource Control', path: '/developer/Dashboard/resource-control', icon: <StorageIcon /> },
];

const marketingNav: NavEntry[] = [
  { label: 'Analytics', path: '/marketing-dashboard/analytics', icon: <InsightsIcon /> },
  { label: 'Campaigns', path: '/marketing-dashboard/campaigns', icon: <CampaignIcon /> },
  { label: 'SEO & Domains', path: '/marketing-dashboard/seo-domains', icon: <LanguageIcon /> },
  { label: 'Audience Segmentation', path: '/marketing-dashboard/audience-segmentation', icon: <GroupsIcon /> },
  { label: 'Content Distribution', path: '/marketing-dashboard/content-distribution', icon: <PublishIcon /> },
  { label: 'A/B Testing', path: '/marketing-dashboard/ab-testing', icon: <ScienceIcon /> },
];

interface DualDashboardLayoutProps {
  mode: 'developer' | 'marketing';
  children: React.ReactNode;
}

const DualDashboardLayout: React.FC<DualDashboardLayoutProps> = ({ mode, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionNav = mode === 'developer' ? developerNav : marketingNav;
  const shellNavy = computeUiTokens.neutralStrong;
  const border = dashboardTokens.colors.border;
  const accent = dashboardTokens.colors.brandPrimary;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: (theme) => theme.palette.background.default }}>
      <Drawer
        variant="permanent"
        sx={{
          width: GLOBAL_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: GLOBAL_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255,255,255,0.16)',
            bgcolor: shellNavy,
            color: dashboardTokens.colors.white,
          },
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '.95rem' }}>Ax</Typography>
        </Toolbar>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <List sx={{ mt: 1 }}>
          <Tooltip title="Developer Tools" placement="right">
            <ListItemButton
              selected={mode === 'developer'}
              onClick={() => navigate('/developer/Dashboard/deployments')}
              sx={{
                mx: 1,
                borderRadius: RADIUS,
                mb: 1,
                border: '1px solid transparent',
                '&.Mui-selected': { bgcolor: 'rgba(21,61,117,.18)', borderColor: 'rgba(21,61,117,.45)' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(21,61,117,.24)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center', width: '100%' }}>
                <BuildIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          <Tooltip title="Marketing Tools" placement="right">
            <ListItemButton
              selected={mode === 'marketing'}
              onClick={() => navigate('/marketing-dashboard/analytics')}
              sx={{
                mx: 1,
                borderRadius: RADIUS,
                border: '1px solid transparent',
                '&.Mui-selected': { bgcolor: 'rgba(21,61,117,.18)', borderColor: 'rgba(21,61,117,.45)' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(21,61,117,.24)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center', width: '100%' }}>
                <CampaignIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </List>
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          width: SECTION_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SECTION_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: border,
            bgcolor: dashboardTokens.colors.surface,
          },
        }}
      >
        <Toolbar sx={{ minHeight: 72, px: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: '.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Global
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.15, letterSpacing: '-0.2px' }}>
              {mode === 'developer' ? 'Developer Tools' : 'Marketing Tools'}
            </Typography>
          </Box>
        </Toolbar>
        <Divider />
        <List sx={{ p: 1.25 }}>
          {sectionNav.map((entry) => {
            const active = location.pathname === entry.path;
            return (
              <ListItemButton
                key={entry.path}
                selected={active}
                onClick={() => navigate(entry.path)}
                sx={{
                  borderRadius: RADIUS,
                  mb: 0.5,
                  border: '1px solid transparent',
                  '& .MuiListItemIcon-root': { color: active ? accent : dashboardTokens.colors.textSecondary },
                  '& .MuiListItemText-primary': {
                    fontSize: '.88rem',
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '-0.1px',
                    color: active ? dashboardTokens.colors.textPrimary : dashboardTokens.colors.textSecondary,
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(21,61,117,.10)',
                    borderColor: 'rgba(21,61,117,.45)',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: 'rgba(21,61,117,.14)',
                  },
                  '&:hover': {
                    bgcolor: dashboardTokens.colors.surfaceSubtle,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{entry.icon}</ListItemIcon>
                <ListItemText primary={entry.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
};

export default DualDashboardLayout;
