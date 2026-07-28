// OrcaCloud – Documentation & Support Panel

import React from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Typography, Paper, Grid, Stack, Chip,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CodeIcon from '@mui/icons-material/Code';
import TerminalIcon from '@mui/icons-material/Terminal';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';

interface DocLink {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  path: string;
  external?: boolean;
}

const DOC_LINKS: DocLink[] = [
  {
    icon: <MenuBookIcon />,
    title: 'Getting Started',
    description: 'Step-by-step guide from account setup to your first deployment.',
    badge: 'Recommended',
    badgeColor: 'rgba(21,61,117,.12)',
    path: '/docs#getting-started',
  },
  {
    icon: <CodeIcon />,
    title: 'API Documentation',
    description: 'Full REST API reference with authentication, endpoints, and examples.',
    path: '/docs#api',
  },
  {
    icon: <TerminalIcon />,
    title: 'CLI Tools',
    description: 'Manage your cloud from the command line. Automate deploys and pipelines.',
    badge: 'New',
    badgeColor: 'rgba(59,130,246,.15)',
    path: '/docs#cli',
  },
  {
    icon: <ReceiptLongIcon />,
    title: 'Billing Guide',
    description: 'Understand usage-based pricing, invoices, and cost management.',
    path: '/docs#billing',
  },
  {
    icon: <SupportAgentIcon />,
    title: 'Support Center',
    description: 'Open a ticket, chat live, or browse the community knowledge base.',
    badge: '24/7',
    badgeColor: 'rgba(245,158,11,.15)',
    path: '/support',
  },
  {
    icon: <HelpOutlineIcon />,
    title: 'FAQ',
    description: 'Answers to the most common questions about OrcaCloud.',
    path: '/docs#faq',
  },
];

const DocsSupportPanel: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      elevation={0}
      sx={{
        background: isDark ? '#132336' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#E5E7EB'}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'}` }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <MenuBookIcon sx={{ color: '#111827', fontSize: '1.2rem' }} />
          <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize="1rem">
            Documentation & Support
          </Typography>
          <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : '#64748b', ml: .5 }}>
            — everything you need to build on OrcaCloud
          </Typography>
        </Stack>
      </Box>

      <Grid container sx={{ p: 2.5 }} spacing={2}>
        {DOC_LINKS.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.title}>
            <Box
              onClick={() => navigate(link.path)}
              sx={{
                p: 2, borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`,
                bgcolor: isDark ? '#162A42' : '#fafafa',
                height: '100%',
                display: 'flex', flexDirection: 'column',
                transition: 'all .18s',
                '&:hover': {
                  borderColor: 'rgba(21,61,117,.4)',
                  bgcolor: isDark ? '#1A3050' : 'rgba(21,61,117,.04)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} mb={1}>
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: 1.5,
                    bgcolor: 'rgba(21,61,117,.08)', color: '#111827',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    '& svg': { fontSize: '1rem' },
                  }}
                >
                  {link.icon}
                </Box>
                <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize=".88rem">
                  {link.title}
                </Typography>
                {link.badge && (
                  <Chip
                    label={link.badge}
                    size="small"
                    sx={{
                      ml: 'auto', bgcolor: link.badgeColor ?? 'rgba(0,0,0,.06)',
                      color: isDark ? '#ffffff' : '#374151', fontWeight: 700, fontSize: '.62rem', height: 18,
                    }}
                  />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: isDark ? '#ffffff' : '#64748b', lineHeight: 1.55, flex: 1 }}>
                {link.description}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={.5} mt={1.5}>
              <Typography variant="caption" sx={{ color: '#111827', fontWeight: 600, fontSize: '.75rem' }}>
                Read more
              </Typography>
              <ArrowForwardIcon sx={{ color: '#111827', fontSize: '.85rem' }} />
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default DocsSupportPanel;
