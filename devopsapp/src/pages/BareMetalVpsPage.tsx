import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

type PageContent = {
  title: string;
  subtitle: string;
  section: 'Bare Metal Servers' | 'VPS' | 'Quick Access';
};

const pageMap: Record<string, PageContent> = {
  'high-performance-compute': {
    title: 'High-Performance Compute',
    subtitle: 'Dedicated high-frequency compute nodes for latency-sensitive and CPU-intensive enterprise workloads.',
    section: 'Bare Metal Servers',
  },
  'gpu-accelerated-servers': {
    title: 'GPU-Accelerated Servers',
    subtitle: 'Optimized bare metal GPU infrastructure for AI training, inference, rendering, and accelerated analytics.',
    section: 'Bare Metal Servers',
  },
  'storage-optimized-servers': {
    title: 'Storage-Optimized Servers',
    subtitle: 'High-capacity, high-throughput server profiles for data lakes, backup systems, and archival services.',
    section: 'Bare Metal Servers',
  },
  'network-optimized-servers': {
    title: 'Network-Optimized Servers',
    subtitle: 'Enhanced bandwidth and low-latency server configurations for edge, gaming, and telecom workloads.',
    section: 'Bare Metal Servers',
  },
  'dedicated-ai-nodes': {
    title: 'Dedicated AI Nodes',
    subtitle: 'Purpose-built AI infrastructure with isolated compute, optimized memory pathways, and accelerator support.',
    section: 'Bare Metal Servers',
  },
  'general-purpose-vps': {
    title: 'General Purpose VPS',
    subtitle: 'Balanced virtual server profiles for web applications, APIs, and business workloads.',
    section: 'VPS',
  },
  'compute-optimized-vps': {
    title: 'Compute-Optimized VPS',
    subtitle: 'Higher vCPU-to-memory ratio for compute-heavy services and burst processing tasks.',
    section: 'VPS',
  },
  'memory-optimized-vps': {
    title: 'Memory-Optimized VPS',
    subtitle: 'Memory-first instances for caching layers, in-memory databases, and real-time processing.',
    section: 'VPS',
  },
  'gpu-vps': {
    title: 'GPU VPS',
    subtitle: 'Virtualized GPU instances for lightweight AI workloads, visualization, and accelerated pipelines.',
    section: 'VPS',
  },
  'container-ready-vps': {
    title: 'Container-Ready VPS',
    subtitle: 'VPS profiles pre-configured for containerized workloads and modern microservice operations.',
    section: 'VPS',
  },
  'compare-server-types': {
    title: 'Compare Server Types',
    subtitle: 'Compare Bare Metal and VPS profiles by performance, isolation, scaling model, and cost profile.',
    section: 'Quick Access',
  },
  pricing: {
    title: 'Bare Metal & VPS Pricing',
    subtitle: 'Reference pricing structure for server families, billing options, and capacity tiers.',
    section: 'Quick Access',
  },
  'availability-by-region': {
    title: 'Availability by Region',
    subtitle: 'Regional capacity and location coverage for Bare Metal and VPS services across cloud zones.',
    section: 'Quick Access',
  },
  documentation: {
    title: 'Bare Metal & VPS Documentation',
    subtitle: 'Operational guides, architecture recommendations, and deployment references for compute services.',
    section: 'Quick Access',
  },
};

const BareMetalVpsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const content = slug ? pageMap[slug] : undefined;

  if (!content) {
    return (
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, mb: 1 }}>Page not found</Typography>
          <Button onClick={() => navigate('/features')} variant="contained" sx={{ textTransform: 'none', borderRadius: '2px' }}>
            Back to Features
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
          color: '#FFFFFF',
          py: { xs: 4, md: 6 },
          textAlign: 'left',
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: { xs: 3, md: 5 }, alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: '#FFFFFF', lineHeight: { xs: 1.12, md: 1.08 }, letterSpacing: { xs: '-0.5px', md: '-1px' }, fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.2rem' }, maxWidth: 700 }}>
              {content.title}
            </Typography>
            <Typography sx={{ fontWeight: 400, color: '#FFFFFF', maxWidth: 700, lineHeight: { xs: 1.42, md: 1.4 }, fontSize: { xs: '1rem', md: '1.1rem' } }}>
              {content.subtitle}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: '#F3F4F6' }}>
        <Container maxWidth="lg">
          <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '2px', p: { xs: 2.5, md: 3 } }}>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', mb: 1 }}>
              Section: {content.section}
            </Typography>
            <Typography sx={{ color: '#1F2937', opacity: 0.82, lineHeight: 1.55, mb: 2 }}>
              This page is ready for detailed product documentation and can be edited later with full technical content, pricing tables, benchmarks, and architecture guidance.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button onClick={() => navigate('/features')} variant="outlined" sx={{ textTransform: 'none', borderRadius: '2px', borderColor: '#111827', color: '#111827' }}>
                Back to Features
              </Button>
              <Button onClick={() => navigate('/contact')} variant="contained" sx={{ textTransform: 'none', borderRadius: '2px', bgcolor: '#153d75', color: '#FFFFFF', '&:hover': { bgcolor: '#0f2d5a' } }}>
                Contact Sales
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default BareMetalVpsPage;
