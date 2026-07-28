// OrcaCloud – Create Container Repository Modal

import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, Stack,
  Chip, CircularProgress, Alert, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockIcon        from '@mui/icons-material/Lock';
import PublicIcon      from '@mui/icons-material/Public';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { registryApi }                from '../../services/cloudApi';
import { ContainerRepository, RepoVisibility, RegistryRegion, CreateRepositoryPayload } from '../../types/registry';

const REGIONS: { key: RegistryRegion; label: string; flag: string }[] = [
  { key: 'af-south-1', label: 'Africa — Johannesburg',  flag: '🇿🇦' },
  { key: 'eu-west-1',  label: 'Europe — Frankfurt',     flag: '🇩🇪' },
  { key: 'ap-south-1', label: 'Asia — Singapore',       flag: '🇸🇬' },
  { key: 'us-east-1',  label: 'US East — New York',     flag: '🇺🇸' },
  { key: 'us-west-1',  label: 'US West — Los Angeles',  flag: '🇺🇸' },
];

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSuccess: (repo: ContainerRepository) => void;
}

const CreateRepositoryModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const border = isDark ? 'rgba(255,255,255,.09)' : '#E5E7EB';

  const [name,        setName]        = useState('');
  const [description, setDesc]        = useState('');
  const [visibility,  setVisibility]  = useState<RepoVisibility>('private');
  const [region,      setRegion]      = useState<RegistryRegion>('us-east-1');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const nameError = name.length > 0 && !/^[a-z0-9][a-z0-9-]{1,126}$/.test(name);
  const canSubmit = name.length >= 2 && !nameError && !loading;

  const handleClose = () => {
    if (loading) return;
    setName(''); setDesc(''); setVisibility('private');
    setRegion('us-east-1'); setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const payload: CreateRepositoryPayload = { name, description, visibility, region };
      const res = await registryApi.create(payload);
      onSuccess(res.data);
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.name?.[0] ?? e?.response?.data?.detail ?? 'Failed to create repository.');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      bgcolor:  isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB',
      '& fieldset': { borderColor: border },
      '&:hover fieldset': { borderColor: '#153d75' },
      '&.Mui-focused fieldset': { borderColor: '#153d75' },
    },
    '& .MuiInputLabel-root': { color: isDark ? 'rgba(255,255,255,.5)' : '#6B7280', '&.Mui-focused': { color: '#153d75' } },
    '& .MuiInputBase-input': { color: isDark ? '#ffffff' : '#111827' },
    '& .MuiFormHelperText-root': { color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF' },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: isDark ? '#0D1826' : '#ffffff', borderRadius: '14px', border: `1px solid ${border}` } }}>

      <DialogTitle sx={{ pt: 2.5, pb: 0, px: 3 }}>
        <Typography fontWeight={800} fontSize="1.05rem" color={isDark ? '#ffffff' : '#111827'}>
          Create Repository
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF' }}>
          A namespace for storing and distributing container images.
        </Typography>
      </DialogTitle>
      <Divider sx={{ mt: 2, borderColor: border }} />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* Name */}
          <TextField
            label="Repository name" value={name} onChange={e => setName(e.target.value.toLowerCase())}
            fullWidth size="small" required
            error={nameError}
            helperText={
              nameError
                ? 'Lowercase letters, numbers and hyphens only. Min 2 chars.'
                : `Your image will be pushed to: registry.orcacloud.com/<user>/${name || '<name>'}`
            }
            sx={fieldSx}
          />

          {/* Description */}
          <TextField
            label="Description (optional)" value={description} onChange={e => setDesc(e.target.value)}
            fullWidth size="small" multiline rows={2}
            inputProps={{ maxLength: 500 }}
            sx={fieldSx}
          />

          {/* Visibility */}
          <Box>
            <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, display: 'block' }}>
              Visibility
            </Typography>
            <Box display="flex" gap={1.5}>
              {([['private', 'Private', 'Only you can access', LockIcon], ['public', 'Public', 'Anyone can pull', PublicIcon]] as const).map(([val, label, desc, Icon]) => (
                <Box key={val} onClick={() => setVisibility(val as RepoVisibility)}
                  sx={{ flex: 1, p: 1.75, borderRadius: '10px', cursor: 'pointer',
                    border: `2px solid ${visibility === val ? (val === 'private' ? '#111827' : '#10B981') : border}`,
                    bgcolor: visibility === val ? (val === 'private' ? 'rgba(21,61,117,.1)' : 'rgba(16,185,129,.07)') : (isDark ? 'rgba(255,255,255,.03)' : '#F9FAFB'),
                    transition: 'all .14s', position: 'relative',
                  }}>
                  {visibility === val && <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: '.9rem', color: val === 'private' ? '#111827' : '#10B981' }} />}
                  <Icon sx={{ fontSize: '1.3rem', color: val === 'private' ? '#111827' : '#10B981', mb: .5 }} />
                  <Typography fontWeight={700} fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'}>{label}</Typography>
                  <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>{desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Region */}
          <Box>
            <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', mb: 1, display: 'block' }}>
              Region
            </Typography>
            <Stack spacing={.75}>
              {REGIONS.map(r => (
                <Box key={r.key} onClick={() => setRegion(r.key)}
                  display="flex" alignItems="center" justifyContent="space-between"
                  sx={{ px: 1.5, py: 1, borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${region === r.key ? '#111827' : border}`,
                    bgcolor: region === r.key ? 'rgba(21,61,117,.08)' : (isDark ? 'transparent' : 'transparent'),
                    transition: 'all .12s', '&:hover': { borderColor: '#111827' },
                  }}>
                  <Typography fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'}>
                    {r.flag}&nbsp;&nbsp;{r.label}
                  </Typography>
                  {region === r.key && <CheckCircleIcon sx={{ fontSize: '.9rem', color: '#111827' }} />}
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Preview */}
          <Box sx={{ p: 1.75, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${border}` }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#6B7280', textTransform: 'uppercase', letterSpacing: '.07em', mb: .75, display: 'block' }}>
              Registry address
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: isDark ? '#10B981' : '#059669', wordBreak: 'break-all' }}>
              registry.orcacloud.com/{'<user>'}
              <strong>/{name || '<name>'}</strong>
            </Typography>
            <Box display="flex" gap={1} mt={.75} flexWrap="wrap">
              <Chip size="small" label={visibility} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: visibility === 'private' ? 'rgba(21,61,117,.12)' : 'rgba(16,185,129,.1)', color: visibility === 'private' ? '#111827' : '#10B981' }} />
              <Chip size="small" label={REGIONS.find(r => r.key === region)?.label ?? region} sx={{ height: 16, fontSize: '.62rem', fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,.1)' : '#F3F4F6', color: isDark ? '#ffffff' : '#374151' }} />
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <Divider sx={{ borderColor: border }} />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}
          sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280' }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSubmit} onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: '#153d75', '&:hover': { bgcolor: '#0f2d5a' }, textTransform: 'none', borderRadius: '8px', fontWeight: 600, minWidth: 140 }}>
          {loading ? 'Creating…' : 'Create Repository'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateRepositoryModal;
