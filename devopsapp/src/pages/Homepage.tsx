import React, { useState } from 'react';
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Lan as LanIcon,
  AutoAwesome as AutoAwesomeIcon,
  Memory as MemoryIcon,
  Security as SecurityIcon,
  Public as PublicIcon,
  Insights as InsightsIcon,
  Workspaces as WorkspacesIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import LoginDialog from '../components/Auth/LoginDialog';
import SignupDialog from '../components/Auth/SignupDialog';
import {
  dashboardSemanticColors,
  dashboardTokens,
  computeUiTokens,
} from '../styles/dashboardDesignSystem';

const RADIUS = '2px';
const SPEED = '120ms cubic-bezier(0.4, 0, 0.2, 1)';

const COLORS = {
  navy: computeUiTokens.neutralStrong,
  blue: '#3b82f6',
  blueHover: '#0f2d5a',
  white: dashboardTokens.colors.white,
  graphite: dashboardTokens.colors.textPrimary,
  silver: dashboardTokens.colors.border,
  slate: dashboardTokens.colors.textSecondary,
  cyan: dashboardSemanticColors.cyan,
  success: dashboardSemanticColors.success,
};

const pillars = [
  {
    title: 'Compute',
    text: 'Elastic virtual compute, bare metal tiers, and GPU capacity for high-throughput workloads.',
    icon: <CloudIcon sx={{ fontSize: 24 }} aria-label="Compute pillar icon" />,
  },
  {
    title: 'Storage',
    text: 'Object, block, and file services with policy-driven lifecycle, replication, and durability.',
    icon: <StorageIcon sx={{ fontSize: 24 }} aria-label="Storage pillar icon" />,
  },
  {
    title: 'Networking',
    text: 'Private networking, global ingress, load balancing, and deterministic traffic control.',
    icon: <LanIcon sx={{ fontSize: 24 }} aria-label="Networking pillar icon" />,
  },
  {
    title: 'AI & Automation',
    text: 'Predictive scaling, anomaly detection, and orchestration for continuous optimization.',
    icon: <AutoAwesomeIcon sx={{ fontSize: 24 }} aria-label="AI & Automation pillar icon" />,
  },
  {
    title: 'Governance, Security & Compliance',
    text: 'Policy-as-code enforcement, zero-trust identity, full auditability, and support for SOC 2, ISO 27001, PCI-DSS, HIPAA, and GDPR.',
    icon: <SecurityIcon sx={{ fontSize: 24 }} aria-label="Governance pillar icon" />,
  },
  {
    title: 'Developer Velocity',
    text: 'GitOps-native workflows, automated CI/CD, self-service environments, and guardrails that enable rapid, safe delivery.',
    icon: <MemoryIcon sx={{ fontSize: 24 }} aria-label="Developer Velocity pillar icon" />,
  },
  {
    title: 'Intelligent Operations & FinOps',
    text: 'Predictive autoscaling, cost and performance insights, automated remediation, and intelligent workload placement.',
    icon: <InsightsIcon sx={{ fontSize: 24 }} aria-label="FinOps pillar icon" />,
  },
  {
    title: 'Hybrid, Multi-Cloud & Edge',
    text: 'Unified control plane for on-prem, cloud, and edge environments using open standards — OpenStack, Kubernetes, S3, OCI, and OIDC.',
    icon: <PublicIcon sx={{ fontSize: 24 }} aria-label="Hybrid Cloud pillar icon" />,
  },
  {
    title: 'Performance & Cost Predictability',
    text: 'Deterministic performance SLAs, hardware-accelerated compute, tiered storage with predictable latency, and transparent real-time cost analytics.',
    icon: <WorkspacesIcon sx={{ fontSize: 24 }} aria-label="Performance pillar icon" />,
  },
  {
    title: 'Extensibility & Ecosystem Integration',
    text: 'API-first architecture, plugin and operator ecosystem, event-driven automation, and a marketplace for certified applications.',
    icon: <ExtensionIcon sx={{ fontSize: 24 }} aria-label="Extensibility pillar icon" />,
  },
];

const features = [
  {
    title: 'OrcaCloud Tenancy and Policy Controls',
    text: 'Isolated tenancy, policy-as-code enforcement, and governance frameworks designed for regulated and mission-critical environments.',
  },
  {
    title: 'Kubernetes-Native Service Topology',
    text: 'Workload orchestration built on Kubernetes primitives with service discovery, autoscaling, and declarative configuration.',
  },
  {
    title: 'GPU and High-Memory Compute Pools',
    text: 'Accelerated compute tiers for AI, ML, simulation, and high-throughput data processing workloads.',
  },
  {
    title: 'S3-Compatible Object Storage APIs',
    text: 'Durable, scalable object storage with lifecycle policies, replication, and full S3 API compatibility.',
  },
  {
    title: 'Zero-Trust Identity and RBAC',
    text: 'Identity-centric security with workload isolation, fine-grained RBAC, and continuous authentication.',
  },
  {
    title: 'Global Observability and Incident Workflows',
    text: 'Unified metrics, logs, traces, and alerting with automated incident workflows and root-cause insights.',
  },
  {
    title: 'Deterministic Networking Fabric',
    text: 'High-performance virtual networking with deterministic latency, global routing, and programmable traffic policies.',
  },
  {
    title: 'Immutable Deployments and GitOps Automation',
    text: 'Declarative infrastructure, continuous reconciliation, and automated environment provisioning with guardrails.',
  },
  {
    title: 'API-First Integration Layer',
    text: 'Unified APIs for compute, storage, networking, identity, and events, enabling seamless integration across systems.',
  },
  {
    title: 'Managed Databases and Data Services',
    text: 'High-availability relational, NoSQL, and streaming data services with automated backups and encryption.',
  },
  {
    title: 'End-to-End Encryption and Secrets Lifecycle',
    text: 'Encrypted data at rest and in transit, automated key rotation, and secure secrets distribution.',
  },
  {
    title: 'Multi-Region Resilience',
    text: 'Cross-region failover, disaster recovery orchestration, and continuous replication for mission-critical workloads.',
  },
  {
    title: 'AI-Driven Optimization',
    text: 'Predictive autoscaling, anomaly detection, and intelligent workload placement for cost and performance efficiency.',
  },
  {
    title: 'Developer Tooling and Environment Sandboxes',
    text: 'Self-service dev/test environments, ephemeral sandboxes, and integrated CI/CD pipelines.',
  },
  {
    title: 'Container Registry and Artifact Security',
    text: 'Private OCI registry with image signing, vulnerability scanning, and supply-chain integrity checks.',
  },
  {
    title: 'Service Mesh and Workload Identity',
    text: 'mTLS, policy-driven service communication, and workload-level identity for secure microservice architectures.',
  },
];

const industries = [
  'Financial Services',
  'Healthcare & Life Sciences',
  'Government & Defense',
  'Manufacturing & Industrial Automation',
  'Logistics & Smart Mobility',
  'Retail & eCommerce',
  'Media, Gaming & Entertainment',
  'Energy & Utilities',
  'Research, AI & HPC',
];

const stack = [
  { title: 'Control Plane', items: ['API-first', 'RBAC', 'Audit Logs', 'Policy Engine'] },
  { title: 'Compute Layer', items: ['VMs', 'Kubernetes', 'GPU Nodes', 'Auto Scaling'] },
  { title: 'Data Layer', items: ['Object Storage', 'Block Storage', 'Managed Databases', 'Backups'] },
  { title: 'Edge & Network', items: ['VPC', 'L4/L7 Balancers', 'CDN', 'DDoS Protection'] },
];

const caseStudies = [
  {
    org: 'Continental Payments Group',
    result: '38% latency reduction across regional payment APIs.',
  },
  {
    org: 'Northern Grid Utility',
    result: '99.99% uptime with policy-based failover across two regions.',
  },
  {
    org: 'Apex Retail Systems',
    result: '2.7x faster analytics workloads on GPU-backed clusters.',
  },
];

const infraRegions = ['Johannesburg', 'Frankfurt', 'Singapore', 'New York', 'São Paulo', 'Sydney'];

const sectionTitleSx = {
  fontWeight: 600,
  lineHeight: { xs: 1.13, md: 1.08 },
  letterSpacing: { xs: '-0.4px', md: '-0.7px' },
  fontSize: { xs: '1.9rem', sm: '2.15rem', md: '2.5rem' },
  color: COLORS.graphite,
  textAlign: 'center' as const,
};

const sectionSubSx = {
  fontWeight: 400,
  fontSize: { xs: '1rem', md: '1.125rem' },
  lineHeight: { xs: 1.42, md: 1.4 },
  letterSpacing: '-0.1px',
  color: COLORS.slate,
  maxWidth: 760,
  textAlign: 'center' as const,
  mx: 'auto',
};

const cardSx = {
  border: `1px solid ${COLORS.silver}`,
  borderRadius: RADIUS,
  bgcolor: COLORS.white,
  p: 3,
  transition: `border-color ${SPEED}, color ${SPEED}, transform ${SPEED}`,
  '&:hover': {
    borderColor: COLORS.blue,
    transform: 'translateY(-1px)',
  },
};

const Homepage: React.FC = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <Box sx={{ bgcolor: COLORS.white }}>
      <Box
        id="hero"
        sx={{
          bgcolor: COLORS.navy,
          color: COLORS.white,
          borderBottom: `1px solid ${COLORS.silver}`,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontWeight: 600,
                  lineHeight: { xs: 1.12, sm: 1.1, md: 1.08 },
                  letterSpacing: { xs: '-0.5px', md: '-1px' },
                  fontSize: { xs: '2.35rem', sm: '2.9rem', md: '3.85rem' },
                  maxWidth: 620,
                  color: COLORS.white,
                }}
              >
                OrcaCloud Cloud Infrastructure for Enterprise-Grade Scale
              </Typography>
              <Typography
                sx={{
                  mt: 2,
                  fontWeight: 400,
                  fontSize: { xs: '1.02rem', md: '1.22rem' },
                  lineHeight: { xs: 1.42, md: 1.4 },
                  letterSpacing: '-0.1px',
                  maxWidth: 540,
                  color: COLORS.white,
                }}
              >
                OrcaCloud unifies compute, storage, networking, and AI automation into a
                high-performance control plane designed for regulated, global workloads.
              </Typography>

            </Box>

            <Box sx={{ border: '1px solid rgba(255,255,255,.16)', borderRadius: RADIUS, p: 3 }}>
              <Typography sx={{ fontSize: '.75rem', fontWeight: 500, letterSpacing: '.08em', color: COLORS.white }}>
                GLOBAL CONTROL PLANE
              </Typography>
              <Divider sx={{ borderColor: 'rgba(255,255,255,.16)', my: 2 }} />
              <Stack spacing={2}>
                {[
                  { icon: <MemoryIcon sx={{ color: COLORS.cyan, fontSize: 18 }} />, text: 'Compute orchestration across OrcaCloud zones' },
                  { icon: <SecurityIcon sx={{ color: COLORS.cyan, fontSize: 18 }} />, text: 'Policy-enforced zero-trust access controls' },
                  { icon: <PublicIcon sx={{ color: COLORS.cyan, fontSize: 18 }} />, text: 'Multi-region failover and traffic governance' },
                  { icon: <InsightsIcon sx={{ color: COLORS.cyan, fontSize: 18 }} />, text: 'Real-time telemetry and predictive operations' },
                ].map((row) => (
                  <Stack key={row.text} direction="row" spacing={1.5} alignItems="center">
                    {row.icon}
                    <Typography sx={{ fontSize: '.94rem', lineHeight: 1.4, letterSpacing: '-0.05px', color: COLORS.white }}>{row.text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Typography component="h2" sx={{ ...sectionTitleSx, textAlign: 'center' }}>Product Pillars</Typography>
        <Typography sx={{ ...sectionSubSx, mt: 1.5, mb: 4, textAlign: 'center', mx: 'auto' }}>
          The OrcaCloud platform is engineered as a cohesive infrastructure fabric with
          deterministic operations, strict governance, and developer-grade velocity.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, gap: 2 }}>
          {pillars.map((pillar) => (
            <Box key={pillar.title} sx={{ ...cardSx, textAlign: 'center', alignItems: 'center' }}>
              <Box sx={{ color: COLORS.blue, display: 'flex', justifyContent: 'center' }}>{pillar.icon}</Box>
              <Typography component="h3" sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.02rem', md: '1.06rem' }, lineHeight: 1.16, letterSpacing: '-0.2px' }}>
                {pillar.title}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: '.94rem', lineHeight: 1.4, letterSpacing: '-0.05px', color: COLORS.slate }}>
                {pillar.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: dashboardTokens.colors.surfaceSubtle, borderTop: `1px solid ${COLORS.silver}`, borderBottom: `1px solid ${COLORS.silver}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
          <Typography component="h2" sx={sectionTitleSx}>Feature Grid</Typography>
          <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
            {features.map((feature) => (
              <Box key={feature.title} sx={{ ...cardSx, p: 2.5 }}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 18, mt: '2px', flexShrink: 0 }} aria-label="Feature check" />
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '.94rem', lineHeight: 1.3, letterSpacing: '-0.1px' }}>{feature.title}</Typography>
                    <Typography sx={{ mt: 0.75, fontSize: '.87rem', lineHeight: 1.45, letterSpacing: '-0.05px', color: COLORS.slate }}>{feature.text}</Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Typography component="h2" sx={sectionTitleSx}>Industry Solutions</Typography>
        <Typography sx={{ ...sectionSubSx, mt: 1.5, mb: 4 }}>
          Built for regulated, mission-critical environments where reliability, compliance,
          and performance are non-negotiable.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
          {industries.map((industry) => (
            <Box key={industry} sx={{ ...cardSx, p: 2.5, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '.98rem', lineHeight: 1.22, letterSpacing: '-0.15px' }}>{industry}</Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: COLORS.navy, color: COLORS.white, borderTop: `1px solid ${COLORS.silver}`, borderBottom: `1px solid ${COLORS.silver}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
          <Typography component="h2" sx={{ ...sectionTitleSx, color: COLORS.white }}>Technology Stack</Typography>
          <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
            {stack.map((layer) => (
              <Box key={layer.title} sx={{ border: '1px solid rgba(255,255,255,.18)', borderRadius: RADIUS, p: 2.5, textAlign: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <WorkspacesIcon sx={{ fontSize: 18, color: COLORS.cyan }} aria-label="Stack layer icon" />
                  <Typography sx={{ fontWeight: 600, fontSize: '.98rem', lineHeight: 1.2, letterSpacing: '-0.15px' }}>{layer.title}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mt: 2 }}>
                  {layer.items.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,.08)',
                        color: COLORS.white,
                        borderRadius: RADIUS,
                        border: '1px solid rgba(255,255,255,.2)',
                        fontSize: '.7rem',
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Typography component="h2" sx={sectionTitleSx}>Case Studies</Typography>
        <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
          {caseStudies.map((item) => (
            <Box key={item.org} sx={{ ...cardSx, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '.98rem', lineHeight: 1.2, letterSpacing: '-0.15px' }}>{item.org}</Typography>
              <Typography sx={{ mt: 1.5, fontSize: '.94rem', lineHeight: 1.4, letterSpacing: '-0.05px', color: COLORS.slate }}>{item.result}</Typography>
            </Box>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: dashboardTokens.colors.surfaceSubtle, borderTop: `1px solid ${COLORS.silver}`, borderBottom: `1px solid ${COLORS.silver}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
          <Typography component="h2" sx={sectionTitleSx}>Global Infrastructure Map</Typography>
          <Typography sx={{ ...sectionSubSx, mt: 1.5, mb: 4 }}>
            Strategically distributed cloud regions for low latency, resilience, and OrcaCloud
            deployment requirements.
          </Typography>
          <Box sx={{ border: `1px solid ${COLORS.silver}`, borderRadius: RADIUS, p: 3, bgcolor: COLORS.white }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6,1fr)' }, gap: 1.5 }}>
              {infraRegions.map((region) => (
                <Box key={region} sx={{ border: `1px solid ${COLORS.silver}`, borderRadius: RADIUS, p: 1.5, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '.84rem', lineHeight: 1.2, letterSpacing: '-0.1px' }}>{region}</Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ mt: 2, fontSize: '.84rem', lineHeight: 1.4, letterSpacing: '-0.05px', color: COLORS.slate, textAlign: 'center' }}>
              Multi-region availability · 99.99% uptime target · Enterprise SLA-backed operations
            </Typography>
          </Box>
        </Container>
      </Box>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />
      <SignupDialog
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSwitchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
      />
    </Box>
  );
};

export default Homepage;
