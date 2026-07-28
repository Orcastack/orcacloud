import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { getPortalLoginUrl, getPortalPlan, getPortalTargetUrl, portalTargetLabels, PortalTarget, resolvePortalTarget } from '../portal/portalConfig';
import { buildPortalTransferUrl, getStoredAuthUser } from '../portal/portalSession';
import type { LoginRequest } from '../types/auth';
import { dashboardTokens } from '../styles/dashboardDesignSystem';

export default function PortalLoginPage() {
  const { login, user } = useAuth();
  const { actions } = useOnboarding();
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState<PortalTarget>(resolvePortalTarget(searchParams.get('target')));
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinationLabel = useMemo(() => portalTargetLabels[target], [target]);

  const redirectToTarget = (
    selectedTarget: PortalTarget,
    onboardingState?: { isCompleted: boolean; userPlan: 'cloud' | 'developer' | 'enterprise' | null },
  ) => {
    const token = localStorage.getItem('authToken');
    const storedUser = getStoredAuthUser();
    const destinationUrl = buildPortalTransferUrl(getPortalTargetUrl(selectedTarget), {
      token,
      user: storedUser,
      onboarding: onboardingState || undefined,
    });
    window.location.assign(destinationUrl);
  };

  if (user) {
    redirectToTarget(target);
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(formData);
      const userPlan = getPortalPlan(target);
      actions.setUserPlan(userPlan);
      actions.completeOnboarding();
      redirectToTarget(target, { isCompleted: true, userPlan });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboardTokens.colors.background, display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 3 }}>
          <Paper sx={{ p: 4, borderRadius: 2, border: `1px solid ${dashboardTokens.colors.border}`, boxShadow: 'none' }}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>
              Sign in to OrcaCloud
            </Typography>
            <Typography sx={{ mt: 1, color: dashboardTokens.colors.textSecondary }}>
              Authenticate once, then continue to the selected local dashboard service.
            </Typography>

            {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Stack spacing={2}>
                <TextField
                  label="Destination"
                  select
                  value={target}
                  onChange={(event) => setTarget(resolvePortalTarget(event.target.value))}
                  helperText="Choose which dashboard this login should open."
                >
                  {Object.entries(portalTargetLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                />
                <Button type="submit" variant="contained" disabled={submitting} sx={{ textTransform: 'none', fontWeight: 700, py: 1.2 }}>
                  {submitting ? 'Signing in...' : `Sign in to ${destinationLabel}`}
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Paper sx={{ p: 4, borderRadius: 2, border: `1px solid ${dashboardTokens.colors.border}`, bgcolor: dashboardTokens.colors.surfaceSubtle, boxShadow: 'none' }}>
            <Typography sx={{ fontWeight: 700, color: dashboardTokens.colors.textPrimary }}>Local developer flow</Typography>
            <Typography sx={{ mt: 1.5, color: dashboardTokens.colors.textSecondary, lineHeight: 1.6 }}>
              This login flow now requires the real backend authentication service. Use a valid account from the running OrcaCloud backend.
            </Typography>
            <Button href={getPortalLoginUrl()} sx={{ mt: 3, textTransform: 'none' }}>
              Reset target selection
            </Button>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
