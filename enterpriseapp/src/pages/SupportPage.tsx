import React from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  TextField,
  MenuItem,
} from '@mui/material';

const SupportPage: React.FC = () => {
  const primaryBlue = '#111827';
  const darkGray = '#1F2937';
  const accentCyan = '#153d75';
  const lightGray = '#F3F4F6';

  return (
    <Box>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${darkGray} 100%)`,
          color: 'white',
          py: { xs: 4, md: 6 },
          textAlign: 'left',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            gap: { xs: 3, md: 5 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 2,
                color: '#FFFFFF',
                lineHeight: { xs: 1.12, md: 1.08 },
                letterSpacing: { xs: '-0.5px', md: '-1px' },
                fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.35rem' },
                maxWidth: 620,
              }}
            >
              Support Center
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 400,
                color: '#FFFFFF',
                maxWidth: 620,
                lineHeight: { xs: 1.42, md: 1.4 },
              }}
            >
              Get help with incidents, billing, technical guidance, and platform operations from our cloud support team.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: lightGray }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              { title: 'Technical Support', detail: 'Platform issues, service errors, deployment troubleshooting' },
              { title: 'Billing Support', detail: 'Invoices, usage charges, credits, and payment issues' },
              { title: 'Account Support', detail: 'Access control, team management, identity & security help' },
            ].map((item) => (
              <Box key={item.title} sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', borderRadius: '2px', p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, color: primaryBlue, mb: 0.75 }}>{item.title}</Typography>
                <Typography sx={{ color: darkGray, opacity: 0.8, lineHeight: 1.5 }}>{item.detail}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', borderRadius: '2px', p: { xs: 2.5, md: 3.5 } }}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: primaryBlue, mb: 2 }}>
              Open a Support Request
            </Typography>

            <Stack spacing={2} component="form">
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Full Name" fullWidth required size="small" />
                <TextField label="Work Email" type="email" fullWidth required size="small" />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Company" fullWidth required size="small" />
                <TextField label="Severity" select fullWidth defaultValue="medium" size="small">
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </TextField>
              </Stack>

              <TextField label="Subject" fullWidth required size="small" />
              <TextField
                label="Description"
                fullWidth
                required
                multiline
                minRows={5}
                placeholder="Describe the issue, affected services, and impact."
                size="small"
              />

              <Button
                variant="contained"
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: accentCyan,
                  color: primaryBlue,
                  borderRadius: '2px',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  '&:hover': { bgcolor: '#0f2d5a' },
                }}
              >
                Submit Ticket
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default SupportPage;
