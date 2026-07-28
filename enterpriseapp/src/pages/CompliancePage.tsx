import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import GppGoodIcon from '@mui/icons-material/GppGood';
import { dashboardSemanticColors, dashboardTokens } from '../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const t = dashboardTokens.colors;

const CompliancePage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <GppGoodIcon sx={{ color: dashboardTokens.colors.brandPrimary }} />
          <Typography sx={{ fontWeight: 800, color: t.textPrimary }}>Compliance</Typography>
        </Stack>
      </Stack>

      <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none' }}>
        <CardContent>
          <Typography sx={{ color: t.textPrimary, fontWeight: 700, mb: 0.8 }}>Real data mode enabled</Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.9rem' }}>
            Mock framework/control/evidence data was removed. Connect this page to compliance backend endpoints for live testing.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompliancePage;
