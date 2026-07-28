import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import HubIcon from '@mui/icons-material/Hub';
import LanIcon from '@mui/icons-material/Lan';
import ShieldIcon from '@mui/icons-material/Shield';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';

const cards = [
  {
    title: 'Delivery Lanes',
    value: '18',
    text: 'Pipelines and runtime lanes aligned across teams, environments, and release trains.',
    icon: <HubIcon sx={{ fontSize: 22 }} />,
    color: dashboardTokens.colors.brandPrimary,
  },
  {
    title: 'Service Mesh Nodes',
    value: '126',
    text: 'Cross-platform service nodes currently participating in the live dependency matrix.',
    icon: <LanIcon sx={{ fontSize: 22 }} />,
    color: dashboardSemanticColors.info,
  },
  {
    title: 'Compliance Gates',
    value: '9/9',
    text: 'Required policy and security gates passing across the local orchestration path.',
    icon: <ShieldIcon sx={{ fontSize: 22 }} />,
    color: dashboardSemanticColors.success,
  },
  {
    title: 'Active Topologies',
    value: '4',
    text: 'Topology views covering cloud, developer, identity, and operations handoff surfaces.',
    icon: <ViewInArIcon sx={{ fontSize: 22 }} />,
    color: dashboardSemanticColors.warning,
  },
];

export default function PortalMatrixPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Chip label="Matrix Dashboard" sx={{ mb: 1.5, fontWeight: 700 }} />
          <Typography sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>
            Cross-dashboard delivery and control matrix
          </Typography>
          <Typography sx={{ mt: 1, maxWidth: 760, color: dashboardTokens.colors.textSecondary, lineHeight: 1.6 }}>
            Use the Matrix dashboard to verify how developer, cloud, and governance workflows line up before you move into the deeper service-specific dashboards.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid item xs={12} md={6} key={card.title}>
            <Box sx={{ p: 3, borderRadius: 2, border: `1px solid ${dashboardTokens.colors.border}`, bgcolor: dashboardTokens.colors.surface, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ color: card.color }}>{card.icon}</Box>
                <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: dashboardTokens.colors.textPrimary }}>{card.value}</Typography>
              </Stack>
              <Typography sx={{ mt: 2, fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>{card.title}</Typography>
              <Typography sx={{ mt: 1, color: dashboardTokens.colors.textSecondary, lineHeight: 1.6 }}>{card.text}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
