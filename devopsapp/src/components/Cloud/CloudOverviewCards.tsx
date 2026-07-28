// OrcaCloud – Overview Cards

import React from 'react';
import {
  Box, Typography, Grid, Paper, Button, Stack, Chip,
  Skeleton, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ComputerIcon from '@mui/icons-material/Computer';
import StorageIcon from '@mui/icons-material/Storage';
import HubIcon from '@mui/icons-material/Hub';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { DashboardStats } from '../../types/cloud';
import { useNavigate } from 'react-router-dom';

interface CloudOverviewCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

interface StatRow {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface CardDef {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  rows: StatRow[];
  actionLabel: string;
  actionPath: string;
}

function buildCards(stats: DashboardStats | null): CardDef[] {
  const c = stats?.compute;
  const s = stats?.storage;
  const n = stats?.networking;
  const a = stats?.account;

  return [
    {
      title: 'Compute',
      subtitle: 'Virtual Machines',
      icon: <ComputerIcon />,
      iconColor: '#111827',
      iconBg: 'rgba(21,61,117,.1)',
      borderColor: 'rgba(21,61,117,.2)',
      rows: [
        { label: 'Total VMs',    value: c?.total_vms ?? 0 },
        { label: 'Running',      value: c?.running ?? 0, highlight: true },
        { label: 'Stopped',      value: c?.stopped ?? 0 },
      ],
      actionLabel: 'Manage VMs',
      actionPath: '/dashboard/compute',
    },
    {
      title: 'Storage',
      subtitle: 'Block & Object Storage',
      icon: <StorageIcon />,
      iconColor: '#153d75',
      iconBg: 'rgba(59,130,246,.12)',
      borderColor: 'rgba(59,130,246,.2)',
      rows: [
        { label: 'Total Volumes', value: s?.total_volumes ?? 0 },
        { label: 'Attached',      value: s?.attached ?? 0, highlight: true },
        { label: 'Detached',      value: s?.detached ?? 0 },
      ],
      actionLabel: 'Manage Storage',
      actionPath: '/dashboard/storage',
    },
    {
      title: 'Networking',
      subtitle: 'VPC & Security',
      icon: <HubIcon />,
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139,92,246,.12)',
      borderColor: 'rgba(139,92,246,.2)',
      rows: [
        { label: 'VPCs',            value: n?.vpcs ?? 0 },
        { label: 'Security Groups', value: n?.security_groups ?? 0, highlight: true },
      ],
      actionLabel: 'Manage Networking',
      actionPath: '/dashboard/networking',
    },
    {
      title: 'Account',
      subtitle: 'Project & Billing',
      icon: <AccountCircleIcon />,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,.12)',
      borderColor: 'rgba(245,158,11,.2)',
      rows: [
        { label: 'Role',           value: a?.role ?? '—' },
        { label: 'Billing Status', value: a?.billing_status ?? '—', highlight: true },
        { label: 'Onboarding',     value: `${a?.completion_pct ?? 0}% done` },
      ],
      actionLabel: 'View Account',
      actionPath: '/dashboard/account',
    },
  ];
}

const CloudOverviewCards: React.FC<CloudOverviewCardsProps> = ({ stats, loading }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cards = buildCards(stats);

  return (
    <Grid container spacing={2.5}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} xl={3} key={card.title}>
          <Paper
            elevation={0}
            sx={{
              background: isDark ? '#132336' : '#ffffff',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,.12)' : card.borderColor,
              borderRadius: '8px',
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform .2s, box-shadow .2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 32px rgba(0,0,0,.1)`,
              },
            }}
          >
            {/* Card header */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: 2,
                  bgcolor: card.iconBg, color: card.iconColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize=".95rem" lineHeight={1.2}>
                  {card.title}
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : '#6B7280' }}>
                  {card.subtitle}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)', mb: 2 }} />

            {/* Stats rows */}
            <Stack spacing={1} flex={1}>
              {card.rows.map((row) => (
                <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={.75}>
                    <FiberManualRecordIcon sx={{ fontSize: 8, color: '#94a3b8' }} />
                    <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#6B7280', fontSize: '.82rem' }}>
                      {row.label}
                    </Typography>
                  </Stack>
                  {loading ? (
                    <Skeleton width={28} height={18} sx={{ bgcolor: 'rgba(0,0,0,.08)' }} />
                  ) : (
                    <Chip
                      label={row.value}
                      size="small"
                      sx={{
                        bgcolor: row.highlight ? card.iconBg : isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)',
                        color: row.highlight ? card.iconColor : isDark ? '#ffffff' : '#374151',
                        fontWeight: 700, fontSize: '.75rem', height: 22,
                      }}
                    />
                  )}
                </Stack>
              ))}
            </Stack>

            {/* Action */}
            <Button
              fullWidth
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              onClick={() => navigate(card.actionPath)}
              sx={{
                mt: 2.5, borderColor: card.borderColor, color: card.iconColor,
                fontWeight: 600, borderRadius: 2, fontSize: '.8rem',
                '&:hover': { borderColor: card.iconColor, bgcolor: card.iconBg },
              }}
            >
              {card.actionLabel}
            </Button>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default CloudOverviewCards;
