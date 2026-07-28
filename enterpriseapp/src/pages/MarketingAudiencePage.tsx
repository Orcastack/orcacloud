import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, CircularProgress, Chip } from '@mui/material';
import { marketingApi } from '../services/cloudApi';
import type { ContactList } from '../types/marketing';

const MarketingAudiencePage: React.FC = () => {
  const [lists,   setLists]   = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketingApi.listContactLists()
      .then(res => setLists(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={2}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Audience Segmentation</Typography>
            {loading && <CircularProgress size={18} />}
          </Box>
          <Typography variant="body2" color="text.secondary">Manage static/dynamic segments and rebuild audience membership.</Typography>
        </Box>
        <Button variant="contained">Create Segment</Button>
      </Stack>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Subscribers</TableCell>
                <TableCell>Double Opt-in</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lists.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">No audience segments yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {lists.map(list => (
                <TableRow key={list.resource_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{list.name}</TableCell>
                  <TableCell>
                    <Chip label={list.status} size="small" color={list.status === 'active' ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>{list.subscriber_count.toLocaleString()}</TableCell>
                  <TableCell>{list.double_optin ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{new Date(list.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketingAudiencePage;
