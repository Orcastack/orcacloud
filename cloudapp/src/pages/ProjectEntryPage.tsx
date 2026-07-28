import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

const FONT = dashboardTokens.typography.fontFamily;
const t = dashboardTokens.colors;

type Provider = 'github' | 'gitlab' | 'bitbucket';

interface ProviderDef {
  id: Provider;
  label: string;
  iconColor: string;
  abbr?: string;
  description: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'github',
    label: 'GitHub',
    iconColor: '#e6edf3',
    description: 'Import from public or private GitHub repositories',
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    iconColor: '#fc6d26',
    abbr: 'GL',
    description: 'Import from your GitLab groups and projects',
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    iconColor: '#0052cc',
    abbr: 'BB',
    description: 'Import from your Bitbucket workspaces',
  },
];

const CREATE_FEATURES = [
  'Initialize a new Git repository',
  'Set up CI/CD pipeline',
  'Configure developer workspace',
  'Choose language & compute type',
];

const ProviderIcon: React.FC<{ provider: ProviderDef; size?: number }> = ({ provider, size = 20 }) => {
  if (provider.id === 'github') {
    return <GitHubIcon sx={{ fontSize: size, color: t.textPrimary }} />;
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '4px',
        bgcolor: provider.iconColor,
        color: '#fff',
        fontWeight: 900,
        fontSize: size * 0.45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-0.5px',
        flexShrink: 0,
      }}
    >
      {provider.abbr}
    </Box>
  );
};

const ProjectEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<'import' | 'create' | null>(null);

  const cardSx = (which: 'import' | 'create') => ({
    flex: 1,
    border: `2px solid ${hoveredCard === which ? t.brandPrimary : t.border}`,
    bgcolor: t.surface,
    boxShadow: hoveredCard === which ? '0 0 0 4px rgba(21,61,117,.1)' : 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'border-color .18s, box-shadow .18s',
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: t.background,
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, md: 4 },
        fontFamily: FONT,
      }}
    >
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/developer/Dashboard/projects')}
        sx={{
          textTransform: 'none',
          color: t.textSecondary,
          alignSelf: 'flex-start',
          mb: 4,
          '&:hover': { color: t.textPrimary },
        }}
      >
        Back to Projects
      </Button>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Chip
          label="New Project"
          size="small"
          sx={{
            bgcolor: 'rgba(21,61,117,.1)',
            color: t.brandPrimary,
            fontWeight: 700,
            fontSize: '.7rem',
            mb: 1.5,
            letterSpacing: '.04em',
          }}
        />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.6rem', md: '2rem' },
            color: t.textPrimary,
            fontFamily: FONT,
            lineHeight: 1.2,
            mb: 1,
          }}
        >
          How would you like to get started?
        </Typography>
        <Typography sx={{ color: t.textSecondary, fontSize: '.95rem', maxWidth: 520, mx: 'auto' }}>
          Import an existing repository from a Git provider, or create a brand-new project from scratch.
        </Typography>
      </Box>

      {/* Cards row */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems="stretch"
        sx={{ maxWidth: 900, width: '100%', mx: 'auto' }}
      >
        {/* ── Import from Git card ── */}
        <Card
          sx={cardSx('import')}
          onMouseEnter={() => setHoveredCard('import')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            {/* Title row */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '10px',
                  bgcolor: 'rgba(21,61,117,.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GitHubIcon sx={{ color: t.brandPrimary, fontSize: '1.4rem' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: t.textPrimary, fontFamily: FONT }}>
                Import from Git
              </Typography>
              <Chip
                label="Fastest"
                size="small"
                sx={{
                  bgcolor: 'rgba(34,197,94,.1)',
                  color: '#22C55E',
                  fontWeight: 700,
                  fontSize: '.62rem',
                }}
              />
            </Stack>

            <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mb: 3, pl: 0.5 }}>
              Connect your account and import a repository from any major Git provider.
            </Typography>

            {/* Provider buttons */}
            <Stack spacing={1.5}>
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider.id}
                  fullWidth
                  variant="outlined"
                  startIcon={<ProviderIcon provider={provider} size={18} />}
                  onClick={() =>
                    navigate(`/developer/Dashboard/projects/import?provider=${provider.id}`)
                  }
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    color: t.textPrimary,
                    borderColor: t.border,
                    bgcolor: t.surfaceSubtle,
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '.875rem',
                    py: 1.25,
                    pl: 2,
                    gap: 0.5,
                    '&:hover': {
                      borderColor: t.brandPrimary,
                      bgcolor: 'rgba(21,61,117,.06)',
                    },
                  }}
                >
                  <Box sx={{ flex: 1, textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '.875rem', color: t.textPrimary, lineHeight: 1.2 }}>
                      Import from {provider.label}
                    </Typography>
                    <Typography sx={{ fontWeight: 400, fontSize: '.75rem', color: t.textSecondary, lineHeight: 1.2 }}>
                      {provider.description}
                    </Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ fontSize: '.85rem', color: t.textTertiary }} />
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* OR divider */}
        <Stack
          direction={{ xs: 'row', md: 'column' }}
          alignItems="center"
          justifyContent="center"
          sx={{ flexShrink: 0, display: { xs: 'none', md: 'flex' } }}
        >
          <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, height: 60 }} />
          <Box
            sx={{
              bgcolor: t.surfaceSubtle,
              border: `1px solid ${t.border}`,
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              my: 1,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: t.textSecondary, fontSize: '.75rem', fontWeight: 700 }}>OR</Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ borderColor: t.border, height: 60 }} />
        </Stack>

        {/* ── Create New Project card ── */}
        <Card
          sx={cardSx('create')}
          onMouseEnter={() => setHoveredCard('create')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => navigate('/developer/Dashboard/projects/create')}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Title row */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '10px',
                  bgcolor: 'rgba(21,61,117,.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddCircleOutlineIcon sx={{ color: t.brandPrimary, fontSize: '1.4rem' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: t.textPrimary, fontFamily: FONT }}>
                Create New Project
              </Typography>
            </Stack>

            <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mb: 3, pl: 0.5 }}>
              Start from scratch with a fully guided setup wizard.
            </Typography>

            {/* Feature list */}
            <Stack spacing={1.2} sx={{ flex: 1 }}>
              {CREATE_FEATURES.map((feat) => (
                <Stack key={feat} direction="row" alignItems="center" spacing={1.2}>
                  <CheckCircleOutlineIcon sx={{ fontSize: '1rem', color: t.brandPrimary, flexShrink: 0 }} />
                  <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>{feat}</Typography>
                </Stack>
              ))}
            </Stack>

            {/* CTA */}
            <Button
              variant="contained"
              fullWidth
              endIcon={<ArrowForwardIcon />}
              onClick={(e) => {
                e.stopPropagation();
                navigate('/developer/Dashboard/projects/create');
              }}
              sx={{
                mt: 3,
                bgcolor: t.brandPrimary,
                '&:hover': { bgcolor: t.brandPrimaryHover },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '10px',
                py: 1.2,
                fontSize: '.9rem',
              }}
            >
              Create New Project
            </Button>
          </CardContent>
        </Card>
      </Stack>

      {/* Footer hint */}
      <Typography
        sx={{
          mt: 4,
          textAlign: 'center',
          color: t.textTertiary,
          fontSize: '.78rem',
          maxWidth: 500,
          mx: 'auto',
        }}
      >
        You can always connect a repository, configure pipelines, and set up environments after your project is created.
      </Typography>
    </Box>
  );
};

export default ProjectEntryPage;
