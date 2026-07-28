// OrcaCloud – Enterprise Entry Route Guard
// Resolves the user's organization context before entering the Enterprise section.
// Rules:
//   • No org    → show org-switcher with empty state (dialog is optional / dismissible)
//   • 1 org     → redirect to /enterprise/:slug/overview
//   • Many orgs → show org-switcher (choose which org to open)

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress,
  Button,
} from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import { enterpriseEntryApi } from '../services/enterpriseApi';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = {
  bg:     dashboardTokens.colors.background,
  card:   dashboardTokens.colors.surface,
  card2:  dashboardTokens.colors.surfaceSubtle,
  border: dashboardTokens.colors.border,
  text:   dashboardTokens.colors.textPrimary,
  sub:    dashboardTokens.colors.textSecondary,
  brand:  dashboardTokens.colors.brandPrimary,
  green:  dashboardSemanticColors.success,
  font:   '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

type State = 'loading' | 'single' | 'error';

export default function EnterpriseEntryRoute() {
  const navigate                    = useNavigate();
  const [state, setState]           = useState<State>('loading');
  const [singleSlug, setSingleSlug] = useState('');

  useEffect(() => {
    let cancelled = false;

    enterpriseEntryApi.resolve()
      .then(({ has_org, org }) => {
        if (cancelled) return;
        if (!has_org || !org) {
          // No org registered yet → send to the standalone registration page
          navigate('/enterprise/organizations/create', { replace: true });
        } else {
          setSingleSlug(org.slug);
          setState('single');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => { cancelled = true; };
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: T.brand }} />
      </Box>
    );
  }

  // ── Single org → go directly to dashboard ────────────────────────────────
  if (state === 'single') {
    return <Navigate to={`/enterprise/${singleSlug}/overview`} replace />;
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ color: T.sub }}>Failed to load your organization.</Typography>
        <Button variant="outlined" onClick={() => setState('loading')} sx={{ borderColor: T.brand, color: T.brand }}>
          Retry
        </Button>
      </Box>
    );
  }

  // Default — should not be reached (loading covers the rest)
  return null;
}
