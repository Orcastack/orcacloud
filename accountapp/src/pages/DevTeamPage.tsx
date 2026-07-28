import React from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

const DevTeamPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Developer Team</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Engineering ownership and access for services, pipelines, and infrastructure.
      </Typography>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Primary Service</TableCell>
                <TableCell>On-call</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Frank', 'Platform Engineer', 'payment-service', 'Yes'],
                ['Jane', 'Backend Engineer', 'events-worker', 'Yes'],
                ['Sarah', 'Frontend Engineer', 'web-frontend', 'No'],
              ].map((row) => (
                <TableRow key={row[0]}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell>{row[1]}</TableCell>
                  <TableCell>{row[2]}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row[3]} color={row[3] === 'Yes' ? 'success' : 'default'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DevTeamPage;
