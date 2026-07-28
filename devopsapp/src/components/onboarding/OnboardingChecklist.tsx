import React, { useState } from 'react';
import {
  Box,
  Button,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  PlayArrow as StartIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  CloudUpload as CloudIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Button as DSButton } from '../design-system/Button';
import { Card as DSCard } from '../design-system/Card';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  locked: boolean;
  action: string;
  route?: string;
  estimatedTime: string;
}

interface OnboardingChecklistProps {
  onComplete: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { state, actions } = useOnboarding();
  const checklistItems: ChecklistItem[] = [
    {
      id: 'verify_email',
      title: 'Verify Email',
      description: 'Confirm your email address to secure your account',
      icon: <KeyIcon />,
      completed: state.checklistProgress.verify_email,
      locked: false,
      action: 'Verify Email',
      route: '/settings/account',
      estimatedTime: '1 min',
    },
    {
      id: 'create_project',
      title: 'Create Project',
      description: 'Set up your first project workspace',
      icon: <ComputerIcon />,
      completed: state.checklistProgress.create_project,
      locked: false,
      action: 'Create Project',
      route: '/onboarding/project',
      estimatedTime: '3 min',
    },
    {
      id: 'deploy_instance',
      title: 'Deploy First Instance',
      description: 'Launch your first virtual machine',
      icon: <StorageIcon />,
      completed: state.checklistProgress.deploy_instance,
      locked: !state.checklistProgress.create_project,
      action: 'Deploy Instance',
      route: '/onboarding/deploy',
      estimatedTime: '5 min',
    },
    {
      id: 'configure_security',
      title: 'Configure Security',
      description: 'Set up security groups and access rules',
      icon: <NetworkIcon />,
      completed: state.checklistProgress.configure_security,
      locked: !state.checklistProgress.deploy_instance,
      action: 'Configure Security',
      route: '/developer/security',
      estimatedTime: '4 min',
    },
    {
      id: 'setup_monitoring',
      title: 'Setup Monitoring',
      description: 'Configure monitoring and alerts for your resources',
      icon: <CloudIcon />,
      completed: state.checklistProgress.setup_monitoring,
      locked: !state.checklistProgress.configure_security,
      action: 'Setup Monitoring',
      route: '/developer/monitoring',
      estimatedTime: '3 min',
    },
    {
      id: 'enable_backups',
      title: 'Enable Backups',
      description: 'Set up automated backups for your data',
      icon: <CodeIcon />,
      completed: state.checklistProgress.enable_backups,
      locked: !state.checklistProgress.setup_monitoring,
      action: 'Enable Backups',
      route: '/developer/backups',
      estimatedTime: '2 min',
    },
  ];

  // Update checklist progress when actions are completed
  const handleChecklistUpdate = (itemId: string, completed: boolean) => {
    actions.updateChecklistProgress({
      ...state.checklistProgress,
      [itemId]: completed,
    });
  };

  const completedCount = Object.values(state.checklistProgress).filter(Boolean).length;
  const totalCount = Object.keys(state.checklistProgress).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAction = (item: ChecklistItem) => {
    if (item.locked) return;

    // Mark item as completed when action is taken
    handleChecklistUpdate(item.id, true);

    if (item.route) {
      navigate(item.route);
    } else {
      // Handle other actions
      console.log(`Starting ${item.id}`);
    }
  };

  const allCompleted = completedCount === totalCount;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <DSCard variant="form" title="Welcome to Your Project!">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Complete these steps to get started with OrcaCloud
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow this guided checklist to explore the platform and set up your infrastructure.
            Each step builds on the previous one to ensure a smooth onboarding experience.
          </Typography>

          {/* Progress Overview */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completedCount} of {totalCount} completed
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* Checklist Items */}
          <List sx={{ width: '100%' }}>
            {checklistItems.map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  bgcolor: item.completed ? 'success.light' : 'background.paper',
                  opacity: item.locked ? 0.6 : 1,
                }}
              >
                <ListItemIcon sx={{ color: item.completed ? 'success.main' : item.locked ? 'text.disabled' : 'primary.main' }}>
                  {item.completed ? <CheckCircleIcon /> : item.locked ? <LockIcon /> : <UncheckedIcon />}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.estimatedTime}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  }
                />

                <ListItemSecondaryAction>
                  <Tooltip title={item.locked ? 'Complete previous steps first' : item.action}>
                    <span>
                      <IconButton
                        edge="end"
                        onClick={() => handleAction(item)}
                        disabled={item.locked}
                        color={item.completed ? 'success' : 'primary'}
                      >
                        {item.completed ? <CheckCircleIcon /> : <StartIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {/* Completion Message */}
          {allCompleted && (
            <DSCard variant="dashboard" sx={{ mt: 3, bgcolor: 'success.light', borderColor: 'success.main' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: '3rem', color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom color="success.main">
                  Congratulations! 🎉
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  You've completed all onboarding steps. You're now ready to build amazing things
                  with OrcaCloud.
                </Typography>
                <DSButton variant="primary" onClick={onComplete}>
                  Explore Dashboard
                </DSButton>
              </CardContent>
            </DSCard>
          )}

          {/* Quick Actions */}
          {!allCompleted && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => navigate('/developer/dashboard')}>
                Skip to Dashboard
              </Button>
              <DSButton
                variant="primary"
                onClick={() => navigate('/developer/compute/instances/create')}
              >
                Create Your First Instance
              </DSButton>
            </Box>
          )}
        </CardContent>
      </DSCard>
    </Box>
  );
};

export default OnboardingChecklist;
