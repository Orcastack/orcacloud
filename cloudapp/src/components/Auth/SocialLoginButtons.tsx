import React from 'react';
import { Button, Box, CircularProgress } from '@mui/material';
import {
  GitHub,
  Google,
} from '@mui/icons-material';
import { SocialProvider } from '../../types/auth';
import { useAuth } from '../../contexts/AuthContext';
import { SocialAuthService } from '../../services/socialAuthService';

// Custom GitLab and LinkedIn icons as SVG components
const ____GitLabIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    style={{ ...sx }}
    fill="currentColor"
  >
    <path d="M12 21.42l3.684-11.333h-7.368L12 21.42zM3.16 10.087L12 21.42l-8.84-11.333 1.16-3.574L1.68 3.939l1.48 6.148zM20.84 10.087L12 21.42l8.84-11.333-1.16-3.574L22.32 3.939l-1.48 6.148zM12 21.42L8.316 10.087H1.68L12 21.42zM12 21.42l3.684-11.333H22.32L12 21.42z" />
  </svg>
);

const ____LinkedInIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    style={{ ...sx }}
    fill="currentColor"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

interface SocialLoginButtonsProps {
  loading: boolean;
  disabled?: boolean;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ loading, disabled = false }) => {
  const { socialLogin } = useAuth();
  const [loadingProvider, setLoadingProvider] = React.useState<SocialProvider | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      setLoadingProvider(provider);
      await socialLogin(provider);
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      // Handle error (could show toast notification here)
    } finally {
      setLoadingProvider(null);
    }
  };

  const providers: Array<{
    provider: SocialProvider;
    icon: React.ReactNode;
    name: string;
  }> = [
    {
      provider: 'github',
      icon: <GitHub />,
      name: 'GitHub',
    },
    {
      provider: 'google',
      icon: <Google />,
      name: 'Google',
    },
    {
      provider: 'gitlab',
      icon: <____GitLabIcon />,
      name: 'GitLab',
    },
    {
      provider: 'linkedin',
      icon: <____LinkedInIcon />,
      name: 'LinkedIn',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
      {providers.map(({ provider, icon, name }) => {
        const providerInfo = SocialAuthService.getProviderInfo(provider);
        const isLoadingThis = loadingProvider === provider;
        
        return (
          <Button
            key={provider}
            fullWidth
            variant="outlined"
            startIcon={isLoadingThis ? <CircularProgress size={20} /> : icon}
            disabled={loading || disabled || isLoadingThis}
            onClick={() => handleSocialLogin(provider)}
            sx={{
              borderColor: providerInfo.color,
              color: providerInfo.color,
              '&:hover': {
                borderColor: providerInfo.hoverColor,
                backgroundColor: `${providerInfo.color}15`,
                color: providerInfo.hoverColor,
              },
              '&:disabled': {
                opacity: 0.6,
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {name}
          </Button>
        );
      })}
    </Box>
  );
};

export default SocialLoginButtons;
