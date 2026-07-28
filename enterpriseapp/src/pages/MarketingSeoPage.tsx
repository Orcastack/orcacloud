import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, CircularProgress, Chip } from '@mui/material';
import { domainApi } from '../services/cloudApi';
import type { Domain } from '../types/domain';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  active: 'success', verified: 'success', pending: 'warning',
  expired: 'error', transferring: 'warning', locked: 'default',
};

const MarketingSeoPage: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    domainApi.list()
      .then(res => setDomains(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>SEO &amp; Domains</Typography>
            {loading && <CircularProgress size={18} />}
          </Box>
          <Typography variant="body2" color="text.secondary">Domain health, SSL status, DNS configuration, and renewal tracking.</Typography>
        </Box>
        <Button variant="contained">Add Domain</Button>
      </Stack>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>DNSSEC</TableCell>
                <TableCell>Auto-Renew</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Privacy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {domains.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">No domains registered yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {domains.map(d => (
                <TableRow key={d.resource_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{d.domain_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={d.status}
                      size="small"
                      color={STATUS_COLOR[d.status] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell>{d.dnssec_enabled ? 'Enabled' : 'Off'}</TableCell>
                  <TableCell>{d.auto_renew ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '—'}
                    {d.days_until_expiry != null && d.days_until_expiry <= 30 && (
                      <Chip label={`${d.days_until_expiry}d`} size="small" color="warning" sx={{ ml: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>{d.whois_privacy ? 'Protected' : 'Public'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketingSeoPage;
