import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, CircularProgress,
  FormControlLabel, Switch, InputAdornment, IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoFixHighIcon   from '@mui/icons-material/AutoFixHigh';
import { emailApi }      from '../../services/cloudApi';
import type { CreateMailboxPayload } from '../../types/email';

interface Props {
  open:              boolean;
  onClose:           () => void;
  onCreated:         () => void;
  domainResourceId:  string;
  domainName:        string;
}

const CreateMailboxModal: React.FC<Props> = ({
  open, onClose, onCreated, domainResourceId, domainName,
}) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const t = {
    bg:     isDark ? '#0D1826' : '#FFFFFF',
    border: isDark ? '#1E3A5F' : '#E5E7EB',
    text:   isDark ? '#e0e9f4' : '#111827',
    muted:  isDark ? '#6b8aab' : '#6B7280',
    brand:  '#111827',
  };

  const [localPart,  setLocalPart]  = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [quotaMb,    setQuotaMb]    = useState(5120);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const fieldSx = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
    '& .MuiInputBase-input': { color: t.text },
    '& .MuiInputLabel-root': { color: t.muted },
  };

  const handleGenPassword = async () => {
    try {
      const r = await emailApi.generatePassword(16);
      setPassword((r.data as any).password ?? '');
      setShowPass(true);
    } catch {}
  };

  const handleCreate = async () => {
    if (!localPart || !password) return;
    setSubmitting(true);
    setError('');
    const payload: CreateMailboxPayload = {
      domain_resource_id: domainResourceId,
      local_part:  localPart.toLowerCase().trim(),
      password,
      first_name:  firstName,
      last_name:   lastName,
      quota_mb:    quotaMb,
      is_admin:    isAdmin,
    };
    try {
      await emailApi.createMailbox(payload);
      onCreated();
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to create mailbox.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setLocalPart(''); setPassword(''); setFirstName('');
    setLastName(''); setQuotaMb(5120); setIsAdmin(false); setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: t.bg, border: `1px solid ${t.border}`, borderRadius: 2 } }}
    >
      <DialogTitle>
        <Typography variant="h6" sx={{ color: t.text, fontWeight: 700 }}>
          Create Mailbox
        </Typography>
        <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>
          New mailbox on <strong style={{ color: t.text }}>@{domainName}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: t.border }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          {/* Email address */}
          <TextField
            label="Username"
            placeholder="e.g. john"
            value={localPart}
            onChange={e => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            sx={fieldSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography sx={{ color: t.muted, fontSize: '0.85rem' }}>@{domainName}</Typography>
                </InputAdornment>
              ),
            }}
            fullWidth
          />

          {/* Password */}
          <TextField
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            sx={fieldSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Generate strong password">
                    <IconButton size="small" onClick={handleGenPassword}>
                      <AutoFixHighIcon sx={{ fontSize: 18, color: t.muted }} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setShowPass(s => !s)}>
                    {showPass
                      ? <VisibilityOffIcon sx={{ fontSize: 18, color: t.muted }} />
                      : <VisibilityIcon   sx={{ fontSize: 18, color: t.muted }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            fullWidth
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <TextField label="First Name" value={firstName}
              onChange={e => setFirstName(e.target.value)} sx={fieldSx} />
            <TextField label="Last Name"  value={lastName}
              onChange={e => setLastName(e.target.value)} sx={fieldSx} />
          </Box>

          <TextField
            label="Quota (MB)"
            type="number"
            value={quotaMb}
            onChange={e => setQuotaMb(Math.max(100, parseInt(e.target.value) || 5120))}
            sx={fieldSx}
            helperText={`${(quotaMb / 1024).toFixed(1)} GB`}
            FormHelperTextProps={{ sx: { color: t.muted } }}
            fullWidth
          />

          <FormControlLabel
            control={<Switch checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />}
            label={<Typography sx={{ color: t.text, fontSize: '0.9rem' }}>Domain Admin</Typography>}
          />

          {error && <Typography sx={{ color: '#EF4444', fontSize: '0.85rem' }}>{error}</Typography>}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${t.border}`, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: t.muted }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={submitting || !localPart || !password}
          sx={{ bgcolor: t.brand, '&:hover': { bgcolor: '#0f2d5a' } }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'Create Mailbox'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateMailboxModal;
