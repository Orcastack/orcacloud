import React from 'react';
import { Box, Container, Typography, Card, CardContent, Stack } from '@mui/material';
import {
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';

const FeaturesPage: React.FC = () => {
  const primaryBlue = '#153d75'; // OrcaCloud brand color
  const accentCyan = '#153d75';
  const darkGray = '#1F2937';
  const lightGray = '#F3F4F6';

  const featureCategories = [
    {
      title: 'Core Infrastructure',
      features: [
        {
          icon: <CloudIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'Auto-Scaling',
          description: 'Automatically scale your infrastructure based on demand. Handle traffic spikes without manual intervention.',
        },
        {
          icon: <SpeedIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'Global CDN',
          description: 'Deliver content lightning-fast with our globally distributed content delivery network.',
        },
        {
          icon: <TrendingUpIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'Load Balancing',
          description: 'Intelligent load balancing distributes traffic across multiple servers for optimal performance.',
        },
      ],
    },
    {
      title: 'Security & Compliance',
      features: [
        {
          icon: <SecurityIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'End-to-End Encryption',
          description: 'All data is encrypted in transit and at rest using industry-standard encryption protocols.',
        },
        {
          icon: <CheckCircleIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'Compliance Ready',
          description: 'Built with SOC 2, ISO 27001, and GDPR control mapping plus evidence collection APIs.',
        },
        {
          icon: <BoltIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'DDoS Protection',
          description: 'Advanced DDoS mitigation to protect your applications from attacks.',
        },
      ],
    },
    {
      title: 'Developer Experience',
      features: [
        {
          icon: <CodeIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'REST & GraphQL APIs',
          description: 'Simple and powerful APIs using REST and GraphQL for maximum flexibility and query efficiency.',
        },
        {
          icon: <BoltIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'SDKs & Libraries',
          description: 'Official SDKs for Python, Node.js, Go, and Java, plus CLI automation workflows.',
        },
        {
          icon: <CheckCircleIcon sx={{ fontSize: 48, color: accentCyan }} />,
          name: 'Comprehensive Docs',
          description: 'Detailed documentation with examples and best practices for every feature.',
        },
      ],
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${darkGray} 100%)`,
          color: 'white',
          py: { xs: 4, md: 6 },
          textAlign: 'left',
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center' }}>
          <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: '#FFFFFF', lineHeight: { xs: 1.12, md: 1.08 }, letterSpacing: { xs: '-0.5px', md: '-1px' }, fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.35rem' }, maxWidth: 620 }}>
            Powerful Features
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, color: '#FFFFFF', maxWidth: 620, lineHeight: { xs: 1.42, md: 1.4 } }}>
            Everything you need to build, deploy, and scale world-class applications
          </Typography>
          </Box>
        </Container>
      </Box>

      {/* Features by Category */}
      {featureCategories.map((category, idx) => (
        <Box key={idx} sx={{ py: { xs: 6, md: 8 }, bgcolor: idx % 2 === 1 ? lightGray : 'white' }}>
          <Container maxWidth="lg">
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 6,
                textAlign: 'center',
                color: primaryBlue,
              }}
            >
              {category.title}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                gap: 3,
              }}
            >
              {category.features.map((feature, fIdx) => (
                <Card
                  key={fIdx}
                  sx={{
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(30, 58, 138, 0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        color: darkGray,
                      }}
                    >
                      {feature.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: darkGray,
                        opacity: 0.75,
                        lineHeight: 1.6,
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Container>
        </Box>
      ))}

      {/* Benefits Section */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 6,
              textAlign: 'center',
              color: primaryBlue,
            }}
          >
            Why Choose orcacloud?
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 4,
            }}
          >
            {[
              { title: '99.99% Uptime', desc: 'Enterprise-grade reliability with multi-region redundancy' },
              { title: 'Sub-100ms Latency', desc: 'Global infrastructure ensures fast response times worldwide' },
              { title: '10x Faster Setup', desc: 'Get production-ready in hours, not weeks' },
              { title: '24/7 Support', desc: 'Dedicated support team available round the clock' },
              { title: 'Transparent Pricing', desc: 'No hidden fees, pay only for what you use' },
              { title: 'Free Migration', desc: 'Expert assistance to migrate from your current provider' },
            ].map((benefit, idx) => (
              <Stack
                key={idx}
                direction="row"
                gap={2}
                sx={{
                  p: 3,
                  borderLeft: `4px solid ${accentCyan}`,
                  borderRadius: 1,
                  bgcolor: lightGray,
                }}
              >
                <Box
                  sx={{
                    minWidth: 60,
                    height: 60,
                    bgcolor: `${accentCyan}22`,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleIcon sx={{ color: accentCyan, fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: darkGray, mb: 0.5 }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkGray, opacity: 0.75 }}>
                    {benefit.desc}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default FeaturesPage;
