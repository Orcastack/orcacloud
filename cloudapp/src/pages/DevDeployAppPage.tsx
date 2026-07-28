import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';

const DevDeployAppPage: React.FC = () => {
  const t = dashboardTokens.colors;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background, p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: t.textPrimary }}>Deploy Application</Typography>
      </Stack>

      <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: 2, p: 3 }}>
        <Typography sx={{ color: t.textPrimary, fontWeight: 700, mb: 1 }}>Deployment flow integration pending</Typography>
        <Typography sx={{ color: t.textSecondary, fontSize: '.9rem' }}>
          Mock deploy sources and sample projects were removed. Connect this page to repository and deployment APIs for real testing.
        </Typography>
      </Box>
    </Box>
  );
};

export default DevDeployAppPage;
