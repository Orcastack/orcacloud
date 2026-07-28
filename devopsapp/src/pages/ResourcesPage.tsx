import React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

type ResourceItem = {
  title: string;
  description: string;
  type: string;
};

type ResourceGroup = {
  heading: string;
  items: ResourceItem[];
};

const resourceGroups: ResourceGroup[] = [
  {
    heading: 'Learning Resources',
    items: [
      { title: 'Quickstart Guides', description: 'Fast setup instructions for core platform services.', type: 'Guide' },
      { title: 'Architecture Blueprints', description: 'Reference patterns for secure and scalable deployments.', type: 'Blueprint' },
      { title: 'Migration Playbooks', description: 'Step-by-step approaches to move workloads into OrcaCloud.', type: 'Playbook' },
    ],
  },
  {
    heading: 'Operational Resources',
    items: [
      { title: 'Runbooks', description: 'Production-ready response procedures for common incidents.', type: 'Runbook' },
      { title: 'Compliance Packs', description: 'Controls and evidence mapping for regulated environments.', type: 'Compliance' },
      { title: 'Security Advisories', description: 'Security notices and remediation guidance for customers.', type: 'Security' },
    ],
  },
  {
    heading: 'Business Resources',
    items: [
      { title: 'Case Studies', description: 'Real-world adoption stories and measurable outcomes.', type: 'Case Study' },
      { title: 'Solution Briefs', description: 'Service-level positioning for enterprise use cases.', type: 'Brief' },
      { title: 'Support & Escalation', description: 'How to engage support and enterprise success teams.', type: 'Support' },
    ],
  },
];

const ResourcesPage: React.FC = () => {
  const primaryBlue = '#153d75'; // OrcaCloud brand color
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
              Resource Center
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 400, color: '#FFFFFF', maxWidth: 700, lineHeight: { xs: 1.42, md: 1.4 } }}>
              Central hub for guides, reference assets, operational playbooks, and enterprise enablement material.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: lightGray }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            {resourceGroups.map((group) => (
              <Box key={group.heading} sx={{ bgcolor: 'white', border: '1px solid #E5E7EB', borderRadius: '2px', p: { xs: 2.5, md: 3 } }}>
                <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.4rem' }, fontWeight: 700, color: primaryBlue, mb: 1.5 }}>
                  {group.heading}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
                  {group.items.map((item) => (
                    <Box key={item.title} sx={{ border: '1px solid #E5E7EB', borderRadius: '2px', p: 2, '&:hover': { borderColor: accentCyan } }}>
                      <Typography sx={{ fontWeight: 700, color: primaryBlue, mb: 0.5 }}>{item.title}</Typography>
                      <Typography sx={{ color: darkGray, opacity: 0.78, fontSize: '.9rem', lineHeight: 1.5, mb: 0.75 }}>{item.description}</Typography>
                      <Typography sx={{ color: '#0f766e', fontSize: '.78rem', fontWeight: 600 }}>{item.type}</Typography>
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

export default ResourcesPage;
