import React from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const t = dashboardTokens.colors;

const IAMPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: FONT }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <AdminPanelSettingsIcon sx={{ color: dashboardTokens.colors.brandPrimary }} />
          <Typography sx={{ fontWeight: 800, color: t.textPrimary }}>Identity & Access Management</Typography>
        </Stack>
      </Stack>

      <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, boxShadow: 'none' }}>
        <CardContent>
          <Typography sx={{ color: t.textPrimary, fontWeight: 700, mb: 0.8 }}>Real data mode enabled</Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.9rem' }}>
            Mock users, groups, roles, policies, and audit records were removed. Connect this page to IAM backend endpoints for live testing.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default IAMPage;
