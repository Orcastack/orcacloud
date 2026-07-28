import React from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

const MarketingTeamPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Marketing Team</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Campaign ownership, channel operators, and publishing permissions.
      </Typography>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Publish Access</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Lina', 'Campaign Manager', 'Email', 'Yes'],
                ['Omar', 'Growth Analyst', 'SEO', 'No'],
                ['Nadia', 'Content Lead', 'Multi-channel', 'Yes'],
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

export default MarketingTeamPage;
