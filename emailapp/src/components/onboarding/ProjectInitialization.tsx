import React, { useState } from 'react';
import {
  Box,
  Button,
  CardContent,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Input } from '../design-system/Input';
import { Button as DSButton } from '../design-system/Button';
import { Card as DSCard } from '../design-system/Card';

const REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', latency: '~20ms', status: 'optimal' },
  { id: 'us-west-1', name: 'US West (Oregon)', latency: '~50ms', status: 'optimal' },
  { id: 'eu-west-1', name: 'EU West (Ireland)', latency: '~80ms', status: 'optimal' },
  { id: 'eu-central-1', name: 'EU Central (Frankfurt)', latency: '~100ms', status: 'optimal' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', latency: '~200ms', status: 'good' },
];

const PURPOSES = [
  { value: 'development', label: 'Development', description: 'For testing and development work' },
  { value: 'staging', label: 'Staging', description: 'For pre-production testing' },
  { value: 'production', label: 'Production', description: 'For live applications and services' },
  { value: 'personal', label: 'Personal', description: 'For personal projects and learning' },
];

interface ProjectInitializationProps {
  onComplete: (data: any) => void;
}

export const ProjectInitialization: React.FC<ProjectInitializationProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { state, actions } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectData = state.projectData || {
    id: '',
    name: '',
    region: '',
    purpose: '',
    description: '',
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateProjectData({
      ...projectData,
      [field]: event.target.value,
    });
  };

  const validateForm = (): boolean => {
    if (!projectData.name.trim()) {
      setError('Project name is required');
      return false;
    }
    if (!projectData.region) {
      setError('Please select a region');
      return false;
    }
    if (!projectData.purpose) {
      setError('Please select a project purpose');
      return false;
    }
    return true;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate API call to create project
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would create:
      // - Keystone project
      // - Default networks
      // - Default security groups
      // - Default quotas

      onComplete(projectData);
    } catch (err) {
      setError('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRegionStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'success';
      case 'good': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <DSCard variant="form" title="Create Your First Project">
        <CardContent>
          <Typography variant="body1" sx={{ mb: 4 }}>
            A project is your workspace for organizing cloud resources. It provides isolation,
            billing separation, and access control for your infrastructure.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Input
              label="Project Name"
              placeholder="my-awesome-project"
              helperText="Choose a unique name for your project"
              value={projectData.name}
              onChange={handleInputChange('name')}
              required
              fullWidth
            />

            <Box>
              <Typography variant="h6" gutterBottom>
                Select Region
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose the region closest to your users for optimal performance
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                {REGIONS.map(region => (
                  <DSCard
                    key={region.id}
                    variant="dashboard"
                    sx={{
                      cursor: 'pointer',
                      border: projectData.region === region.id ? '2px solid' : '1px solid',
                      borderColor: projectData.region === region.id ? 'primary.main' : 'divider',
                      bgcolor: projectData.region === region.id ? 'action.selected' : 'background.paper',
                    }}
                    onClick={() => actions.updateProjectData({
                      ...projectData, region: region.id
                    })}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {region.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={region.status}
                          color={getRegionStatusColor(region.status)}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Latency: {region.latency}
                      </Typography>
                    </CardContent>
                  </DSCard>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                Project Purpose
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This helps us optimize your experience and apply appropriate defaults
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                {PURPOSES.map(purpose => (
                  <DSCard
                    key={purpose.value}
                    variant="dashboard"
                    sx={{
                      cursor: 'pointer',
                      border: projectData.purpose === purpose.value ? '2px solid' : '1px solid',
                      borderColor: projectData.purpose === purpose.value ? 'primary.main' : 'divider',
                      bgcolor: projectData.purpose === purpose.value ? 'action.selected' : 'background.paper',
                    }}
                    onClick={() => actions.updateProjectData({
                      ...projectData, purpose: purpose.value
                    })}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {purpose.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {purpose.description}
                      </Typography>
                    </CardContent>
                  </DSCard>
                ))}
              </Box>
            </Box>

            <Input
              label="Description (Optional)"
              placeholder="Brief description of what this project is for"
              multiline
              rows={3}
              value={projectData.description}
              onChange={handleInputChange('description')}
              fullWidth
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                What happens when you create this project?
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>OpenStack Keystone project will be created</li>
                  <li>Default networks and security groups will be configured</li>
                  <li>Resource quotas will be applied based on your account</li>
                  <li>You'll be taken to the onboarding checklist</li>
                </ul>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Back
              </Button>

              <DSButton
                variant="primary"
                onClick={handleCreateProject}
                disabled={loading}
                size="large"
              >
                {loading ? 'Creating Project...' : 'Create Project'}
              </DSButton>
            </Box>
          </Box>
        </CardContent>
      </DSCard>
    </Box>
  );
};

export default ProjectInitialization;
