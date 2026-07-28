import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Switch, FormControlLabel, Divider } from '@mui/material';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const MonitorSettingsPage: React.FC = () => {
  const t = dashboardTokens.colors;
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: t.textPrimary }}>
        Monitor Settings
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: t.textSecondary }}>
        Configure alerting thresholds, notification channels, and monitoring preferences.
      </Typography>

      <Stack gap={2}>
        <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: t.textPrimary }}>Alert Notifications</Typography>
            <Divider sx={{ mb: 1.5, borderColor: t.border }} />
            <Stack gap={0.5}>
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Email alerts for critical incidents</Typography>}
              />
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Slack notifications for warning alerts</Typography>}
              />
              <FormControlLabel
                control={<Switch size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>PagerDuty integration</Typography>}
              />
              <FormControlLabel
                control={<Switch size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>SMS escalation for P1 incidents</Typography>}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: t.textPrimary }}>Data Retention</Typography>
            <Divider sx={{ mb: 1.5, borderColor: t.border }} />
            <Stack gap={0.5}>
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Retain logs for 30 days</Typography>}
              />
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Compress metrics older than 7 days</Typography>}
              />
              <FormControlLabel
                control={<Switch size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Archive incidents to cold storage</Typography>}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: t.surface, border: `1px solid ${t.border}`, borderRadius: '4px', boxShadow: 'none' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: t.textPrimary }}>Dashboard Preferences</Typography>
            <Divider sx={{ mb: 1.5, borderColor: t.border }} />
            <Stack gap={0.5}>
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Auto-refresh every 30 seconds</Typography>}
              />
              <FormControlLabel
                control={<Switch defaultChecked size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Show health status at top of overview</Typography>}
              />
              <FormControlLabel
                control={<Switch size="small" />}
                label={<Typography sx={{ fontSize: '.875rem', color: t.textPrimary }}>Show resolved incidents in feed</Typography>}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default MonitorSettingsPage;
