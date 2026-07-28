import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const ContactSalesPage: React.FC = () => {
  const primaryBlue = '#111827';
  const darkGray = '#1F2937';
  const accentCyan = '#153d75';
  const lightGray = '#F3F4F6';

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

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
              Contact Sales
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
              Talk to our cloud specialists about pricing, migration, enterprise support, and a tailored platform plan.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: lightGray }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
              gap: 3,
            }}
          >
            <Box sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', p: { xs: 2.5, md: 3.5 }, borderRadius: '2px' }}>
              <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: primaryBlue, mb: 2 }}>
                Tell us about your requirements
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField label="Full Name" required fullWidth size="small" />
                  <TextField label="Work Email" type="email" required fullWidth size="small" />
                  <TextField label="Company" required fullWidth size="small" />
                  <TextField label="Country/Region" required fullWidth size="small" />
                  <TextField label="Team Size" select fullWidth size="small" defaultValue="1-25">
                    <MenuItem value="1-25">1-25</MenuItem>
                    <MenuItem value="26-100">26-100</MenuItem>
                    <MenuItem value="101-500">101-500</MenuItem>
                    <MenuItem value="500+">500+</MenuItem>
                  </TextField>
                  <TextField
                    label="How can we help?"
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                    placeholder="Share your workload goals, timeline, regions, or compliance needs."
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      alignSelf: 'flex-start',
                      bgcolor: accentCyan,
                      color: '#FFFFFF',
                      borderRadius: '2px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5,
                      py: 1,
                      '&:hover': { bgcolor: '#0f2d5a' },
                    }}
                  >
                    Submit Request
                  </Button>

                  {submitted && (
                    <Typography sx={{ color: '#166534', fontSize: '.9rem', fontWeight: 500 }}>
                      Thanks — our sales team will contact you shortly.
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>

            <Box sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', p: { xs: 2.5, md: 3.5 }, borderRadius: '2px' }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: primaryBlue, mb: 2 }}>
                Sales Information
              </Typography>
              <Stack spacing={1.5}>
                <Typography sx={{ color: darkGray, lineHeight: 1.6 }}>
                  <strong>Email:</strong> sales@orcacloud.com
                </Typography>
                <Typography sx={{ color: darkGray, lineHeight: 1.6 }}>
                  <strong>Availability:</strong> Monday - Friday, 24-hour response target
                </Typography>
                <Typography sx={{ color: darkGray, lineHeight: 1.6 }}>
                  <strong>Best for:</strong> enterprise onboarding, migration planning, pricing optimization, and compliance-ready deployments
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ContactSalesPage;
