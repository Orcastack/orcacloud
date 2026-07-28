import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, CircularProgress, Chip } from '@mui/material';
import { marketingApi } from '../services/cloudApi';
import type { Campaign } from '../types/marketing';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  running: 'warning', sent: 'success', sending: 'warning', completed: 'success',
  draft: 'default', scheduled: 'default', paused: 'default', cancelled: 'error', error: 'error',
};

const MarketingAbTestingPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    marketingApi.listCampaigns()
      .then(res => setCampaigns(res.data.filter(c => c.campaign_type === 'ab_test')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>A/B Testing</Typography>
            {loading && <CircularProgress size={18} />}
          </Box>
          <Typography variant="body2" color="text.secondary">Track experiments, variants, significance, and winners.</Typography>
        </Box>
        <Button variant="contained">Create Experiment</Button>
      </Stack>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Experiment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Opens</TableCell>
                <TableCell>Clicks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">No A/B test experiments yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map(c => (
                <TableRow key={c.resource_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small" color={STATUS_COLOR[c.status] ?? 'default'} />
                  </TableCell>
                  <TableCell>{c.subject || '—'}</TableCell>
                  <TableCell>{c.analytics?.total_sent?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell>{c.analytics?.open_rate != null ? `${c.analytics.open_rate.toFixed(1)}%` : '—'}</TableCell>
                  <TableCell>{c.analytics?.click_rate != null ? `${c.analytics.click_rate.toFixed(1)}%` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketingAbTestingPage;
