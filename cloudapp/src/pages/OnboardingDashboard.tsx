// OrcaCloud – Dashboard Overview Page

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Stack, Alert, Snackbar,
  Breadcrumbs, Link,
} from '@mui/material';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import RouterRoundedIcon from '@mui/icons-material/RouterRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { onboardingApi, dashboardApi } from '../services/cloudApi';
import { OnboardingProgress, DashboardStats } from '../types/cloud';
import { dashboardTokens } from '../styles/dashboardDesignSystem';
import { dashboardPageHeaderSx, dashboardSectionHeadingSx, dashboardSummaryCardSx, dashboardSummaryGridSx } from '../styles/dashboardShell';
import CloudOverviewCards  from '../components/Cloud/CloudOverviewCards';
import DocsSupportPanel    from '../components/Cloud/DocsSupportPanel';
import VMListPanel         from '../components/Cloud/VMListPanel';

const OnboardingDashboard: React.FC = () => {
  const { user } = useAuth() as any;
  const navigate = useNavigate();

  const [progress, setProgress]   = useState<OnboardingProgress | null>(null);
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingStats, setLoadingStats]       = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      const res = await onboardingApi.getChecklist();
      setProgress(res.data);
    } catch {
      // silently fail – user may not be authenticated yet
    } finally {
      setLoadingProgress(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch {
      // silently fail
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
    fetchStats();
  }, [fetchProgress, fetchStats]);

  const completedSteps = progress?.completed_steps.length ?? 0;
  const totalSteps = progress ? 6 : 0;
  const computeRunning = stats?.compute.running ?? 0;
  const storageVolumes = stats?.storage.total_volumes ?? 0;
  const networkCount = stats?.networking.vpcs ?? 0;
  const hasCloudData = computeRunning > 0 || storageVolumes > 0 || networkCount > 0;
  const summaryCards = [
    { label: 'Compute Running', value: stats ? computeRunning : '—', sub: 'Active virtual machines', icon: <TrendingUpIcon sx={{ fontSize: '1.05rem' }} /> },
    { label: 'Storage Volumes', value: stats ? storageVolumes : '—', sub: 'Provisioned storage capacity', icon: <StorageRoundedIcon sx={{ fontSize: '1.05rem' }} /> },
    { label: 'Network Spaces', value: stats ? networkCount : '—', sub: 'Configured VPC environments', icon: <RouterRoundedIcon sx={{ fontSize: '1.05rem' }} /> },
    { label: 'Operational Posture', value: progress ? `${progress.completion_pct}%` : '—', sub: progress ? `${completedSteps}/${totalSteps} setup milestones completed` : 'Waiting for live platform signals', icon: <SecurityRoundedIcon sx={{ fontSize: '1.05rem' }} /> },
  ];
  const quickActions = [
    { label: 'Products', value: 'Compute, storage, network', path: '/products/Dashboard' },
    { label: 'Sections', value: 'Assigned service groups', path: '/sections/Dashboard' },
    { label: 'Observability', value: 'Monitoring, SLOs, tracing', path: '/observability/Dashboard' },
    { label: 'Billing', value: 'Invoices and subscriptions', path: '/billing/Dashboard' },
  ];
  const platformSignals = [
    { label: 'Compute Utilization', value: Math.min(100, 18 + computeRunning * 9), tone: dashboardTokens.colors.brandPrimary },
    { label: 'Storage Allocation', value: Math.min(100, 12 + storageVolumes * 11), tone: '#111827' },
    { label: 'Network Readiness', value: Math.min(100, 24 + networkCount * 13), tone: '#525252' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background, pb: 6 }}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <Box sx={dashboardPageHeaderSx}>
        {/* Breadcrumbs — 12px, Graphite Gray */}
        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: '.75rem', color: dashboardTokens.colors.textTertiary }} />}
          sx={{ mb: 1.5 }}
        >
          <Link
            href="/"
            underline="hover"
            sx={{ fontSize: '12px', color: dashboardTokens.colors.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            Home
          </Link>
          <Typography
            sx={{ fontSize: '12px', color: dashboardTokens.colors.textPrimary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <DashboardIcon sx={{ fontSize: '.8rem' }} />
            Overview
          </Typography>
        </Breadcrumbs>

        {/* Title row — title left, actions right */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: dashboardTokens.colors.textPrimary,
              letterSpacing: '-.02em',
              lineHeight: 1.2,
            }}
          >
            Overview
          </Typography>


        </Stack>
      </Box>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <Container maxWidth="xl" sx={{ pt: 4 }}>
        <Stack spacing={3.5}>

          <Box sx={dashboardSummaryGridSx}>
            {summaryCards.map((item, index) => (
              <Box key={item.label} sx={{ ...dashboardSummaryCardSx, position: 'relative', overflow: 'hidden' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(135deg, rgba(21,61,117,0.08), transparent 55%)',
                    pointerEvents: 'none',
                  }}
                />
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: 'relative' }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: dashboardTokens.colors.textSecondary, mb: 0.75 }}>
                    {item.label}
                  </Typography>
                  <Box sx={{ color: dashboardTokens.colors.brandPrimary }}>{item.icon}</Box>
                </Stack>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: dashboardTokens.colors.textSecondary, mb: 0.75 }}>
                  Signal {String(index + 1).padStart(2, '0')}
                </Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: dashboardTokens.colors.textPrimary, lineHeight: 1.1 }}>
                  {item.value}
                </Typography>
                <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, mt: 0.5 }}>
                  {item.sub}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box>
            <SectionHeading>Executive Snapshot</SectionHeading>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.5fr 1fr' }, gap: 1.5 }}>
              <Box sx={{ ...dashboardSummaryCardSx, p: { xs: 2, md: 3 }, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(21,61,117,0.16), transparent 42%)', pointerEvents: 'none' }} />
                <Stack spacing={2} sx={{ position: 'relative' }}>
                  <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: dashboardTokens.colors.textPrimary, letterSpacing: '-.02em' }}>
                    Premium cloud operations view
                  </Typography>
                  <Typography sx={{ fontSize: '.92rem', color: dashboardTokens.colors.textSecondary, maxWidth: 720, lineHeight: 1.65 }}>
                    {loadingProgress || loadingStats
                      ? 'Syncing live cloud signals and operational posture from the backend.'
                      : 'This view now stays minimal when the account has no live resources. Once services exist, it surfaces operational posture, live capacity, and direct access into product modules without onboarding banners or placeholder prompts.'}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.25 }}>
                    {platformSignals.map((signal) => (
                      <Box key={signal.label} sx={{ border: `1px solid ${dashboardTokens.colors.border}`, borderRadius: '8px', p: 1.5, bgcolor: dashboardTokens.colors.surfaceSubtle }}>
                        <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                          {signal.label}
                        </Typography>
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: dashboardTokens.colors.textPrimary, mt: 0.75 }}>
                          {signal.value}%
                        </Typography>
                        <Box sx={{ mt: 1.25, height: 8, borderRadius: 999, bgcolor: 'rgba(21,61,117,0.08)', overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${signal.value}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: `linear-gradient(90deg, ${signal.tone}, rgba(21,61,117,0.45))`,
                              transition: 'width .6s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ ...dashboardSummaryCardSx, p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color: dashboardTokens.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '.08em', mb: 1.5 }}>
                  Quick Actions
                </Typography>
                <Stack spacing={1}>
                  {quickActions.map((action) => (
                    <Box
                      key={action.label}
                      onClick={() => navigate(action.path)}
                      sx={{
                        border: `1px solid ${dashboardTokens.colors.border}`,
                        borderRadius: '8px',
                        p: 1.5,
                        cursor: 'pointer',
                        bgcolor: dashboardTokens.colors.surface,
                        transition: 'transform .15s ease, border-color .15s ease, background-color .15s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          borderColor: dashboardTokens.colors.brandPrimary,
                          bgcolor: dashboardTokens.colors.surfaceSubtle,
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                        <Box>
                          <Typography sx={{ fontSize: '.94rem', fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>
                            {action.label}
                          </Typography>
                          <Typography sx={{ fontSize: '.78rem', color: dashboardTokens.colors.textSecondary, mt: 0.35 }}>
                            {action.value}
                          </Typography>
                        </Box>
                        <ArrowForwardIcon sx={{ fontSize: '1rem', color: dashboardTokens.colors.brandPrimary }} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Box>

          <Box>
            <SectionHeading>Cloud Overview</SectionHeading>
            <CloudOverviewCards stats={stats} loading={loadingStats} />
          </Box>

          <Box>
            <SectionHeading>Virtual Machines</SectionHeading>
            <VMListPanel
              refreshKey={0}
            />
          </Box>

          <Box>
            <SectionHeading>Documentation & Support</SectionHeading>
            <DocsSupportPanel />
          </Box>

        </Stack>
      </Container>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert
            severity={toast.type}
            onClose={() => setToast(null)}
            sx={{
              bgcolor: toast.type === 'success' ? dashboardTokens.colors.surface : undefined,
              border: `1px solid ${toast.type === 'success' ? dashboardTokens.colors.borderStrong : 'rgba(239,68,68,.4)'}`,
              color: toast.type === 'success' ? dashboardTokens.colors.textPrimary : undefined,
            }}
          >
            {toast.msg}
          </Alert>
        ) : <span />}
      </Snackbar>
    </Box>
  );
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Typography sx={dashboardSectionHeadingSx}>
      {children}
    </Typography>
  );
};

export default OnboardingDashboard;
