import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Switch, FormControlLabel } from '@mui/material';

const MarketingSettingsPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Marketing Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Campaign and audience controls separate from cloud engineering settings.
      </Typography>

      <Stack gap={1.5}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Campaign Controls</Typography>
            <FormControlLabel control={<Switch defaultChecked />} label="Require review before campaign publish" />
            <FormControlLabel control={<Switch />} label="Auto-pause underperforming campaigns" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Audience Controls</Typography>
            <FormControlLabel control={<Switch defaultChecked />} label="Enable audience sync with CRM" />
            <FormControlLabel control={<Switch defaultChecked />} label="Weekly segmentation quality report" />
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default MarketingSettingsPage;
