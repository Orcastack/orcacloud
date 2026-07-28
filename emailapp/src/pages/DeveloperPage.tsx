import React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

type DevSection = {
  title: string;
  items: { name: string; description: string; route: string }[];
};

const sections: DevSection[] = [
  {
    title: 'Build & Delivery',
    items: [
      { name: 'Deployments', description: 'Release workflows, environments, and deployment orchestration.', route: '/developer/Dashboard/deployments' },
      { name: 'CI/CD Pipelines', description: 'Build, test, and promote workloads across environments.', route: '/developer/Dashboard/cicd' },
      { name: 'Containers', description: 'Container lifecycle, image management, and vulnerability scanning.', route: '/developer/Dashboard/containers' },
      { name: 'Kubernetes', description: 'Cluster health, nodes, workloads, and namespace management.', route: '/developer/Dashboard/kubernetes' },
    ],
  },
  {
    title: 'Operate & Observe',
    items: [
      { name: 'Monitoring', description: 'Metrics, traces, logs, and runtime alerts.', route: '/developer/Dashboard/monitoring' },
      { name: 'Resource Control', description: 'Quota, limits, and policy enforcement for teams.', route: '/developer/Dashboard/resource-control' },
      { name: 'API Management', description: 'API policies, versioning, and lifecycle governance.', route: '/developer/Dashboard/api-management' },
    ],
  },
  {
    title: 'Developer Workspace',
    items: [
      { name: 'Workspace', description: 'Developer profile, preferences, and productivity setup.', route: '/developer/Dashboard/workspace' },
      { name: 'Service Docs', description: 'Cross-service documentation references and implementation notes.', route: '/docs' },
    ],
  },
];

const DeveloperPage: React.FC = () => {
  const primaryBlue = '#111827';
  const darkGray = '#1F2937';
  const lightGray = '#F3F4F6';
  const accentCyan = '#153d75';

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
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: '#FFFFFF', lineHeight: { xs: 1.12, md: 1.08 }, letterSpacing: { xs: '-0.5px', md: '-1px' }, fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.35rem' }, maxWidth: 700 }}>
              Developer Hub
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 400, color: '#FFFFFF', maxWidth: 700, lineHeight: { xs: 1.42, md: 1.4 } }}>
              Developer-focused documentation and entry points for deployment, APIs, observability, and platform operations.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: lightGray }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            {sections.map((section) => (
              <Box key={section.title} sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', borderRadius: '2px', p: { xs: 2.5, md: 3 } }}>
                <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.4rem' }, fontWeight: 700, color: primaryBlue, mb: 1.5 }}>
                  {section.title}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  {section.items.map((item) => (
                    <Box key={item.name} sx={{ border: '1px solid #E5E7EB', borderRadius: '2px', p: 2, '&:hover': { borderColor: accentCyan } }}>
                      <Typography sx={{ fontWeight: 700, color: primaryBlue, mb: 0.5 }}>{item.name}</Typography>
                      <Typography sx={{ color: darkGray, opacity: 0.78, fontSize: '.9rem', lineHeight: 1.5, mb: 0.75 }}>{item.description}</Typography>
                      <Typography sx={{ color: '#0f766e', fontSize: '.78rem', fontWeight: 600 }}>Route: {item.route}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default DeveloperPage;
