// OrcaCloud – Create Bucket wizard modal (3 steps)
import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stepper, Step, StepLabel,
  TextField, Box, Typography, Stack,
  FormControlLabel, Switch, ToggleButtonGroup, ToggleButton,
  Alert, CircularProgress, Divider,
} from '@mui/material';
import StorageIcon       from '@mui/icons-material/Storage';
import LockIcon          from '@mui/icons-material/Lock';
import PublicIcon        from '@mui/icons-material/Public';
import ShieldIcon        from '@mui/icons-material/Shield';
import HistoryIcon       from '@mui/icons-material/History';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';

import type { CreateBucketPayload, BucketACL, EncryptionType } from '../../types/storage';
import { storageApi } from '../../services/cloudApi';

// ── constants ───────────────────────────────────────────────────────────────

const REGIONS = [
  { id: 'us-east-1',  label: 'US East — New York',       flag: '🇺🇸' },
  { id: 'us-west-1',  label: 'US West — Los Angeles',    flag: '🇺🇸' },
  { id: 'eu-west-1',  label: 'Europe — Frankfurt',       flag: '🇩🇪' },
  { id: 'ap-south-1', label: 'Asia Pacific — Singapore', flag: '🇸🇬' },
  { id: 'af-south-1', label: 'Africa — Johannesburg',    flag: '🇿🇦' },
];

const STEPS = ['Name & Region', 'Access & Encryption', 'Review'];

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateBucketModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── colour tokens ────────────────────────────────────────────────────────
  const t = {
    dialogBg: isDark ? '#0D1826' : '#FFFFFF',
    border:   isDark ? '#1E3A5F' : '#E5E7EB',
    cardBg:   isDark ? '#132336' : '#F9FAFB',
    text:     isDark ? '#e0e9f4' : '#111827',
    muted:    isDark ? '#93a8c0' : '#6B7280',
    inputBg:  isDark ? '#132336' : '#FFFFFF',
    brand:    '#111827',
    hover:    '#0f2d5a',
  };

  const sx = {
    dialog:    { '& .MuiDialog-paper': { bgcolor: t.dialogBg, border: `1px solid ${t.border}`, minWidth: 560 } },
    card:      (sel: boolean) => ({
      p: 2, borderRadius: 2, cursor: 'pointer', border: '1px solid',
      borderColor: sel ? t.brand : t.border,
      bgcolor:     sel ? t.hover : t.cardBg,
      transition: 'all .2s',
      '&:hover': { borderColor: t.brand, bgcolor: t.hover },
    }),
    regionBtn: {
      flex: '1 1 auto',
      border: `1px solid ${t.border} !important`,
      color: t.muted,
      '&.Mui-selected': { bgcolor: `${t.brand} !important`, color: '#fff', borderColor: `${t.brand} !important` },
      '&:hover': { bgcolor: `${t.hover} !important` },
      borderRadius: '8px !important',
      px: 1.5, py: 1,
      fontSize: 12,
    },
    nextBtn: { bgcolor: t.brand, '&:hover': { bgcolor: t.hover }, px: 3 },
    label:   { fontSize: 12, color: t.muted, mb: 0.5 },
  };
  const [step,      setStep]      = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [form, setForm] = useState<CreateBucketPayload>({
    bucket_name:        '',
    region:             'us-east-1',
    acl:                'private',
    versioning_enabled: false,
    encryption_enabled: true,
    encryption_type:    'sse-s3',
    storage_class:      'standard',
  });

  const set = (k: keyof CreateBucketPayload) => (v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const nameOk = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(form.bucket_name);

  const handleNext = () => {
    setError('');
    if (step === 0 && !nameOk) { setError('Bucket name must be 3-63 lowercase alphanum/hyphens.'); return; }
    if (step < 2) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await storageApi.create(form);
      onCreated();
      handleReset();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.response?.data?.bucket_name?.[0] || 'Failed to create bucket.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setError('');
    setForm({
      bucket_name: '', region: 'us-east-1', acl: 'private',
      versioning_enabled: false, encryption_enabled: true,
      encryption_type: 'sse-s3', storage_class: 'standard',
    });
    onClose();
  };

  // ── Step panels ───────────────────────────────────────────────────────────

  const Step1 = (
    <Stack spacing={3}>
      <Box>
        <Typography sx={sx.label}>BUCKET NAME</Typography>
        <TextField
          fullWidth size="small"
          placeholder="my-app-assets"
          value={form.bucket_name}
          onChange={e => set('bucket_name')(e.target.value.toLowerCase())}
          error={!!form.bucket_name && !nameOk}
          helperText={form.bucket_name && !nameOk ? '3-63 chars, lowercase letters/numbers/hyphens only' : ''}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.inputBg, borderColor: t.border } }}
            InputProps={{ sx: { color: t.text } }}
        />
      </Box>

      <Box>
        <Typography sx={sx.label}>REGION</Typography>
        <ToggleButtonGroup
          value={form.region}
          exclusive
          onChange={(_, v) => v && set('region')(v)}
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          {REGIONS.map(r => (
            <ToggleButton key={r.id} value={r.id} sx={sx.regionBtn}>
              {r.flag}&nbsp;{r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Stack>
  );

  const Step2 = (
    <Stack spacing={3}>
      {/* ACL */}
      <Box>
        <Typography sx={sx.label}>ACCESS CONTROL</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {([
            { id: 'private',     icon: <LockIcon />,   label: 'Private',     desc: 'Only you can access' },
            { id: 'public-read', icon: <PublicIcon />,  label: 'Public Read', desc: 'Anyone can read objects' },
          ] as { id: BucketACL; icon: React.ReactNode; label: string; desc: string }[]).map(a => (
            <Box key={a.id} sx={sx.card(form.acl === a.id)} onClick={() => set('acl')(a.id)}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: form.acl === a.id ? '#60a5fa' : t.muted }}>{a.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>{a.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: t.muted }}>{a.desc}</Typography>
                </Box>
                {form.acl === a.id && <CheckCircleIcon sx={{ ml: 'auto', color: '#60a5fa', fontSize: 18 }} />}
              </Stack>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Encryption */}
      <Box>
        <Typography sx={sx.label}>ENCRYPTION</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {([
            { id: 'sse-s3', label: 'SSE-S3',   desc: 'Managed by OrcaCloud' },
            { id: 'sse-kms', label: 'SSE-KMS',  desc: 'Your KMS key' },
          ] as { id: EncryptionType; label: string; desc: string }[]).map(e => (
            <Box key={e.id}
              sx={sx.card(form.encryption_enabled && form.encryption_type === e.id)}
              onClick={() => { set('encryption_enabled')(true); set('encryption_type')(e.id); }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <ShieldIcon sx={{ color: form.encryption_type === e.id && form.encryption_enabled ? '#34d399' : t.muted }} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>{e.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: t.muted }}>{e.desc}</Typography>
                </Box>
                {form.encryption_enabled && form.encryption_type === e.id &&
                  <CheckCircleIcon sx={{ ml: 'auto', color: '#34d399', fontSize: 18 }} />}
              </Stack>
            </Box>
          ))}
        </Box>
        <FormControlLabel
          control={
            <Switch checked={form.encryption_enabled}
              onChange={e => set('encryption_enabled')(e.target.checked)}
              size="small" sx={{ '& .MuiSwitch-thumb': { bgcolor: form.encryption_enabled ? '#60a5fa' : t.muted } }}
            />
          }
          label={<Typography sx={{ fontSize: 12, color: t.muted }}>Enable server-side encryption</Typography>}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Versioning */}
      <Box>
        <Typography sx={sx.label}>VERSIONING</Typography>
        <Box sx={{ ...sx.card(form.versioning_enabled), p: 2 }} onClick={() => set('versioning_enabled')(!form.versioning_enabled)}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <HistoryIcon sx={{ color: form.versioning_enabled ? '#a78bfa' : '#6b8aab' }} />
            <Box flex={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#e0e9f4' }}>Object Versioning</Typography>
              <Typography sx={{ fontSize: 11, color: '#6b8aab' }}>Keep multiple versions of each object</Typography>
            </Box>
            <Switch checked={form.versioning_enabled} size="small"
              onChange={e => { e.stopPropagation(); set('versioning_enabled')(e.target.checked); }} />
          </Stack>
        </Box>
      </Box>
    </Stack>
  );

  const selectedRegion = REGIONS.find(r => r.id === form.region);
  const Step3 = (
    <Stack spacing={2}>
      <Typography sx={{ fontSize: 13, color: t.muted }}>Review your bucket configuration before creating.</Typography>
      {[
        { label: 'Bucket Name', value: form.bucket_name },
        { label: 'Region',      value: `${selectedRegion?.flag} ${selectedRegion?.label}` },
        { label: 'Access',      value: form.acl },
        { label: 'Encryption',  value: form.encryption_enabled ? form.encryption_type.toUpperCase() : 'Disabled' },
        { label: 'Versioning',  value: form.versioning_enabled ? 'Enabled' : 'Disabled' },
      ].map(row => (
        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: `1px solid ${t.border}` }}>
          <Typography sx={{ fontSize: 12, color: t.muted }}>{row.label}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>{row.value}</Typography>
        </Box>
      ))}
      <Alert severity="info" sx={{ bgcolor: isDark ? '#0D2137' : '#EFF6FF', color: isDark ? '#93c4f0' : '#111827', border: `1px solid ${t.border}`, fontSize: 12 }}>
        Bucket creation will also provision the corresponding Swift container in OpenStack.
      </Alert>
    </Stack>
  );

  const PANELS = [Step1, Step2, Step3];

  return (
    <Dialog open={open} onClose={handleReset} sx={sx.dialog} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: t.text, fontWeight: 700, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorageIcon sx={{ color: '#60a5fa' }} />
        Create Bucket
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 3,
          '& .MuiStepLabel-label': { color: t.muted, fontSize: 12 },
          '& .MuiStepLabel-label.Mui-active': { color: t.text },
          '& .MuiStepConnector-line': { borderColor: t.border },
        }}>
          {STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {PANELS[step]}

        {error && (
          <Alert severity="error" sx={{ mt: 2, bgcolor: isDark ? '#2d1515' : '#FEF2F2', color: '#f87171', border: `1px solid ${isDark ? '#5b2020' : '#FECACA'}` }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: t.border }} />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleReset} sx={{ color: t.muted }}>Cancel</Button>
        {step > 0 && (
          <Button onClick={() => setStep(s => s - 1)} sx={{ color: t.muted }}>Back</Button>
        )}
        {step < 2 ? (
          <Button variant="contained" sx={sx.nextBtn} onClick={handleNext}>Next</Button>
        ) : (
          <Button variant="contained" sx={sx.nextBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create Bucket'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateBucketModal;
