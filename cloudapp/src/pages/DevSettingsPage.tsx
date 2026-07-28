import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Switch, FormControlLabel } from '@mui/material';

const DevSettingsPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Developer Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Developer-specific controls for deployment workflows and engineering notifications.
      </Typography>

      <Stack gap={1.5}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Deploy Controls</Typography>
            <FormControlLabel control={<Switch defaultChecked />} label="Require deployment approval on production" />
            <FormControlLabel control={<Switch defaultChecked />} label="Enable canary rollout by default" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Engineering Alerts</Typography>
            <FormControlLabel control={<Switch defaultChecked />} label="Pipeline failure notifications" />
            <FormControlLabel control={<Switch />} label="Nightly summary report" />
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default DevSettingsPage;
