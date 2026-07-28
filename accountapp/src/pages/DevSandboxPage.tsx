import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';

const DevSandboxPage: React.FC = () => {
  const t = dashboardTokens.colors;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background, p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: t.textPrimary }}>Developer Sandbox</Typography>
      </Stack>

      <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, p: 3 }}>
        <Typography sx={{ color: t.textPrimary, fontWeight: 700, mb: 1 }}>Sandbox integration pending</Typography>
        <Typography sx={{ color: t.textSecondary, fontSize: '.9rem' }}>
          Mock sandboxes and mock APIs were removed. Connect this page to sandbox provisioning and API virtualization endpoints for live testing.
        </Typography>
      </Box>
    </Box>
  );
};

export default DevSandboxPage;
