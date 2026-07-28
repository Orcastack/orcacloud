import React, { useState } from 'react';
import {
  Box,
  CardContent,
  Typography,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Code as DevIcon,
  CheckCircle as CheckIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import { Card as DSCard } from '../design-system/Card';
import { Button as DSButton } from '../design-system/Button';

interface Plan {
  id: 'cloud' | 'developer' | 'enterprise';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'cloud',
    title: 'Cloud Platform',
    subtitle: 'Full infrastructure & developer tools',
    icon: <CloudIcon sx={{ fontSize: 48 }} />,
    color: '#2563eb',
    features: [
      'Virtual machines & compute',
      'Storage, databases & networking',
      'Kubernetes & container registry',
      'CI/CD pipelines & developer tools',
      'Monitoring, billing & governance',
      'Team & organization management',
    ],
    cta: 'Start with Cloud',
  },
  {
    id: 'developer',
    title: 'Developer Tools',
    subtitle: 'Code, collaborate and ship — no cloud infra needed',
    icon: <DevIcon sx={{ fontSize: 48 }} />,
    color: '#7c3aed',
    features: [
      'Git repositories & code review',
      'CI/CD pipelines & deployments',
      'Container registry access',
      'Team & group management',
      'Workspaces & environments',
      'API management & webhooks',
    ],
    cta: 'Start with Developer Tools',
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    subtitle: 'Business command center for your organization',
    icon: <GroupsIcon sx={{ fontSize: 48 }} />,
    color: '#153d75',
    features: [
      'Organization & team management',
      'Marketing campaigns & audiences',
      'Email service & sending domains',
      'Custom domains & branding',
      'Billing & subscription management',
      'Compliance & audit logs',
    ],
    cta: 'Start with Enterprise',
  },
];

interface PlanSelectionStepProps {
  onComplete: (plan: 'cloud' | 'developer' | 'enterprise') => void;
}

const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({ onComplete }) => {
  const [selected, setSelected] = useState<'cloud' | 'developer' | 'enterprise' | null>(null);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          How would you like to use OrcaCloud?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose your path. You can always unlock more features later.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', mb: 5 }}>
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <Box
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              sx={{ flex: '1 1 360px', maxWidth: 420, cursor: 'pointer' }}
            >
              <DSCard
                variant="dashboard"
                sx={{
                  height: '100%',
                  border: '2px solid',
                  borderColor: isSelected ? plan.color : 'divider',
                  bgcolor: isSelected ? `${plan.color}0d` : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: plan.color,
                    bgcolor: `${plan.color}08`,
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ color: plan.color }}>{plan.icon}</Box>
                    {isSelected && (
                      <CheckIcon sx={{ color: plan.color, fontSize: 28 }} />
                    )}
                  </Box>

                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {plan.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {plan.subtitle}
                  </Typography>

                  {/* Feature list */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {plan.features.map((f) => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ fontSize: 16, color: plan.color, flexShrink: 0 }} />
                        <Typography variant="body2">{f}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </DSCard>
            </Box>
          );
        })}
      </Box>

      {/* CTA */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <DSButton
          variant="primary"
          size="large"
          disabled={!selected}
          onClick={() => selected && onComplete(selected)}
        >
          {selected
            ? PLANS.find((p) => p.id === selected)!.cta
            : 'Select a plan to continue'}
        </DSButton>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 2 }}>
        Developer Tools has no infrastructure costs. Enterprise includes the business command center. Switch plans any time.
      </Typography>
    </Box>
  );
};

export default PlanSelectionStep;
