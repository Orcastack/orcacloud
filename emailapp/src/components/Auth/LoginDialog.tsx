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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { LoginRequest } from '../../types/auth';
import SocialLoginButtons from './SocialLoginButtons';
import { useNavigate } from 'react-router-dom';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose, onSwitchToSignup }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(formData);
      onClose();
      // Reset form
      setFormData({ email: '', password: '' });
      // Redirect to the main cloud dashboard
      navigate('/cloud');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '' });
    setError(null);
    setShowPassword(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxWidth: 380, width: '100%' }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h6" component="h2" fontWeight="bold">
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '.83rem' }}>
          Sign in to your OrcaCloud account
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            name="email"
            label="Email Address"
            type="email"
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            disabled={loading}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            size="small"
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={formData.password}
            onChange={handleInputChange}
            disabled={loading}
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              sx={{ textDecoration: 'none' }}
              onClick={() => console.log('Forgot password clicked')}
            >
              Forgot Password?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mb: 1.5, py: 0.95 }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Divider sx={{ my: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              or continue with
            </Typography>
          </Divider>

          <SocialLoginButtons loading={loading} />

          <Box sx={{ textAlign: 'center', mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component="button"
                type="button"
                variant="body2"
                sx={{ textDecoration: 'none', fontWeight: 'bold' }}
                onClick={() => {
                  onClose();
                  onSwitchToSignup ? onSwitchToSignup() : navigate('/signup');
                }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
