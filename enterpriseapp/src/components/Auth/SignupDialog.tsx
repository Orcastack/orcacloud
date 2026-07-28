import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Link,
  Stack,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';

interface SignupDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

const SignupDialog: React.FC<SignupDialogProps> = ({ open, onClose, onSwitchToLogin }) => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    username: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.first_name) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signup({
        username: formData.username || formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ first_name: '', last_name: '', email: '', password: '', confirm_password: '', username: '' });
        navigate('/onboarding');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ first_name: '', last_name: '', email: '', password: '', confirm_password: '', username: '' });
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxWidth: 420, width: '100%' } }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h6" component="h2" fontWeight="bold">
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '.83rem' }}>
          Join OrcaCloud and start building your infrastructure
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Account created! Signing you in...</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} sx={{ mb: 1.25 }}>
            <TextField
              fullWidth
              size="small"
              name="first_name"
              label="First Name *"
              value={formData.first_name}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              size="small"
              name="last_name"
              label="Last Name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={loading}
            />
          </Stack>

          <TextField
            fullWidth
            size="small"
            name="email"
            label="Email Address *"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            size="small"
            name="password"
            label="Password *"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            sx={{ mb: 1.5 }}
            helperText="Minimum 8 characters"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            size="small"
            name="confirm_password"
            label="Confirm Password *"
            type={showConfirm ? 'text' : 'password'}
            value={formData.confirm_password}
            onChange={handleChange}
            disabled={loading}
            sx={{ mb: 2 }}
            error={!!formData.confirm_password && formData.password !== formData.confirm_password}
            helperText={
              formData.confirm_password && formData.password !== formData.confirm_password
                ? 'Passwords do not match'
                : ''
            }
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || success}
            sx={{ mb: 1.5, py: 0.95 }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Divider sx={{ my: 1.5 }}>
            <Typography variant="body2" color="text.secondary">or sign up with</Typography>
          </Divider>

          <SocialLoginButtons loading={loading} />

          <Box sx={{ textAlign: 'center', mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button"
                type="button"
                variant="body2"
                sx={{ textDecoration: 'none', fontWeight: 'bold' }}
                onClick={() => { handleClose(); onSwitchToLogin?.(); }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SignupDialog;
