import React, { useEffect } from 'react';
import { Box, Container, Paper, Typography, Stepper, Step, StepLabel, Button, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';

// Import onboarding components
import AccountCreationForm from './AccountCreationForm';
import EnterpriseSetupStep from './EnterpriseSetupStep';
import PlanSelectionStep from './PlanSelectionStep';
import ProjectInitialization from './ProjectInitialization';
import OnboardingChecklist from './OnboardingChecklist';
import FirstDeploymentWizard from './FirstDeploymentWizard';
import GroundingLayer from './GroundingLayer';
import PostDeploymentSurface from './PostDeploymentSurface';

// Phase 1 = account, phase 2 = plan selection, phases 3-7 = cloud-only steps
const CLOUD_STEPS = [
  'Create Account',
  'Choose Plan',
  'Initialize Project',
  'Checklist',
  'Deploy Instance',
  'Explore Dashboard',
  'Advanced Features',
];

const DEV_STEPS = [
  'Create Account',
  'Choose Plan',
];

const ENTERPRISE_STEPS = [
  'Create Account',
  'Choose Plan',
  'Set Up Organization',
];

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() as any;
  const { state, actions } = useOnboarding();

  const isDeveloper  = state.userPlan === 'developer';
  const isEnterprise = state.userPlan === 'enterprise';
  const steps = isDeveloper ? DEV_STEPS : isEnterprise ? ENTERPRISE_STEPS : CLOUD_STEPS;

  // Determine current phase from URL
  useEffect(() => {
    const pathPhase = getPhaseFromPath(location.pathname);
    if (pathPhase && pathPhase !== state.currentPhase) {
      actions.setCurrentPhase(pathPhase);
    }
  }, [location.pathname, state.currentPhase, actions]);

  // Guard: redirect to account step if not authenticated
  useEffect(() => {
    if (!user) navigate('/onboarding/account');
  }, [user, navigate]);

  const getPhaseFromPath = (path: string): number | null => {
    if (path.includes('/account')) return 1;
    if (path.includes('/plan')) return 2;
    if (path.endsWith('/enterprise') || path.includes('/onboarding/enterprise')) return 8;
    if (path.includes('/project')) return 3;
    if (path.includes('/checklist')) return 4;
    if (path.includes('/deploy')) return 5;
    if (path.includes('/dashboard')) return 6;
    if (path.includes('/advanced')) return 7;
    return null;
  };

  const handlePhaseComplete = (phase: number, data?: any) => {
    actions.completePhase(phase);

    switch (phase) {
      case 1: // account done
        if (data) actions.updateAccountData(data);
        navigate('/onboarding/plan');
        break;

      case 2: // plan selected
        if (data === 'developer') {
          // Developer users: skip cloud phases, go straight to dev dashboard
          actions.setUserPlan('developer');
          actions.completeOnboarding();
          navigate('/developer/Dashboard');
        } else if (data === 'enterprise') {
          // Enterprise users: go to org setup step
          actions.setUserPlan('enterprise');
          navigate('/onboarding/enterprise');
        } else {
          actions.setUserPlan('cloud');
          navigate('/onboarding/project');
        }
        break;

      case 8: // enterprise org setup done
        actions.completeOnboarding();
        navigate(`/enterprise/${data?.slug ?? 'org'}/overview`);
        break;

      case 3: // project done
        if (data) actions.updateProjectData(data);
        navigate('/onboarding/checklist');
        break;

      case 4: // checklist done
        navigate('/onboarding/deploy');
        break;

      case 5: // deploy done
        if (data) actions.updateDeploymentData(data);
        navigate('/onboarding/dashboard');
        break;

      case 6: // explore dashboard done
        navigate('/onboarding/advanced');
        break;

      case 7: // advanced done
        actions.completeOnboarding();
        navigate('/cloud');
        break;
    }
  };

  const handleSkipToDashboard = () => {
    actions.completeOnboarding();
    navigate(isEnterprise ? '/enterprise/org/overview' : isDeveloper ? '/developer/Dashboard' : '/cloud');
  };

  const renderCurrentPhase = () => {
    switch (state.currentPhase) {
      case 1:
        return (
          <AccountCreationForm
            onComplete={(data) => handlePhaseComplete(1, data)}
            initialData={state.accountData || undefined}
          />
        );
      case 2:
        return (
          <PlanSelectionStep
            onComplete={(plan) => handlePhaseComplete(2, plan)}
          />
        );
      case 3:
        return (
          <ProjectInitialization
            onComplete={(data) => handlePhaseComplete(3, data)}
          />
        );
      case 4:
        return (
          <OnboardingChecklist
            onComplete={() => handlePhaseComplete(4)}
          />
        );
      case 5:
        return (
          <FirstDeploymentWizard
            onComplete={() => handlePhaseComplete(5)}
          />
        );
      case 6:
        return (
          <GroundingLayer
            onComplete={() => handlePhaseComplete(6)}
          />
        );
      case 7:
        return (
          <PostDeploymentSurface
            onComplete={() => handlePhaseComplete(7)}
          />
        );
      case 8:
        return (
          <EnterpriseSetupStep
            onComplete={(data) => handlePhaseComplete(8, data)}
          />
        );
      default:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" gutterBottom>
              Onboarding Complete! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You're all set. Let's go!
            </Typography>
            <Button variant="contained" size="large" onClick={handleSkipToDashboard}>
              Go to Dashboard
            </Button>
          </Box>
        );
    }
  };

  // Show stepper only after account creation
  const showStepper = state.currentPhase > 1;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {showStepper && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom align="center">
              OrcaCloud Onboarding
            </Typography>
            <Stepper activeStep={state.currentPhase - 1} sx={{ mb: 2 }}>
              {steps.map((label, index) => (
                <Step key={label} completed={state.completedPhases.includes(index + 1)}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Step {state.currentPhase} of {steps.length}
              </Typography>
              {state.currentPhase > 2 && (
                <Button variant="outlined" size="small" onClick={handleSkipToDashboard}>
                  Skip to Dashboard
                </Button>
              )}
            </Box>
          </Paper>
        )}

        {state.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {state.error}
          </Alert>
        )}

        {renderCurrentPhase()}
      </Container>
    </Box>
  );
};

export default OnboardingFlow;
