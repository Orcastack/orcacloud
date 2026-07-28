import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Button as DSButton } from '../design-system/Button';
import { Card as DSCard } from '../design-system/Card';

interface Flavor {
  id: string;
  name: string;
  vcpus: number;
  ram: number;
  disk: number;
  price: number;
}

interface Image {
  id: string;
  name: string;
  type: string;
  size: string;
}

const steps = [
  'Choose Region',
  'Select Flavor',
  'Pick Image',
  'Configure Network',
  'Security Settings',
  'Review & Launch',
];

const regions = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', flag: '🇺🇸' },
  { id: 'us-west-1', name: 'US West (Oregon)', flag: '🇺🇸' },
  { id: 'eu-west-1', name: 'EU West (Ireland)', flag: '🇪🇺' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬' },
];

const flavors: Flavor[] = [
  { id: 't2.micro', name: 't2.micro', vcpus: 1, ram: 1, disk: 8, price: 0.0116 },
  { id: 't2.small', name: 't2.small', vcpus: 1, ram: 2, disk: 8, price: 0.023 },
  { id: 't2.medium', name: 't2.medium', vcpus: 2, ram: 4, disk: 8, price: 0.0464 },
  { id: 't3.large', name: 't3.large', vcpus: 2, ram: 8, disk: 16, price: 0.0832 },
  { id: 't3.xlarge', name: 't3.xlarge', vcpus: 4, ram: 16, disk: 32, price: 0.1664 },
];

const images: Image[] = [
  { id: 'ubuntu-20.04', name: 'Ubuntu 20.04 LTS', type: 'Linux', size: '2.2 GB' },
  { id: 'ubuntu-22.04', name: 'Ubuntu 22.04 LTS', type: 'Linux', size: '2.4 GB' },
  { id: 'centos-8', name: 'CentOS 8', type: 'Linux', size: '1.8 GB' },
  { id: 'windows-2019', name: 'Windows Server 2019', type: 'Windows', size: '12 GB' },
  { id: 'debian-11', name: 'Debian 11', type: 'Linux', size: '1.5 GB' },
];

interface FirstDeploymentWizardProps {
  onComplete: (data?: any) => void;
}

export const FirstDeploymentWizard: React.FC<FirstDeploymentWizardProps> = ({ onComplete }) => {
  const _navigate = useNavigate();
  const { state, actions } = useOnboarding();
  const [activeStep, setActiveStep] = useState(0);
  const config = state.deploymentData || {
    instanceName: '',
    region: '',
    flavor: '',
    image: '',
    network: 'default',
    securityGroups: [],
    keyPair: '',
  };
  const [isDeploying, setIsDeploying] = useState(false);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleDeploy();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsDeploying(false);
    onComplete();
  };

  const updateConfig = (field: keyof typeof config, value: any) => {
    actions.updateDeploymentData({
      ...config,
      [field]: value,
    });
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return !!config.region;
      case 1: return !!config.flavor;
      case 2: return !!config.image;
      case 3: return true; // Network step - can proceed
      case 4: return config.securityGroups.length > 0 && !!config.keyPair;
      case 5: return !!config.instanceName;
      default: return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Choose Region
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose a Region
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the geographic region where your instance will be deployed.
              Choose a region close to your users for better performance.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {regions.map((region) => (
                <Box key={region.id} sx={{ flex: '1 1 300px', maxWidth: '100%' }}>
                  <DSCard
                    variant="dashboard"
                    onClick={() => updateConfig('region', region.id)}
                    sx={{ cursor: 'pointer', p: 2, border: config.region === region.id ? '2px solid' : '1px solid', borderColor: config.region === region.id ? 'primary.main' : 'divider' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h4">{region.flag}</Typography>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {region.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {region.id}
                        </Typography>
                      </Box>
                    </Box>
                  </DSCard>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 1: // Select Flavor
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Instance Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose the compute resources for your instance. Start small and scale up as needed.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {flavors.map((flavor) => (
                <Box key={flavor.id} sx={{ flex: '1 1 300px', maxWidth: '100%' }}>
                  <DSCard
                    variant="dashboard"
                    onClick={() => updateConfig('flavor', flavor.id)}
                    sx={{ cursor: 'pointer', p: 2, border: config.flavor === flavor.id ? '2px solid' : '1px solid', borderColor: config.flavor === flavor.id ? 'primary.main' : 'divider' }}
                  >
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      {flavor.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <MemoryIcon fontSize="small" />
                      <Typography variant="body2">
                        {flavor.vcpus} vCPU • {flavor.ram} GB RAM
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <StorageIcon fontSize="small" />
                      <Typography variant="body2">
                        {flavor.disk} GB SSD
                      </Typography>
                    </Box>
                    <Chip
                      label={`$${flavor.price.toFixed(4)}/hr`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </DSCard>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 2: // Pick Image
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Operating System
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the operating system and software stack for your instance.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {images.map((image) => (
                <Box key={image.id} sx={{ flex: '1 1 300px', maxWidth: '100%' }}>
                  <DSCard
                    variant="dashboard"
                    onClick={() => updateConfig('image', image.id)}
                    sx={{ cursor: 'pointer', p: 2, border: config.image === image.id ? '2px solid' : '1px solid', borderColor: config.image === image.id ? 'primary.main' : 'divider' }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                          {image.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {image.type} • {image.size}
                        </Typography>
                      </Box>
                      <CloudIcon color="primary" />
                    </Box>
                  </DSCard>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 3: // Configure Network
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Network Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure networking for your instance. We'll use a default network for simplicity.
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              For your first instance, we'll use the default network. You can create custom networks later.
            </Alert>
            <FormControl component="fieldset">
              <FormLabel component="legend">Network</FormLabel>
              <RadioGroup
                value={config.network}
                onChange={(e) => updateConfig('network', e.target.value)}
              >
                <FormControlLabel
                  value="default"
                  control={<Radio />}
                  label="Default Network (Recommended for beginners)"
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label="Custom Network (Advanced)"
                  disabled
                />
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 4: // Security Settings
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure security groups and SSH access for your instance.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Security Group</InputLabel>
                  <Select
                    value={config.securityGroups[0] || ''}
                    onChange={(e) => updateConfig('securityGroups', [e.target.value])}
                    label="Security Group"
                  >
                    <MenuItem value="default">Default (SSH, HTTP, HTTPS)</MenuItem>
                    <MenuItem value="web">Web Server (HTTP, HTTPS)</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormControl fullWidth>
                  <InputLabel>SSH Key</InputLabel>
                  <Select
                    value={config.keyPair}
                    onChange={(e) => updateConfig('keyPair', e.target.value)}
                    label="SSH Key"
                  >
                    <MenuItem value="my-key">my-ssh-key</MenuItem>
                    <MenuItem value="work-key">work-laptop-key</MenuItem>
                    <MenuItem value="create-new">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>+ Create New SSH Key</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>
        );

      case 5: // Review & Launch
        const selectedFlavor = flavors.find(f => f.id === config.flavor);
        const selectedImage = images.find(i => i.id === config.image);
        const selectedRegion = regions.find(r => r.id === config.region);

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Launch
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review your configuration and launch your first instance.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <TextField
                  fullWidth
                  label="Instance Name"
                  value={config.instanceName}
                  onChange={(e) => updateConfig('instanceName', e.target.value)}
                  placeholder="my-first-instance"
                  helperText="Choose a descriptive name for your instance"
                />
              </Box>

              <Box>
                <DSCard variant="dashboard">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Configuration Summary
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flex: '1 1 300px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight="medium">Region:</Typography>
                          <Typography variant="body2">
                            {selectedRegion?.flag} {selectedRegion?.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight="medium">Instance Type:</Typography>
                          <Typography variant="body2">{selectedFlavor?.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">OS:</Typography>
                          <Typography variant="body2">{selectedImage?.name}</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ flex: '1 1 300px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <MemoryIcon fontSize="small" />
                          <Typography variant="body2">
                            {selectedFlavor?.vcpus} vCPU • {selectedFlavor?.ram} GB RAM
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <StorageIcon fontSize="small" />
                          <Typography variant="body2">
                            {selectedFlavor?.disk} GB SSD
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NetworkIcon fontSize="small" />
                          <Typography variant="body2">Default Network</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="medium">
                        Estimated Cost:
                      </Typography>
                      <Typography variant="h6" color="primary">
                        ${selectedFlavor?.price.toFixed(4)}/hour
                      </Typography>
                    </Box>
                  </CardContent>
                </DSCard>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <DSCard variant="form" title="Create Your First Instance">
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 2, mb: 4 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>

            <DSButton
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed() || isDeploying}
            >
              {activeStep === steps.length - 1
                ? (isDeploying ? 'Launching...' : 'Launch Instance')
                : 'Next'
              }
            </DSButton>
          </Box>

          {isDeploying && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                🚀 Launching your instance... This may take a few minutes.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </DSCard>
    </Box>
  );
};

export default FirstDeploymentWizard;
