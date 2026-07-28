import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  LinearProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GitHubIcon from '@mui/icons-material/GitHub';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const FONT = dashboardTokens.typography.fontFamily;
const t = dashboardTokens.colors;

type Provider = 'github' | 'gitlab' | 'bitbucket';

interface ProviderConfig {
  id: Provider;
  label: string;
  color: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  docsUrl: string;
  abbr?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'github',
    label: 'GitHub',
    color: '#e6edf3',
    tokenLabel: 'Personal Access Token',
    tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    color: '#fc6d26',
    abbr: 'GL',
    tokenLabel: 'Personal Access Token',
    tokenPlaceholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    color: '#0052cc',
    abbr: 'BB',
    tokenLabel: 'App Password',
    tokenPlaceholder: 'App password from Bitbucket settings',
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/',
  },
];

const STEPS = ['Choose Provider', 'Connect Account', 'Repository Integration Required'];

const ProviderBadge: React.FC<{ provider: ProviderConfig; size?: number; selected?: boolean; onClick?: () => void }> = ({
  provider, size = 40, selected = false, onClick,
}) => (
  <Tooltip title={provider.label}>
    <Box
      onClick={onClick}
      sx={{
        width: size, height: size, borderRadius: '10px',
        border: `2px solid ${selected ? t.brandPrimary : t.border}`,
        bgcolor: selected ? 'rgba(21,61,117,.08)' : t.surfaceSubtle,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s, background .15s',
        flexShrink: 0,
        '&:hover': onClick ? { borderColor: t.brandPrimary, bgcolor: 'rgba(21,61,117,.06)' } : {},
      }}
    >
      {provider.id === 'github'
        ? <GitHubIcon sx={{ fontSize: size * 0.5, color: selected ? t.brandPrimary : t.textPrimary }} />
        : (
          <Typography sx={{ fontWeight: 900, fontSize: size * 0.3, color: selected ? t.brandPrimary : provider.color }}>
            {provider.abbr}
          </Typography>
        )
      }
    </Box>
  </Tooltip>
);

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: t.surfaceSubtle,
    color: t.textPrimary,
    borderRadius: '10px',
    fontSize: '.875rem',
    '& fieldset': { borderColor: t.border },
    '&:hover fieldset': { borderColor: t.borderStrong },
    '&.Mui-focused fieldset': { borderColor: t.brandPrimary, boxShadow: '0 0 0 3px rgba(21,61,117,.12)' },
  },
  '& .MuiInputLabel-root': { color: t.textSecondary, fontSize: '.875rem' },
};

const ProjectImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProvider = (searchParams.get('provider') as Provider) || 'github';
  const [step, setStep] = useState(initialProvider ? 1 : 0);
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [token, setToken] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const cfg = PROVIDERS.find((p) => p.id === provider)!;

  useEffect(() => {
    setConnected(false);
    setToken('');
    setConnectError(null);
  }, [provider]);

  const handleConnect = () => {
    if (!token.trim()) {
      setConnectError('Please enter a valid access token.');
      return;
    }
    setConnecting(true);
    setConnectError(null);
    window.setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      setStep(2);
      setConnectError(`Repository import for ${cfg.label} requires a backend provider integration. Mock repositories have been removed.`);
    }, 250);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.background, fontFamily: FONT, p: { xs: 2, md: 4 } }}>
      {/* Back */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/developer/Dashboard/projects/new')}
        sx={{ textTransform: 'none', color: t.textSecondary, mb: 3, '&:hover': { color: t.textPrimary } }}
      >
        Back
      </Button>

      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
        <ProviderBadge provider={cfg} size={44} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: t.textPrimary, lineHeight: 1.2 }}>
            Import from {cfg.label}
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: '.85rem' }}>
            Connect your {cfg.label} account and select a repository to import
          </Typography>
        </Box>

        {/* Provider switcher */}
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          {PROVIDERS.map((p) => (
            <ProviderBadge
              key={p.id}
              provider={p}
              size={36}
              selected={p.id === provider}
              onClick={() => { setProvider(p.id as Provider); setStep(1); }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4, maxWidth: 700 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel
              sx={{
                '& .MuiStepLabel-label': { color: t.textSecondary, fontSize: '.8rem', fontFamily: FONT },
                '& .MuiStepLabel-label.Mui-active': { color: t.textPrimary, fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: dashboardSemanticColors.success },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ maxWidth: 700 }}>
        {/* ── Step 1: Connect account ── */}
        {step === 1 && (
          <Card sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: '14px', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <LockIcon sx={{ color: t.brandPrimary, fontSize: '1.1rem' }} />
                <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '1rem' }}>
                  Connect your {cfg.label} account
                </Typography>
              </Stack>
              <Typography sx={{ color: t.textSecondary, fontSize: '.85rem', mb: 3 }}>
                Enter your {cfg.tokenLabel} with <code>repo</code> and <code>read:user</code> scopes.{' '}
                <Box
                  component="a"
                  href={cfg.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ color: t.brandPrimary, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  How to create a token
                </Box>
              </Typography>

              <TextField
                fullWidth
                label={cfg.tokenLabel}
                placeholder={cfg.tokenPlaceholder}
                type={tokenVisible ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                sx={inputSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box
                        onClick={() => setTokenVisible((v) => !v)}
                        sx={{ cursor: 'pointer', color: t.textSecondary, display: 'flex' }}
                      >
                        {tokenVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />

              {connectError && (
                <Alert severity="error" sx={{ mt: 1.5, fontSize: '.82rem' }}>{connectError}</Alert>
              )}

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={connecting || !token.trim()}
                  endIcon={connecting ? <CircularProgress size={14} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{
                    bgcolor: t.brandPrimary,
                    '&:hover': { bgcolor: t.brandPrimaryHover },
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '10px',
                  }}
                >
                  {connecting ? 'Connecting…' : `Connect ${cfg.label}`}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/developer/Dashboard/projects/new')}
                  sx={{ textTransform: 'none', color: t.textSecondary, borderColor: t.border, borderRadius: '10px' }}
                >
                  Cancel
                </Button>
              </Stack>

              <Divider sx={{ borderColor: t.border, my: 3 }} />

              <Typography sx={{ color: t.textTertiary, fontSize: '.78rem' }}>
                Backend-backed provider import is required. This page no longer fabricates repository results locally.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Select repository ── */}
        {step === 2 && connected && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CheckCircleIcon sx={{ color: dashboardSemanticColors.success, fontSize: '1.1rem' }} />
              <Typography sx={{ color: dashboardSemanticColors.success, fontWeight: 600, fontSize: '.875rem' }}>
                Connected to {cfg.label}
              </Typography>
              <Button
                size="small"
                onClick={() => setStep(1)}
                sx={{ ml: 'auto', textTransform: 'none', color: t.textSecondary, fontSize: '.78rem' }}
              >
                Disconnect
              </Button>
            </Stack>

            <TextField
              fullWidth
              placeholder="Search repositories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ ...inputSx, mb: 2 }}
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: t.textSecondary, fontSize: '1.1rem' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
              No repositories are shown locally anymore. Connect this page to a backend provider integration before importing from {cfg.label}.
            </Alert>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProjectImportPage;
