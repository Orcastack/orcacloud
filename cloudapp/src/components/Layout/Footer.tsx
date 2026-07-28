import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import { ChevronRight, Twitter, GitHub, LinkedIn, Instagram, Facebook } from '@mui/icons-material';
import { dashboardTokens } from '../../styles/dashboardDesignSystem';

type FooterLink = {
  label: string;
  path: string;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

// ─── Color palette ───────────────────────────────────────────────────────────
const BG_DEEP     = '#0b1422';
const BG_CARD     = '#111d2e';
const ACCENT      = '#4a9eff';
const ACCENT_DIM  = 'rgba(74,158,255,.18)';
const TEXT_BRIGHT = '#e8edf5';
const TEXT_DIM    = 'rgba(232,237,245,.6)';
const TEXT_MUTED  = 'rgba(232,237,245,.36)';
const DIVIDER_CLR = 'rgba(74,158,255,.12)';

const sections: FooterSection[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Compute & Virtual Machines',         path: '/dashboard/compute' },
      { label: 'Kubernetes & Container Orchestration', path: '/dashboard/kubernetes' },
      { label: 'Object, Block & Archive Storage',     path: '/dashboard/storage' },
      { label: 'Networking, Load Balancing & CDN',    path: '/dashboard/network' },
      { label: 'Identity, Access & Security',         path: '/dashboard/settings' },
      { label: 'AI, Automation & Developer Tools',    path: '/developer' },
    ],
  },
  {
    title: 'Build & Deploy',
    links: [
      { label: 'Drag-and-Drop App Builder',                   path: '/developer' },
      { label: 'AI-Assisted Development',                     path: '/developer' },
      { label: 'Email Hosting & Low-Cost Mail Services',      path: '/dashboard/domains' },
      { label: 'Domain Registration (ResellerClub Integration)', path: '/dashboard/domains' },
      { label: 'API-First Architecture',                      path: '/developer' },
      { label: 'Global Deployment Zones',                     path: '/docs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About OrcaCloud',        path: '/about' },
      { label: 'Leadership & Vision',     path: '/about' },
      { label: 'Compliance & Security',   path: '/docs' },
      { label: 'Careers & Partnerships',  path: '/about' },
      { label: 'Press & Media',           path: '/resources' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Documentation',               path: '/docs' },
      { label: 'Developer Guides',            path: '/developer' },
      { label: 'Status & Monitoring',         path: '/dashboard/monitoring' },
      { label: 'Billing & Account Management', path: '/dashboard/billing' },
      { label: 'Contact Support',             path: '/support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service',              path: '/docs' },
      { label: 'Privacy Policy',               path: '/docs' },
      { label: 'Acceptable Use Policy',        path: '/docs' },
      { label: 'Security & Compliance Standards', path: '/docs' },
    ],
  },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: 'Twitter',   icon: <Twitter   sx={{ fontSize: 18 }} />, url: 'https://twitter.com/OrcaCloud' },
    { name: 'GitHub',    icon: <GitHub    sx={{ fontSize: 18 }} />, url: 'https://github.com/OrcaCloud' },
    { name: 'LinkedIn',  icon: <LinkedIn  sx={{ fontSize: 18 }} />, url: 'https://linkedin.com/company/orcacloud' },
    { name: 'Instagram', icon: <Instagram sx={{ fontSize: 18 }} />, url: 'https://instagram.com/orcacloud' },
    { name: 'Facebook',  icon: <Facebook  sx={{ fontSize: 18 }} />, url: 'https://facebook.com/orcacloud' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        background: BG_DEEP,
        color: TEXT_BRIGHT,
        mt: 'auto',
      }}
    >
      {/* ── Brand / tagline row ─────────────────────────────────────────── */}
      <Box sx={{ background: BG_CARD, borderBottom: `1px solid rgba(74,158,255,.12)` }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              py: { xs: 3.5, md: 4.5 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            {/* Logo + descriptor */}
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: '1.35rem', md: '1.55rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: dashboardTokens.colors.white,
                  lineHeight: 1.2,
                  '& span': { color: ACCENT },
                }}
              >
                Orcacompute
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: '.85rem',
                  color: TEXT_DIM,
                  fontWeight: 400,
                  letterSpacing: '.01em',
                }}
              >
                OrcaCloud Cloud Infrastructure built for the Enterprise
              </Typography>
            </Box>

            {/* Social icons */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              {socialLinks.map((social) => (
                <IconButton
                  key={social.name}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  aria-label={social.name}
                  sx={{
                    color: TEXT_DIM,
                    border: `1px solid rgba(74,158,255,.12)`,
                    borderRadius: '8px',
                    width: 34,
                    height: 34,
                    transition: 'all 180ms ease',
                    '&:hover': {
                      color: ACCENT,
                      borderColor: ACCENT,
                      background: ACCENT_DIM,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ── Links grid ──────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr 1fr',
              sm: 'repeat(3, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: { xs: '2rem 1.5rem', md: '2.5rem 2rem' },
          }}
        >
          {sections.map((section) => (
            <Box key={section.title}>
              {/* Section title */}
              <Box sx={{ mb: 1.75 }}>
                <Typography
                  sx={{
                    fontSize: '.78rem',
                    fontWeight: 700,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: ACCENT,
                    mb: 0.75,
                  }}
                >
                  {section.title}
                </Typography>
                {/* accent underline */}
                <Box
                  sx={{
                    width: 24,
                    height: 2,
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${ACCENT}, transparent)`,
                  }}
                />
              </Box>

              {/* Links */}
              <Stack spacing={1.1}>
                {section.links.map((item) => (
                  <Link
                    key={item.label}
                    component={RouterLink}
                    to={item.path}
                    underline="none"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.3,
                      color: TEXT_DIM,
                      fontSize: '.85rem',
                      lineHeight: 1.5,
                      fontWeight: 400,
                      transition: 'color 150ms ease, gap 150ms ease',
                      '& .arrow-icon': {
                        fontSize: 14,
                        opacity: 0,
                        transition: 'opacity 150ms ease, transform 150ms ease',
                        transform: 'translateX(-4px)',
                        color: ACCENT,
                        flexShrink: 0,
                      },
                      '&:hover': {
                        color: TEXT_BRIGHT,
                        '& .arrow-icon': {
                          opacity: 1,
                          transform: 'translateX(0)',
                        },
                      },
                    }}
                  >
                    <ChevronRight className="arrow-icon" />
                    {item.label}
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>

        {/* ── Gradient divider ────────────────────────────────────────── */}
        <Box
          sx={{
            mt: { xs: 5, md: 6 },
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
            opacity: 0.35,
          }}
        />

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <Box
          sx={{
            pt: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={{ color: TEXT_MUTED, fontSize: '.82rem' }}>
              © {currentYear} OrcaCloud. All rights reserved.
            </Typography>
            <Typography sx={{ color: TEXT_MUTED, fontSize: '.8rem', letterSpacing: '.04em' }}>
              OrcaCloud · Scalable · Enterprise-Grade
            </Typography>
          </Stack>

          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(74,158,255,.12)' }} />}
            spacing={1.5}
            alignItems="center"
            flexWrap="wrap"
          >
            {['Privacy Policy', 'Terms of Service', 'Security & Compliance', 'Contact Support'].map((label) => (
              <Link
                key={label}
                component={RouterLink}
                to="/docs"
                underline="none"
                sx={{
                  color: TEXT_MUTED,
                  fontSize: '.8rem',
                  transition: 'color 150ms ease',
                  '&:hover': { color: ACCENT },
                }}
              >
                {label}
              </Link>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
