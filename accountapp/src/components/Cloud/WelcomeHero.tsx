// OrcaCloud – Dashboard Welcome Hero

import React from 'react';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StorageIcon from '@mui/icons-material/Storage';
import HubIcon from '@mui/icons-material/Hub';
import ArticleIcon from '@mui/icons-material/Article';
import { useNavigate } from 'react-router-dom';

interface WelcomeHeroProps {
  username?: string;
  onDeployClick: () => void;
}

const quickActions = [
  { label: 'Create Virtual Machine', icon: <StorageIcon fontSize="small" />, path: '/dashboard/compute' },
  { label: 'Create Volume',          icon: <StorageIcon fontSize="small" />, path: '/dashboard/storage' },
  { label: 'View Networks',          icon: <HubIcon fontSize="small" />,     path: '/dashboard/networking' },
  { label: 'Open Documentation',     icon: <ArticleIcon fontSize="small" />, path: '/docs' },
];

const WelcomeHero: React.FC<WelcomeHeroProps> = ({ username, onDeployClick }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const greeting = username ? `Welcome back, ${username}` : 'Welcome to OrcaCloud';

  return (
    <Box
      sx={{
        background: isDark
          ? 'linear-gradient(135deg, #0F1E30 0%, #132336 60%, #162A42 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 60%, #eaf1ff 100%)',
        borderRadius: '8px',
        p: { xs: 3, md: 5 },
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(21,61,117,.2)'}`,
      }}
    >
      {/* Subtle grid backdrop */}
      <Box
        sx={{
          position: 'absolute', inset: 0, zIndex: 0, borderRadius: 3,
          backgroundImage: `
            linear-gradient(rgba(21,61,117,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(21,61,117,.05) 1px, transparent 1px)`,

          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
        }}
      />

      {/* Glow orb */}
      <Box
        sx={{
          position: 'absolute', top: -80, right: -80, width: 320, height: 320,
          borderRadius: '50%', zIndex: 0,
          background: 'radial-gradient(circle, rgba(21,61,117,.12) 0%, transparent 70%)',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Chip
          label="OrcaCloud Platform"
          size="small"
          sx={{
            mb: 2, bgcolor: 'rgba(21,61,117,.1)', color: '#111827',
            border: '1px solid rgba(21,61,117,.25)', fontWeight: 700,
            fontSize: '.7rem', letterSpacing: '.05em', textTransform: 'uppercase',
          }}
        />

        <Typography
          variant="h3"
          fontWeight={800}
          color={isDark ? '#ffffff' : '#111827'}
          sx={{ letterSpacing: '-.02em', mb: 1.5, lineHeight: 1.15 }}
        >
          {greeting}
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: isDark ? '#ffffff' : '#6B7280', maxWidth: 560, mb: 3.5, lineHeight: 1.75, fontSize: '1.05rem' }}
        >
          Your infrastructure starts here.{' '}
          <Box component="span" sx={{ color: '#111827', fontWeight: 600 }}>Deploy</Box>,{' '}
          scale, and manage cloud resources with enterprise‑grade power.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" gap={1.5}>
          <Button
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            onClick={onDeployClick}
            sx={{
              bgcolor: '#153d75', color: '#fff', fontWeight: 700,
              px: 3, borderRadius: '6px',
              '&:hover': { bgcolor: '#0f2d5a', transform: 'translateY(-1px)', boxShadow: '0 4px 16px rgba(21,61,117,.35)' },
              transition: 'all .2s',
            }}
          >
            Deploy Your First Server
          </Button>

          {quickActions.slice(1).map((action) => (
            <Button
              key={action.label}
              variant="outlined"
              size="large"
              startIcon={action.icon}
              onClick={() => navigate(action.path)}
              sx={{
                borderColor: 'rgba(21,61,117,.3)', color: '#111827', fontWeight: 600,
                px: 2.5, borderRadius: '6px',
                '&:hover': { borderColor: '#111827', color: '#153d75', bgcolor: 'rgba(21,61,117,.06)' },
                transition: 'all .2s',
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default WelcomeHero;
