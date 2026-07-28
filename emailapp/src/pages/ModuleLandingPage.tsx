import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { dashboardPageHeaderSx, dashboardSectionHeadingSx, dashboardSummaryCardSx, dashboardSummaryGridSx } from '../styles/dashboardShell';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

interface ModuleLandingItem {
  label: string;
  path: string;
  description: string;
}

interface ModuleLandingPageProps {
  title: string;
  description: string;
  items: ModuleLandingItem[];
}

const ModuleLandingPage: React.FC<ModuleLandingPageProps> = ({ title, description, items }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background, pb: 6 }}>
      <Box sx={dashboardPageHeaderSx}>
        <Typography sx={{ fontSize: '24px', fontWeight: 700, color: dashboardTokens.colors.textPrimary, letterSpacing: '-.02em', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '.92rem', color: dashboardTokens.colors.textSecondary, mt: 0.6, maxWidth: 720 }}>
          {description}
        </Typography>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 4 }}>
        <Typography sx={dashboardSectionHeadingSx}>Module Navigation</Typography>
        <Box sx={dashboardSummaryGridSx}>
          {items.map((item) => (
            <Box key={item.label} sx={dashboardSummaryCardSx}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: '.82rem', color: dashboardTokens.colors.textSecondary, lineHeight: 1.55 }}>
                  {item.description}
                </Typography>
                <Button
                  variant="outlined"
                  endIcon={<OpenInNewIcon sx={{ fontSize: '1rem' }} />}
                  onClick={() => navigate(item.path)}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', borderColor: dashboardTokens.colors.borderStrong, color: dashboardTokens.colors.textPrimary }}
                >
                  Open {item.label}
                </Button>
              </Stack>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default ModuleLandingPage;
