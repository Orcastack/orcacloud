import React, { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Stack,
  Chip,
} from '@mui/material';
import MenuIcon              from '@mui/icons-material/Menu';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import LockIcon              from '@mui/icons-material/Lock';

import FirstPageIcon         from '@mui/icons-material/FirstPage';
import LastPageIcon          from '@mui/icons-material/LastPage';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack'

import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useColorMode } from '../../contexts/ThemeContext';
import { useOnboarding }    from '../../contexts/OnboardingContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { dashboardSemanticColors, dashboardTokens } from '../../styles/dashboardDesignSystem';
import DashboardTopBar, { TopBarSearch } from './DashboardTopBar';
import RightActivityPanel, { RightPanelExpandTab } from './RightActivityPanel';
import { getDashboardNavigation, type DashboardMode, type NavItemConfig } from '../../config/dashboardNavigation';

// ── Constants ──────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 76;
const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ── OrcaCloud unified design tokens ──────────────────────────────────────────
// Sidebar / shell — Neutral enterprise palette
const NAVY          = dashboardTokens.colors.surface;
const NAVY2         = dashboardTokens.colors.surfaceSubtle;
// Brand accent
const BLUE          = dashboardTokens.colors.brandPrimary;
const BLUE_DIM      = 'rgba(21,61,117,0.12)';
const BLUE_HOVER    = 'rgba(21,61,117,0.08)';
const DARK_HOVER    = '#415a77';
// Typography on blue sidebar
const TEXT_PRIMARY   = dashboardTokens.colors.textPrimary;
const TEXT_SECONDARY = dashboardTokens.colors.textSecondary;
const DIVIDER_COLOR  = dashboardTokens.colors.border;
// Status
const SUCCESS = dashboardSemanticColors.success;
const WARNING = dashboardSemanticColors.warning;
const DANGER  = dashboardSemanticColors.danger;

// ── Helpers ────────────────────────────────────────────────────────────────────
const NavSectionLabel: React.FC<{ children: React.ReactNode; collapsed?: boolean }> = ({ children, collapsed = false }) => (
  collapsed ? null : (
  <Typography
    sx={{
      px: 2.5, mb: 0.5, mt: 0.25,
      fontSize: '.62rem', fontWeight: 700,
      letterSpacing: '.1em', textTransform: 'uppercase',
      color: TEXT_SECONDARY,
      fontFamily: FONT,
    }}
  >
    {children}
  </Typography>
  )
);
// ── NavRow ─────────────────────────────────────────────────────────────────────

interface NavRowProps {
  item: NavItemConfig;
  depth?: number;
  defaultOpen?: boolean;
  collapsed?: boolean;
}

const NavRow: React.FC<NavRowProps> = ({ item, depth = 0, defaultOpen = false, collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode: navMode } = useColorMode();
  const isDarkNav = navMode === 'dark';
  const [open, setOpen] = useState(defaultOpen);

  const hasChildren = !!item.children?.length;
  const isActive = item.path
    ? location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    : item.children?.some(
        (child) => child.path && (location.pathname === child.path || location.pathname.startsWith(child.path + '/'))
      );

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  const handleClick = () => {
    if (collapsed && hasChildren) {
      if (item.path) {
        navigate(item.path);
        return;
      }
      const firstPath = item.children?.[0]?.path;
      if (firstPath) navigate(firstPath);
      return;
    }

    if (item.path) {
      navigate(item.path);
      return;
    }

    if (hasChildren) {
      setOpen((previous) => !previous);
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
  };

  const handleToggleChildren: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    setOpen((previous) => !previous);
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 1.25,
          px: collapsed ? 0.75 : (depth === 0 ? 1.5 : 2.25),
          py: 0.75,
          mx: 1,
          mb: 0.25,
          borderRadius: '2px',
          cursor: 'pointer',
          userSelect: 'none',
          background: isActive && !hasChildren ? (isDarkNav ? DARK_HOVER : '#F3F4F6') : 'transparent',
          borderLeft: isActive && !hasChildren ? `3px solid ${BLUE}` : '3px solid transparent',
          transition: 'background .12s',
          '&:hover': {
            background: isActive && !hasChildren ? (isDarkNav ? DARK_HOVER : BLUE_DIM) : (isDarkNav ? DARK_HOVER : BLUE_HOVER),
          },
        }}
      >
        <Box
          sx={{
            color: isActive ? BLUE : TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {item.icon}
        </Box>

        {!collapsed && (
          <Typography
            sx={{
              flex: 1,
              fontSize: depth === 0 ? '.875rem' : '.82rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#111827' : TEXT_PRIMARY,
              letterSpacing: depth === 0 ? '-.01em' : '-.005em',
              lineHeight: 1.2,
              fontFamily: FONT,
            }}
          >
            {item.label}
          </Typography>
        )}

        {!collapsed && item.badge && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 16,
              fontSize: '.6rem',
              fontWeight: 700,
              px: 0.25,
              bgcolor:
                item.badgeColor === 'success' ? 'rgba(34,197,94,.2)'
                : item.badgeColor === 'warning' ? 'rgba(245,158,11,.2)'
                : item.badgeColor === 'error' ? 'rgba(239,68,68,.2)'
                : BLUE_DIM,
              color:
                item.badgeColor === 'success' ? '#22C55E'
                : item.badgeColor === 'warning' ? '#F59E0B'
                : item.badgeColor === 'error' ? '#EF4444'
                : BLUE,
            }}
          />
        )}

        {!collapsed && hasChildren && (
          <Box onClick={handleToggleChildren} sx={{ color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', p: 0.25 }}>
            {open
              ? <KeyboardArrowDownIcon sx={{ fontSize: '.85rem' }} />
              : <KeyboardArrowRightIcon sx={{ fontSize: '.85rem' }} />}
          </Box>
        )}
      </Box>

      {hasChildren && !collapsed && (
        <Collapse in={open} timeout={0} unmountOnExit>
          <Box sx={{ ml: 1.5, borderLeft: `1px solid ${DIVIDER_COLOR}`, mb: 0.5 }}>
            {item.children!.map((child) => (
              <NavRow key={child.label} item={child} depth={depth + 1} collapsed={collapsed} />
            ))}
          </Box>
        </Collapse>
      )}
    </>
  );
};

// ── Sidebar ────────────────────────────────────────────────────────────────────

const SidebarContent: React.FC<{ collapsed?: boolean; dashboardMode: DashboardMode }> = ({
  collapsed = false,
  dashboardMode,
}) => {
  const navigate  = useNavigate();
  const loc       = useLocation();
  const { mode: _mode }  = useColorMode();
  const isDarkSidebar = _mode === 'dark';
  const { state: onboardingState } = useOnboarding();
  const isDeveloperPlan = onboardingState.userPlan === 'developer';
  const isAdmin = onboardingState.userPlan === 'enterprise' || onboardingState.userPlan === 'cloud';
  const enterpriseOrgSlug = dashboardMode === 'enterprise'
    ? (loc.pathname.split('/')[2] || '')
    : '';

  const navigation = getDashboardNavigation({ mode: dashboardMode, orgSlug: enterpriseOrgSlug, isAdmin });
  const routeBase = navigation.routeBase;
  const navItems = navigation.primary;
  const accountNav = navigation.account;
  const supportNav = navigation.support;

  // Sidebar surface colours switch with the theme
  const SB_BG     = NAVY;
  const SB_ORG    = NAVY2;
  const SB_DIV    = DIVIDER_COLOR;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SB_BG,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <Box
        onClick={() => navigate(routeBase)}
        sx={{
          px: collapsed ? 1 : 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 1.5,
          cursor: 'pointer',
          borderBottom: `1px solid ${SB_DIV}`,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '2px',
            background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: '.85rem',
            letterSpacing: '-.02em', flexShrink: 0,
          }}
        >
          A
        </Box>
        {!collapsed && (
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#f4f4f4', lineHeight: 1.15, letterSpacing: '-.02em', fontFamily: FONT }}>
              OrcaCloud
            </Typography>
            <Typography sx={{ fontSize: '.67rem', color: TEXT_SECONDARY, lineHeight: 1, fontFamily: FONT, letterSpacing: '.02em' }}>
              {navigation.subtitle}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Back to Cloud Dashboard — shown in developer / marketing / monitor modes (cloud-plan only) */}
      {(dashboardMode === 'developer' || dashboardMode === 'marketing' || dashboardMode === 'monitor') && !isDeveloperPlan && (
        <Box
          onClick={() => navigate('/cloud')}
          sx={{
            px: collapsed ? 0 : 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            borderBottom: `1px solid ${SB_DIV}`,
            cursor: 'pointer',
            flexShrink: 0,
            '&:hover': { bgcolor: isDarkSidebar ? DARK_HOVER : BLUE_HOVER },
            transition: 'background .15s',
          }}
        >
          <Tooltip title={collapsed ? 'Back to Cloud Dashboard' : ''} placement="right">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <ArrowBackIcon sx={{ fontSize: '.9rem', color: TEXT_SECONDARY, flexShrink: 0 }} />
              {!collapsed && (
                <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: TEXT_SECONDARY, fontFamily: FONT, letterSpacing: '.01em' }}>
                  Cloud Dashboard
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Return to Workspace — shown in docs / audit modes */}
      {(dashboardMode === 'docs' || dashboardMode === 'audit') && (
        <Box
          onClick={() => navigate(-1)}
          sx={{
            px: collapsed ? 0 : 1.5,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            borderBottom: `1px solid ${SB_DIV}`,
            cursor: 'pointer',
            flexShrink: 0,
            '&:hover': { bgcolor: isDarkSidebar ? DARK_HOVER : BLUE_HOVER },
            transition: 'background .15s',
          }}
        >
          <Tooltip title={collapsed ? 'Return to Workspace' : ''} placement="right">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <ArrowBackIcon sx={{ fontSize: '.9rem', color: TEXT_SECONDARY, flexShrink: 0 }} />
              {!collapsed && (
                <Typography sx={{ fontSize: '.78rem', fontWeight: 600, color: TEXT_SECONDARY, fontFamily: FONT, letterSpacing: '.01em' }}>
                  Return to Workspace
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Upgrade to Cloud — shown for developer-plan users at bottom of sidebar header */}
      {isDeveloperPlan && !collapsed && (
        <Box
          sx={{
            mx: 1.5, my: 1,
            p: 1.5,
            borderRadius: '6px',
            background: 'rgba(37,99,235,0.10)',
            border: '1px solid rgba(37,99,235,0.25)',
            cursor: 'pointer',
            flexShrink: 0,
            '&:hover': { background: 'rgba(37,99,235,0.18)' },
            transition: 'background .18s',
          }}
          onClick={() => navigate('/onboarding/plan')}
        >
          <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: BLUE, fontFamily: FONT, mb: 0.25 }}>
            Upgrade to Cloud
          </Typography>
          <Typography sx={{ fontSize: '.68rem', color: TEXT_SECONDARY, fontFamily: FONT, lineHeight: 1.4 }}>
            Unlock compute, storage, Kubernetes, billing and more.
          </Typography>
        </Box>
      )}
      {isDeveloperPlan && collapsed && (
        <Tooltip title="Upgrade to Cloud" placement="right">
          <Box
            onClick={() => navigate('/onboarding/plan')}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              py: 0.85, borderBottom: `1px solid ${SB_DIV}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: isDarkSidebar ? DARK_HOVER : BLUE_HOVER },
              transition: 'background .15s',
            }}
          >
            <LockIcon sx={{ fontSize: '1rem', color: BLUE }} />
          </Box>
        </Tooltip>
      )}

      {/* Navigation */}
      <Box
        sx={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: dashboardTokens.colors.borderStrong, borderRadius: 1 },
        }}
      >
        <List disablePadding>
          {navItems.map(item => (
            <NavRow
              key={item.label}
              item={item}
              defaultOpen={!!item.children?.some((child) => child.path && loc.pathname.startsWith(child.path))}
              collapsed={collapsed}
            />
          ))}
        </List>

        {accountNav.length > 0 && (
          <>
            {!collapsed && <Divider sx={{ borderColor: SB_DIV, my: 1, mx: 2 }} />}
            <NavSectionLabel collapsed={collapsed}>Account</NavSectionLabel>
            <List disablePadding>
              {accountNav.map(item => (
                <NavRow key={item.label} item={item} collapsed={collapsed} />
              ))}
            </List>
          </>
        )}

        {supportNav.length > 0 && (
          <>
            {!collapsed && <Divider sx={{ borderColor: SB_DIV, my: 1, mx: 2 }} />}

            <NavSectionLabel collapsed={collapsed}>Support</NavSectionLabel>
            <List disablePadding>
              {supportNav.map(item => (
                <NavRow key={item.label} item={item} collapsed={collapsed} />
              ))}
            </List>
          </>
        )}
      </Box>

    </Box>
  );
};

// ── Main layout ────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  dashboardMode?: DashboardMode;
  hideSidebar?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, dashboardMode = 'cloud', hideSidebar = false }) => {
  const navigate           = useNavigate();
  const location           = useLocation();
  const { mode } = useColorMode();

  const isDark             = mode === 'dark';
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed,   setRightCollapsed]   = useState(false);
  const routeBase = dashboardMode === 'developer'
    ? '/developer/Dashboard'
    : dashboardMode === 'products'
      ? '/products/Dashboard'
    : dashboardMode === 'sections'
      ? '/sections/Dashboard'
    : dashboardMode === 'marketing'
      ? '/marketing-dashboard'
      : dashboardMode === 'domains'
        ? '/domains/dashboard'
        : dashboardMode === 'monitor'
          ? '/monitor-dashboard'
          : '/cloud';
  const deployCategory = dashboardMode === 'products'
    ? 'compute'
    : dashboardMode === 'domains'
      ? 'networking'
      : 'all';
  const showDeployMenu = dashboardMode === 'cloud' || dashboardMode === 'products' || dashboardMode === 'sections' || dashboardMode === 'domains';

  // Enterprise sidebar is always visible for all sections
  const enterpriseOrgSlug = dashboardMode === 'enterprise'
    ? location.pathname.split('/')[2] || ''
    : '';

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: dashboardTokens.colors.background,
        ...(isDark
          ? {
              color: '#FFFFFF',
              '& .MuiTypography-root, & .MuiTableCell-root, & .MuiInputBase-input, & .MuiFormLabel-root, & .MuiInputLabel-root, & .MuiListItemText-primary, & .MuiListItemText-secondary': {
                color: '#FFFFFF',
              },
            }
          : {}),
      }}
    >

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {!hideSidebar && dashboardMode !== 'docs' && dashboardMode !== 'audit' && dashboardMode !== 'wiki' && (
        <Box component="nav" sx={{ width: { lg: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }, flexShrink: { lg: 0 } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', lg: 'none' },
              '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none', bgcolor: NAVY },
            }}
          >
            <SidebarContent dashboardMode={dashboardMode} />
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', lg: 'block' },
              '& .MuiDrawer-paper': {
                width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH, border: 'none',
                borderRight: `1px solid ${DIVIDER_COLOR}`,
                bgcolor: NAVY,
                transition: 'width .2s ease',
              },
            }}
            open
          >
            <SidebarContent collapsed={sidebarCollapsed} dashboardMode={dashboardMode} />
          </Drawer>
        </Box>
      )}

      {/* ── Right column ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexGrow: 1,
          width: { lg: (hideSidebar || dashboardMode === 'docs' || dashboardMode === 'audit' || dashboardMode === 'wiki') ? '100%' : `calc(100% - ${sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width .2s ease',
        }}
      >

        {/* ── Top AppBar ─────────────────────────────────────────────────────── */}
        {!hideSidebar && dashboardMode !== 'docs' && dashboardMode !== 'audit' && dashboardMode !== 'wiki' && <DashboardTopBar
          routeBase={routeBase}
          showDeployMenu={showDeployMenu}
          deployCategory={deployCategory}
          showMobileMenu
          onMobileMenuOpen={() => setMobileOpen(true)}
          leftContent={
            <>
              {/* Sidebar collapse toggle */}
              <Tooltip title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                <IconButton
                  onClick={() => setSidebarCollapsed(prev => !prev)}
                  sx={{ display: { xs: 'none', lg: 'inline-flex' }, color: TEXT_SECONDARY }}
                >
                  {sidebarCollapsed ? <LastPageIcon /> : <FirstPageIcon />}
                </IconButton>
              </Tooltip>

              {/* Global search */}
              <TopBarSearch />
            </>
          }
        />}

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', height: '100%', bgcolor: dashboardTokens.colors.background }}>
            {children}
          </Box>

          {/* ── Right activity panel ─────────────────────────────────────────── */}
          {!hideSidebar && dashboardMode !== 'enterprise' && dashboardMode !== 'docs' && dashboardMode !== 'audit' && dashboardMode !== 'wiki' && (
            <>
              <RightActivityPanel
                collapsed={rightCollapsed}
                onToggle={() => setRightCollapsed(true)}
              />
              {rightCollapsed && <RightPanelExpandTab onClick={() => setRightCollapsed(false)} />}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
