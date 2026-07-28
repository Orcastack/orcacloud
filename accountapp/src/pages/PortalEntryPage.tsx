import React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import HubIcon from '@mui/icons-material/Hub';
import LoginIcon from '@mui/icons-material/Login';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';
import { getPortalLoginUrl, portalHosts, portalTargetLabels, PortalTarget } from '../portal/portalConfig';

const cards: Array<{ target: PortalTarget; icon: React.ReactNode; text: string }> = [
  {
    target: 'cloud',
    icon: <CloudQueueIcon sx={{ fontSize: 28 }} />,
    text: 'Operate compute, storage, networking, and platform services through the cloud control plane.',
  },
  {
    target: 'developer',
    icon: <DashboardCustomizeIcon sx={{ fontSize: 28 }} />,
    text: 'Work with repositories, pipelines, workspaces, environments, and developer operations.',
  },
  {
    target: 'matrix',
    icon: <HubIcon sx={{ fontSize: 28 }} />,
    text: 'View a consolidated operations matrix for delivery lanes, governance, and cross-platform status.',
  },
];

export default function PortalEntryPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Stack spacing={3}>
          <Box>
            <Chip label="Local Multi-Dashboard Portal" sx={{ mb: 2, fontWeight: 700 }} />
            <Typography sx={{ fontSize: { xs: '2.4rem', md: '4rem' }, fontWeight: 700, letterSpacing: '-0.04em', color: dashboardTokens.colors.textPrimary, maxWidth: 840, lineHeight: 1.05 }}>
              Unified local login with isolated dashboard services behind one Nginx entrypoint.
            </Typography>
            <Typography sx={{ mt: 2, maxWidth: 760, fontSize: '1.05rem', lineHeight: 1.6, color: dashboardTokens.colors.textSecondary }}>
              Start at localhost, authenticate once through the login service, then land on the dashboard that matches the role or workspace you want to test.
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
            {cards.map((card) => (
              <Box
                key={card.target}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `1px solid ${dashboardTokens.colors.border}`,
                  bgcolor: dashboardTokens.colors.surface,
                }}
              >
                <Box sx={{ color: dashboardSemanticColors.info }}>{card.icon}</Box>
                <Typography sx={{ mt: 2, fontSize: '1.15rem', fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>
                  {portalTargetLabels[card.target]}
                </Typography>
                <Typography sx={{ mt: 1, minHeight: 72, color: dashboardTokens.colors.textSecondary, lineHeight: 1.55 }}>
                  {card.text}
                </Typography>
                <Button
                  href={getPortalLoginUrl(card.target)}
                  variant="contained"
                  startIcon={<LoginIcon />}
                  sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Sign in for {portalTargetLabels[card.target]}
                </Button>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 3, borderRadius: 2, border: `1px solid ${dashboardTokens.colors.border}`, bgcolor: dashboardTokens.colors.surfaceSubtle }}>
            <Typography sx={{ fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>Local hostnames</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
              {Object.entries(portalHosts).map(([name, url]) => (
                <Button key={name} href={url} endIcon={<OpenInNewIcon />} sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                  {url}
                </Button>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
