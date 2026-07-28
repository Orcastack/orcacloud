import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface ToolPlaceholderPageProps {
  title: string;
  description: string;
}

const ToolPlaceholderPage: React.FC<ToolPlaceholderPageProps> = ({ title, description }) => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ToolPlaceholderPage;
