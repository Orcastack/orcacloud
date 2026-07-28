import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, Divider, Chip, Paper, Popper, Grow,
  ClickAwayListener, MenuList, MenuItem,
} from '@mui/material';
import OpenInNewIcon         from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { DEPLOY_ITEMS, DEPLOY_CATEGORIES, DeployItem } from './deploy.config';
import { useTheme as useColorMode } from '../../contexts/ThemeContext';

// ─── Permission hook (stub — replace with real API/store hook) ──────────────
function useDeployPermissions(): Record<string, boolean> {
  // In production, fetch from GET /api/v1/user/permissions and cache for 5 min.
  // Returning all-true stub so every item is visible in development.
  return DEPLOY_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.permission] = true;
    return acc;
  }, {});
}

// ─── Badge color map ────────────────────────────────────────────────────────
const BADGE_COLORS: Record<string, string> = {
  success: '#22C55E',
  warning: '#F59E0B',
  info:    '#525252', // Carbon Gray 70
  error:   '#EF4444',
};

// ─── Single menu item row ────────────────────────────────────────────────────
const DeployMenuItem: React.FC<{
  item: DeployItem;
  isDark: boolean;
  onSelect: (item: DeployItem) => void;
}> = ({ item, isDark, onSelect }) => (
  <MenuItem
    role="menuitem"
    onClick={() => onSelect(item)}
    sx={{
      gap: 1.5,
      py: 0.9,
      px: 1.5,
      mx: 0.5,
      borderRadius: '6px',
      alignItems: 'flex-start',
      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.06)' : '#F5F7FF' },
      '&.Mui-focusVisible': {
        outline: `2px solid #525252`, // Carbon Gray 70
        outlineOffset: -2,
        bgcolor: isDark ? 'rgba(255,255,255,.06)' : '#F5F7FF',
      },
    }}
  >
    {/* Icon */}
    <Box
      sx={{
        width: 30, height: 30, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: isDark ? 'rgba(82,82,82,.35)' : 'rgba(82,82,82,.08)', // Carbon Gray 70
        borderRadius: '6px',
        color: '#525252', // Carbon Gray 70
        mt: 0.15,
      }}
    >
      {item.icon}
    </Box>

    {/* Text */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography
          fontSize=".84rem"
          fontWeight={600}
          color={isDark ? '#ffffff' : '#111827'}
          noWrap
        >
          {item.label}
        </Typography>
        {item.badge && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 16, fontSize: '.6rem', fontWeight: 700,
              px: 0.25,
              bgcolor: BADGE_COLORS[item.badgeColor ?? 'info'] + '22',
              color: BADGE_COLORS[item.badgeColor ?? 'info'],
              border: `1px solid ${BADGE_COLORS[item.badgeColor ?? 'info']}44`,
            }}
          />
        )}
      </Box>
      <Typography fontSize=".74rem" color="text.secondary" noWrap>
        {item.description}
      </Typography>
    </Box>
  </MenuItem>
);

// ─── Main dropdown component ─────────────────────────────────────────────────

export interface DeployButtonProps {
  /** Button label — defaults to "Deploy+" */
  label?: string;
  /** If provided, only show items from this category in the dropdown */
  category?: 'compute' | 'storage' | 'networking' | 'developer' | 'all';
  /** Extra action fired BEFORE navigating — e.g. open a local modal */
  onModalOpen?: () => void;
  /** Size variant for compact placement */
  size?: 'small' | 'medium';
}

/**
 * Reusable Deploy button used across every page.
 * Click opens a dropdown with filtered deploy actions.
 * Use `category` to pre-filter to a specific section.
 * Use `onModalOpen` to trigger a page-level modal instead of navigating.
 */
export const DeployButton: React.FC<DeployButtonProps> = ({
  label = 'Deploy+',
  category = 'all',
  onModalOpen,
  size = 'medium',
}) => {
  const { isDark } = useColorMode() as any;
  const navigate   = useNavigate();
  const permissions = useDeployPermissions();

  const [open, setOpen] = useState(false);
  const anchorRef  = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allVisible = DEPLOY_ITEMS.filter(item => permissions[item.permission] !== false);
  const visibleItems = category === 'all'
    ? allVisible
    : allVisible.filter(i => i.category === category);

  // Which categories to render (only those that have visible items)
  const activeCategories = DEPLOY_CATEGORIES.filter(cat =>
    visibleItems.some(i => i.category === cat.key)
  );

  const openMenu = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
  };
  const closeMenu = () => setOpen(false);
  const toggleMenu = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen((previous) => !previous);
  };

  const handleSelect = useCallback((item: DeployItem) => {
    setOpen(false);
    if (onModalOpen) { onModalOpen(); return; }
    navigate(item.route);
  }, [navigate, onModalOpen]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const border = isDark ? 'rgba(255,255,255,.12)' : '#E2E8F0';
  const bg     = isDark ? '#161616' : '#ffffff';
  const isSmall = size === 'small';

  return (
    <Box
      ref={anchorRef}
      sx={{ display: 'inline-flex', position: 'relative' }}
    >
      {/* ── Trigger button ── */}
      <Box
        component="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="deploy-menu"
        onClick={toggleMenu}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: isSmall ? 1.25 : 1.5,
          py: isSmall ? 0.5 : 0.7,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontWeight: 600,
          fontSize: isSmall ? '.8rem' : '.875rem',
          background: open
            ? 'linear-gradient(135deg, #6b6b6b 0%, #525252 60%, #393939 100%)' // Carbon grays
            : 'linear-gradient(135deg, #737373 0%, #525252 60%, #393939 100%)', // Carbon grays
          color: '#ffffff',
          boxShadow: open
            ? '0 4px 12px rgba(82,82,82,0.45)' // Carbon Gray 70
            : '0 1px 3px rgba(82,82,82,0.35), inset 0 1px 0 rgba(255,255,255,0.08)', // Carbon Gray 70
          transition: 'all .15s',
          '&:focus-visible': { outline: '2px solid #525252', outlineOffset: 2 }, // Carbon Gray 70
        }}
      >
        {label}
      </Box>

      {/* ── Dropdown panel — opens BELOW the button ── */}
      <Popper
        id="deploy-menu"
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        style={{ zIndex: 1400 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
            <Paper
              elevation={0}
              sx={{
                width: 300,
                maxHeight: 540,
                overflowY: 'auto',
                bgcolor: bg,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                boxShadow: isDark
                  ? '0 20px 40px rgba(0,0,0,.5)'
                  : '0 16px 40px rgba(0,0,0,.14)',
              }}
            >
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <MenuList
                  autoFocusItem={false}
                  role="menu"
                  aria-label="Deploy options"
                  sx={{ py: 0.75 }}
                >
                  {activeCategories.map((cat, catIdx) => {
                    const items = visibleItems.filter(i => i.category === cat.key);
                    return (
                      <React.Fragment key={cat.key}>
                        {catIdx > 0 && (
                          <Divider sx={{ my: 0.5, mx: 1.5, borderColor: isDark ? 'rgba(255,255,255,.08)' : '#F0F0F0' }} />
                        )}
                        <Box sx={{ px: 2, pt: catIdx === 0 ? 0.75 : 0.25, pb: 0.25 }}>
                          <Typography
                            sx={{
                              fontSize: '.63rem', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '.08em',
                              color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF',
                            }}
                          >
                            {cat.label}
                          </Typography>
                        </Box>
                        {items.map(item => (
                          <DeployMenuItem
                            key={item.id}
                            item={item}
                            isDark={isDark}
                            onSelect={handleSelect}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* ── View More Options ── */}
                  <Divider sx={{ my: 0.5, mx: 1.5, borderColor: isDark ? 'rgba(255,255,255,.08)' : '#F0F0F0' }} />
                  <MenuItem
                    role="menuitem"
                    onClick={() => { setOpen(false); navigate('/products/Dashboard'); }}
                    sx={{
                      gap: 1.5, py: 0.9, px: 1.5, mx: 0.5, mb: 0.5,
                      borderRadius: '6px',
                      color: '#525252', // Carbon Gray 70
                      '&:hover': { bgcolor: isDark ? 'rgba(82,82,82,.2)' : 'rgba(82,82,82,.06)' }, // Carbon Gray 70
                      '&.Mui-focusVisible': { outline: '2px solid #525252', outlineOffset: -2 }, // Carbon Gray 70
                    }}
                  >
                    <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                    <Typography fontSize=".84rem" fontWeight={600} color="inherit">
                      View More Options
                    </Typography>
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
};

/** Header variant — shows all categories, label "Deploy+" */
export const DeployDropdown: React.FC = () => <DeployButton label="Deploy+" category="all" />;

export default DeployButton;
