// DashboardTopBar — Unified top navigation bar shared across all dashboard contexts.
// Used by DashboardLayout AND standalone pages (MarketingWorkspacePage, EnterpriseDashboardPage org section).

import React, { useState } from 'react';
import {
  AppBar, Toolbar, Box, IconButton, Avatar, Menu, MenuItem,
  Badge, InputBase, Tooltip, Typography, Divider,
} from '@mui/material';
import SearchIcon            from '@mui/icons-material/Search';
import NotificationsIcon     from '@mui/icons-material/Notifications';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LightModeIcon         from '@mui/icons-material/LightMode';
import DarkModeIcon          from '@mui/icons-material/DarkMode';
import PersonIcon            from '@mui/icons-material/Person';
import LogoutIcon            from '@mui/icons-material/Logout';
import BillingIcon           from '@mui/icons-material/ReceiptLong';
import LockIcon              from '@mui/icons-material/Lock';
import KeyIcon               from '@mui/icons-material/Key';
import TuneIcon              from '@mui/icons-material/Tune';
import GppGoodIcon           from '@mui/icons-material/GppGood';
import ApiIcon               from '@mui/icons-material/Api';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import TeamIcon              from '@mui/icons-material/Group';
import SettingsIcon          from '@mui/icons-material/Settings';
import VerifiedUserIcon      from '@mui/icons-material/VerifiedUser';
import ShieldIcon            from '@mui/icons-material/Shield';
import MenuIcon              from '@mui/icons-material/Menu';
import { useAuth }           from '../../contexts/AuthContext';
import { useTheme as useColorMode } from '../../contexts/ThemeContext';
import { useNavigate }       from 'react-router-dom';
import { dashboardTokens }   from '../../styles/dashboardDesignSystem';
import { DeployButton } from '../deploy/DeployDropdown';

// ── Design constants (shared with DashboardLayout) ────────────────────────────
const BLUE        = dashboardTokens.colors.brandPrimary;
const BLUE_HOVER  = 'rgba(21,61,117,0.08)';
const DARK_HOVER  = '#415a77';
const TEXT_SECONDARY = dashboardTokens.colors.textSecondary;
const DIVIDER_COLOR  = dashboardTokens.colors.border;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DashboardTopBarProps {
  /** Content rendered on the left side of the bar (sidebar-toggle + search, or back-button + breadcrumb). */
  leftContent?: React.ReactNode;
  /** Extra content rendered between leftContent and the standard right-side icons. */
  actions?: React.ReactNode;
  /** Base path prefix for profile-menu navigation items. Defaults to '/cloud'. */
  routeBase?: string;
  deployCategory?: 'compute' | 'storage' | 'networking' | 'developer' | 'all';
  showDeployMenu?: boolean;
  /** When true renders a hamburger icon for mobile drawers (unused when leftContent overrides). */
  showMobileMenu?: boolean;
  onMobileMenuOpen?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const DashboardTopBar: React.FC<DashboardTopBarProps> = ({
  leftContent,
  actions,
  routeBase = '/cloud',
  deployCategory = 'all',
  showDeployMenu = false,
  showMobileMenu = false,
  onMobileMenuOpen,
}) => {
  const { user, logout }           = useAuth() as any;
  const navigate                   = useNavigate();
  const { mode, toggleTheme }      = useColorMode();
  const isDark                     = mode === 'dark';

  const [notifAnchor,   setNotifAnchor]   = useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: dashboardTokens.colors.surface,
        borderBottom: `1px solid ${DIVIDER_COLOR}`,
        color: dashboardTokens.colors.textPrimary,
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1, md: 1.5 },
          px: { xs: 1.25, md: 3 },
          minHeight: '64px !important',
        }}
      >
        {/* Mobile hamburger (opt-in) */}
        {showMobileMenu && (
          <IconButton
            onClick={onMobileMenuOpen}
            sx={{ display: { lg: 'none' }, color: '#6B7280' }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Configurable left zone (back button / breadcrumb / sidebar toggle / search) */}
        {leftContent}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Caller-supplied action buttons (org chip, custom buttons, etc.) */}
        {actions}

        {showDeployMenu && (
          <DeployButton label="Deploy" category={deployCategory} size="small" />
        )}

        {/* ── Theme toggle ─────────────────────────────────────────────── */}
        <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <IconButton
            onClick={toggleTheme}
            sx={{
              color: TEXT_SECONDARY,
              bgcolor: 'transparent',
              borderRadius: '2px',
              '&:hover': { bgcolor: dashboardTokens.colors.surfaceHover, color: BLUE },
              transition: 'all .15s',
            }}
          >
            {isDark
              ? <LightModeIcon sx={{ fontSize: '1.15rem' }} />
              : <DarkModeIcon  sx={{ fontSize: '1.15rem' }} />}
          </IconButton>
        </Tooltip>

        {/* ── Notifications ────────────────────────────────────────────── */}
        <Tooltip title="Notifications">
          <IconButton
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={{ color: TEXT_SECONDARY, '&:hover': { color: dashboardTokens.colors.textPrimary } }}
          >
            <Badge
              badgeContent={3}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '.6rem', minWidth: 16, height: 16 } }}
            >
              <NotificationsIcon sx={{ fontSize: '1.2rem' }} />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: {
              width: 'min(320px, calc(100vw - 24px))',
              mt: 1, borderRadius: '2px', boxShadow: 'none',
              border: `1px solid ${DIVIDER_COLOR}`,
              bgcolor: dashboardTokens.colors.surface,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : '#F3F4F6'}` }}>
            <Typography fontWeight={700} fontSize=".9rem">Notifications</Typography>
          </Box>
          {[
            { title: 'VM orcacloud-prod-01 is running', time: '2 min ago',  dot: '#22C55E' },
            { title: 'Snapshot backup completed',    time: '1 hr ago',   dot: '#153d75' },
            { title: 'Billing invoice available',    time: '2 days ago', dot: '#F59E0B' },
          ].map((n, i) => (
            <MenuItem key={i} sx={{ py: 1.25, gap: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.dot, mt: 0.75, flexShrink: 0 }} />
              <Box>
                <Typography fontSize=".82rem" fontWeight={500}>{n.title}</Typography>
                <Typography fontSize=".72rem" color="text.secondary">{n.time}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* ── User profile ─────────────────────────────────────────────── */}
        <Box
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1, py: 0.5, borderRadius: '2px',
            cursor: 'pointer',
            border: `1px solid ${isDark ? 'rgba(255,255,255,.12)' : '#E5E7EB'}`,
            transition: 'border .15s',
            '&:hover': { borderColor: BLUE },
          }}
        >
          <Avatar sx={{ width: 28, height: 28, bgcolor: BLUE, fontSize: '.75rem', fontWeight: 700 }}>
            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </Avatar>
          <Typography
            sx={{
              fontSize: '.82rem', fontWeight: 600,
              color: dashboardTokens.colors.textPrimary,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {user?.first_name || user?.username}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: '.85rem', color: '#6B7280', display: { xs: 'none', sm: 'block' } }} />
        </Box>
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{
            sx: {
              minWidth: 'min(240px, calc(100vw - 24px))',
              mt: 1, borderRadius: '2px', boxShadow: 'none',
              border: `1px solid ${DIVIDER_COLOR}`,
              bgcolor: dashboardTokens.colors.surface,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User info */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#F3F4F6'}` }}>
            <Typography fontWeight={700} fontSize=".875rem" color={isDark ? '#ffffff' : '#111827'}>
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`.trim()
                : user?.username}
            </Typography>
            <Typography fontSize=".75rem" color="text.secondary">{user?.email}</Typography>
          </Box>

          {/* Account */}
          <Box sx={{ px: 1.5, pt: 1, pb: .25 }}>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', fontSize: '.65rem' }}>Account</Typography>
          </Box>
          {[
            { label: 'Profile',       icon: <PersonIcon />,            path: `${routeBase}/settings/profile` },
            { label: 'Settings',      icon: <SettingsIcon />,          path: `${routeBase}/settings` },
            { label: 'Preferences',   icon: <TuneIcon />,              path: `${routeBase}/settings/preferences` },
            { label: 'Notifications', icon: <NotificationsNoneIcon />, path: `${routeBase}/settings/notifications` },
            { label: 'Billing',       icon: <BillingIcon />,           path: '/billing' },
          ].map(item => (
            <MenuItem key={item.label} onClick={() => { setProfileAnchor(null); navigate(item.path); }}
              sx={{ gap: 1.5, fontSize: '.85rem', py: .75, mx: .5, borderRadius: '2px',
                '&:hover': { bgcolor: isDark ? DARK_HOVER : BLUE_HOVER } }}>
              {React.cloneElement(item.icon, { sx: { fontSize: '1rem', color: isDark ? '#ffffff' : '#6B7280' } })}
              <Typography fontSize=".85rem" color={isDark ? '#ffffff' : '#374151'}>{item.label}</Typography>
            </MenuItem>
          ))}

          <Divider sx={{ my: .75, mx: 1.5, borderColor: isDark ? 'rgba(255,255,255,.08)' : '#F3F4F6' }} />

          {/* Security */}
          <Box sx={{ px: 1.5, pb: .25 }}>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', fontSize: '.65rem' }}>Security</Typography>
          </Box>
          {[
            { label: 'IAM',            icon: <PersonIcon       />, path: '/dashboard/iam' },
            { label: 'KMS',            icon: <KeyIcon          />, path: '/dashboard/kms' },
            { label: 'Secrets Vault',  icon: <LockIcon         />, path: '/dashboard/secrets' },
            { label: 'Zero-Trust',     icon: <VerifiedUserIcon />, path: '/dashboard/zero-trust' },
            { label: 'DDoS Shield',    icon: <ShieldIcon       />, path: '/dashboard/ddos' },
            { label: 'Authentication', icon: <LockIcon         />, path: `${routeBase}/settings/authentication` },
            { label: 'SSH Keys',       icon: <KeyIcon          />, path: `${routeBase}/settings/ssh-keys` },
            { label: 'Compliance',     icon: <GppGoodIcon      />, path: `${routeBase}/settings/compliance` },
          ].map(item => (
            <MenuItem key={item.label} onClick={() => { setProfileAnchor(null); navigate(item.path); }}
              sx={{ gap: 1.5, fontSize: '.85rem', py: .75, mx: .5, borderRadius: '2px',
                '&:hover': { bgcolor: isDark ? DARK_HOVER : BLUE_HOVER } }}>
              {React.cloneElement(item.icon, { sx: { fontSize: '1rem', color: isDark ? '#ffffff' : '#6B7280' } })}
              <Typography fontSize=".85rem" color={isDark ? '#ffffff' : '#374151'}>{item.label}</Typography>
            </MenuItem>
          ))}

          <Divider sx={{ my: .75, mx: 1.5, borderColor: isDark ? 'rgba(255,255,255,.08)' : '#F3F4F6' }} />

          {/* Developer */}
          <Box sx={{ px: 1.5, pb: .25 }}>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', fontSize: '.65rem' }}>Developer</Typography>
          </Box>
          {[
            { label: 'Users',          icon: <TeamIcon />, path: `${routeBase}/settings/users` },
            { label: 'API Management', icon: <ApiIcon  />, path: '/developer/Dashboard/api-management' },
          ].map(item => (
            <MenuItem key={item.label} onClick={() => { setProfileAnchor(null); navigate(item.path); }}
              sx={{ gap: 1.5, fontSize: '.85rem', py: .75, mx: .5, borderRadius: '2px',
                '&:hover': { bgcolor: isDark ? DARK_HOVER : BLUE_HOVER } }}>
              {React.cloneElement(item.icon, { sx: { fontSize: '1rem', color: isDark ? '#ffffff' : '#6B7280' } })}
              <Typography fontSize=".85rem" color={isDark ? '#ffffff' : '#374151'}>{item.label}</Typography>
            </MenuItem>
          ))}

          <Divider sx={{ my: .75, mx: 1.5, borderColor: isDark ? 'rgba(255,255,255,.08)' : '#F3F4F6' }} />

          <MenuItem onClick={handleLogout}
            sx={{ gap: 1.5, fontSize: '.85rem', py: .75, mx: .5, mb: .5, borderRadius: '2px',
              '&:hover': { bgcolor: 'rgba(239,68,68,.08)' } }}>
            <LogoutIcon sx={{ fontSize: '1rem', color: '#EF4444' }} />
            <Typography fontSize=".85rem" color="#EF4444">Sign Out</Typography>
          </MenuItem>
        </Menu>

      </Toolbar>
    </AppBar>
  );
};

// ── Shared search bar widget (re-used by DashboardLayout left content) ────────
export const TopBarSearch: React.FC = () => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  return (
    <Box
      sx={{
        display: { xs: 'none', sm: 'flex' }, alignItems: 'center',
        flex: 1, maxWidth: 420, minWidth: 0, width: { xs: '100%', sm: 'auto' },
        bgcolor: dashboardTokens.colors.surfaceSubtle,
        borderRadius: '2px', px: 1.5, py: 0.5, gap: 1,
        border: `1px solid ${dashboardTokens.colors.border}`,
        transition: 'border .15s',
        '&:focus-within': {
          border: `1px solid ${dashboardTokens.colors.brandPrimary}`,
          bgcolor: dashboardTokens.colors.surface,
        },
      }}
    >
      <SearchIcon sx={{ color: dashboardTokens.colors.textTertiary, fontSize: '1rem', flexShrink: 0 }} />
      <InputBase
        placeholder="Search resources…"
        sx={{
          flex: 1, fontSize: '.875rem',
          color: dashboardTokens.colors.textPrimary,
          '& input::placeholder': { color: dashboardTokens.colors.textTertiary },
        }}
      />
      <Typography
        sx={{
          fontSize: '.7rem', color: dashboardTokens.colors.textSecondary,
          bgcolor: dashboardTokens.colors.surfaceHover, px: 0.75, py: 0.25,
          borderRadius: '2px', flexShrink: 0,
          display: { xs: 'none', md: 'block' },
        }}
      >
        Ctrl K
      </Typography>
    </Box>
  );
};

export default DashboardTopBar;
