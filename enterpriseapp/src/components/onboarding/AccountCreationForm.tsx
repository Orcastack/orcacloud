import React, { useState } from 'react';
import {
  Box,
  Button,
  CardContent,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Input } from '../design-system/Input';
import { Button as DSButton } from '../design-system/Button';
import { Card as DSCard } from '../design-system/Card';

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Japan', 'Singapore', 'Netherlands', 'Switzerland'
];

const STEPS = ['Account Details', 'Verification', 'Welcome'];

interface AccountCreationFormProps {
  onComplete?: (data: any) => void;
  initialData?: any;
}

export const AccountCreationForm: React.FC<AccountCreationFormProps> = ({
  onComplete,
  initialData
}) => {
  const _navigate = useNavigate();
  const { state: _state, actions } = useOnboarding();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, _setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    password: '',
    confirmPassword: '',
    country: initialData?.country || '',
    phone: '',
    company: initialData?.company || '',
    acceptTerms: false,
    acceptMarketing: false,
  });

  const [verificationCode, setVerificationCode] = useState('');

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCheckboxChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (!formData.acceptTerms) {
          setError('Please accept the terms and conditions');
          return false;
        }
        return true;
      case 1:
        if (!verificationCode || verificationCode.length !== 6) {
          setError('Please enter a valid 6-digit verification code');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(activeStep)) return;

    actions.setLoading(true);
    actions.setError(null);

    try {
      if (activeStep === 0) {
        // Send verification code
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setActiveStep(1);
      } else if (activeStep === 1) {
        // Verify code and create account
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        setActiveStep(2);

        // Update onboarding context
        actions.updateAccountData({
          email: formData.email,
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
          company: formData.company,
          country: formData.country,
          accountType: 'business' // Default to business
        });

        // Auto-redirect after welcome
        setTimeout(() => {
          if (onComplete) {
            onComplete(formData);
          }
        }, 3000);
      }
    } catch (err) {
      actions.setError('An error occurred. Please try again.');
    } finally {
      actions.setLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Create Your OrcaCloud Account
            </Typography>

            <Input
              label="Email Address"
              type="email"
              placeholder="your.email@company.com"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Input
                label="First Name"
                placeholder="John"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                required
                fullWidth
              />

              <Input
                label="Last Name"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                required
                fullWidth
              />
            </Box>

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              fullWidth
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                label="Country"
              >
                {COUNTRIES.map(country => (
                  <MenuItem key={country} value={country}>{country}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              fullWidth
            />

            <Input
              label="Company Name (Optional)"
              placeholder="Your Company Ltd."
              value={formData.company}
              onChange={handleInputChange('company')}
              fullWidth
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.acceptTerms}
                    onChange={handleCheckboxChange('acceptTerms')}
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{' '}
                    <Link href="#" target="_blank">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="#" target="_blank">Privacy Policy</Link>
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.acceptMarketing}
                    onChange={handleCheckboxChange('acceptMarketing')}
                  />
                }
                label={
                  <Typography variant="body2">
                    I would like to receive marketing communications about OrcaCloud
                  </Typography>
                }
              />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Verify Your Email
            </Typography>

            <Typography variant="body2" color="text.secondary">
              We've sent a 6-digit verification code to <strong>{formData.email}</strong>
            </Typography>

            <Input
              label="Verification Code"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
            />

            <Typography variant="body2" color="text.secondary">
              Didn't receive the code?{' '}
              <Link href="#" onClick={() => console.log('Resend code')}>
                Resend
              </Link>
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" gutterBottom color="primary">
              Welcome to OrcaCloud! 🎉
            </Typography>

            <Typography variant="body1" sx={{ mb: 3 }}>
              Your account has been created successfully. You're now ready to start building
              with the most advanced OpenStack-based cloud platform.
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Redirecting you to create your first project...
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <DSCard variant="form" title="Get Started with OrcaCloud">
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderStepContent()}

          {activeStep < 2 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
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
                disabled={loading}
              >
                {loading ? 'Processing...' : activeStep === 0 ? 'Send Verification' : 'Verify & Create Account'}
              </DSButton>
            </Box>
          )}
        </CardContent>
      </DSCard>
    </Box>
  );
};

export default AccountCreationForm;
