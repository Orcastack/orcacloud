import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, CircularProgress, Chip } from '@mui/material';
import { marketingApi } from '../services/cloudApi';
import type { Campaign } from '../types/marketing';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  sent: 'success', sending: 'warning', scheduled: 'default', draft: 'default',
  paused: 'default', cancelled: 'error', error: 'error',
};

const MarketingContentPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    marketingApi.listCampaigns()
      .then(res => setCampaigns(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Content Distribution</Typography>
            {loading && <CircularProgress size={18} />}
          </Box>
          <Typography variant="body2" color="text.secondary">Schedule and track delivery across email, SMS, push, and social channels.</Typography>
        </Box>
        <Button variant="contained">Schedule Content</Button>
      </Stack>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled / Sent</TableCell>
                <TableCell>Opens</TableCell>
                <TableCell>Clicks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">No campaigns yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map(c => (
                <TableRow key={c.resource_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{c.campaign_type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small" color={STATUS_COLOR[c.status] ?? 'default'} />
                  </TableCell>
                  <TableCell>
                    {c.sent_at
                      ? new Date(c.sent_at).toLocaleString()
                      : c.scheduled_at
                        ? new Date(c.scheduled_at).toLocaleString()
                        : '—'}
                  </TableCell>
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

export default MarketingContentPage;
