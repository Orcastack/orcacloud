// OrcaCloud – Onboarding Checklist

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  LinearProgress, Tooltip, Collapse, IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import { OnboardingProgress, OnboardingStepDef } from '../../types/cloud';
import { onboardingApi } from '../../services/cloudApi';

interface OnboardingChecklistProps {
  progress: OnboardingProgress | null;
  loading: boolean;
  onRefresh: () => void;
}

const STEPS: OnboardingStepDef[] = [
  {
    key: 'verify_email',
    label: 'Verify Account Email',
    description: 'Confirm your email address to activate your account and receive important notifications.',
    actionLabel: 'Verified automatically',
  },
  {
    key: 'add_ssh_key',
    label: 'Add SSH Key',
    description: 'Upload your public SSH key to securely connect to virtual machines via terminal.',
    actionLabel: 'Add SSH Key',
    actionPath: '/dashboard/account/ssh-keys',
  },
  {
    key: 'create_vm',
    label: 'Create Your First VM',
    description: 'Deploy a virtual machine in seconds. Choose your OS, size, and region.',
    actionLabel: 'Create VM',
    actionPath: '/dashboard/compute/create',
  },
  {
    key: 'configure_network',
    label: 'Configure Networking',
    description: 'Set up a Virtual Private Cloud (VPC) to isolate and secure your resources.',
    actionLabel: 'Configure Network',
    actionPath: '/dashboard/networking',
  },
  {
    key: 'attach_volume',
    label: 'Attach a Volume',
    description: 'Create and attach a persistent block storage volume to your VM for data.',
    actionLabel: 'Create Volume',
    actionPath: '/dashboard/storage',
  },
  {
    key: 'explore_dashboard',
    label: 'Explore the Dashboard',
    description: 'Familiarise yourself with monitoring, billing, and team management features.',
    actionLabel: 'Mark Complete',
  },
];

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ progress, loading, onRefresh }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const pct = progress?.completion_pct ?? 0;
  const allDone = pct === 100;

  const isComplete = (key: string) =>
    progress ? (progress as any)[key] === true : false;

  const handleMark = async (key: string) => {
    if (marking) return;
    setMarking(key);
    try {
      await onboardingApi.updateChecklist({ [key]: true } as any);
      onRefresh();
    } catch (e) {
      console.error('Failed to update checklist', e);
    } finally {
      setMarking(null);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: allDone ? 'rgba(21,61,117,.4)' : isDark ? 'rgba(255,255,255,.1)' : '#E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden',
        background: isDark ? '#132336' : '#ffffff',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'}`,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((p) => !p)}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h6" fontWeight={700} color={isDark ? '#ffffff' : '#111827'} fontSize="1rem">
            Getting Started Checklist
          </Typography>
          <Chip
            label={`${pct}% Complete`}
            size="small"
            sx={{
              bgcolor: allDone ? 'rgba(21,61,117,.1)' : 'rgba(0,0,0,.05)',
              color: allDone ? '#111827' : '#6B7280',
              fontWeight: 700, fontSize: '.7rem',
            }}
          />
        </Stack>
        <IconButton size="small" sx={{ color: '#64748b' }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Progress bar */}
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 3,
          bgcolor: '#e2e8f0',
          '& .MuiLinearProgress-bar': { bgcolor: '#153d75' },
        }}
      />

      <Collapse in={expanded}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: '#111827' }} />
          </Box>
        ) : (
          <Stack divider={<Box sx={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'}` }} />}>
            {STEPS.map((step) => {
              const done = isComplete(step.key as string);
              return (
                <Box
                  key={step.key}
                  sx={{
                    px: 3, py: 2, display: 'flex', alignItems: 'flex-start',
                    gap: 2, opacity: done ? 0.65 : 1,
                    transition: 'opacity .2s',
                  }}
                >
                  {done ? (
                    <CheckCircleIcon sx={{ color: '#111827', mt: .3, flexShrink: 0 }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', mt: .3, flexShrink: 0 }} />
                  )}

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      fontWeight={600}
                      sx={{
                        color: done ? '#9CA3AF' : isDark ? '#ffffff' : '#111827',
                        textDecoration: done ? 'line-through' : 'none',
                        fontSize: '.92rem',
                      }}
                    >
                      {step.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? '#ffffff' : '#6B7280', mt: .3, lineHeight: 1.5 }}>
                      {step.description}
                    </Typography>
                  </Box>

                  {!done && (
                    <Tooltip title={step.description}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={marking === step.key}
                        onClick={() => {
                          if (step.actionPath) {
                            navigate(step.actionPath);
                          } else {
                            handleMark(step.key as string);
                          }
                        }}
                        sx={{
                          borderColor: 'rgba(21,61,117,.35)', color: '#111827',
                          fontWeight: 600, fontSize: '.78rem', borderRadius: '6px',
                          whiteSpace: 'nowrap', flexShrink: 0,
                          '&:hover': { borderColor: '#111827', bgcolor: 'rgba(21,61,117,.06)' },
                        }}
                      >
                        {marking === step.key
                          ? <CircularProgress size={14} sx={{ color: '#111827' }} />
                          : step.actionLabel}
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Collapse>
    </Paper>
  );
};

export default OnboardingChecklist;
