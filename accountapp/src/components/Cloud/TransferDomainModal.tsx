import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box,
  CircularProgress, Stepper, Step, StepLabel, Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { domainApi } from '../../services/cloudApi';
import type { TransferDomainPayload } from '../../types/domain';

interface Props {
  open:      boolean;
  onClose:   () => void;
  onCreated: () => void;
}

const STEPS = ['Domain Info', 'Review'];

const TransferDomainModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const t = {
    bg:     isDark ? '#0D1826' : '#FFFFFF',
    card:   isDark ? '#132336' : '#F9FAFB',
    border: isDark ? '#1E3A5F' : '#E5E7EB',
    text:   isDark ? '#e0e9f4' : '#111827',
    muted:  isDark ? '#6b8aab' : '#6B7280',
    brand:  '#111827',
  };

  const [step,       setStep]       = useState(0);
  const [domainName, setDomainName] = useState('');
  const [eppCode,    setEppCode]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const handleTransfer = async () => {
    setSubmitting(true);
    setError('');
    const payload: TransferDomainPayload = {
      domain_name: domainName.trim().toLowerCase(),
      epp_code:    eppCode.trim(),
    };
    try {
      await domainApi.transfer(payload);
      onCreated();
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Transfer initiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setDomainName('');
    setEppCode('');
    setError('');
    onClose();
  };

  const canProceed = domainName.trim().includes('.') && eppCode.trim().length >= 4;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: t.bg, border: `1px solid ${t.border}`, borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="h6" sx={{ color: t.text, fontWeight: 700 }}>Transfer Domain</Typography>
        <Stepper activeStep={step} sx={{ mt: 2, mb: 1 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': { color: t.muted },
                  '& .MuiStepLabel-label.Mui-active': { color: t.text },
                  '& .MuiStepLabel-label.Mui-completed': { color: '#22C55E' },
                }}
              >{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: t.border }}>
        {/* ── Step 0: Domain Info ───────────────────────────────────────── */}
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Domain Name"
              placeholder="e.g. example.com"
              value={domainName}
              onChange={e => setDomainName(e.target.value.toLowerCase())}
              InputProps={{ sx: { color: t.text } }}
              InputLabelProps={{ sx: { color: t.muted } }}
              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border } }}
            />
            <TextField
              fullWidth
              label="EPP / Auth Code"
              placeholder="Obtain from your current registrar"
              value={eppCode}
              onChange={e => setEppCode(e.target.value)}
              InputProps={{ sx: { color: t.text } }}
              InputLabelProps={{ sx: { color: t.muted } }}
              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border } }}
            />
            <Typography variant="caption" sx={{ color: t.muted, lineHeight: 1.5 }}>
              You can find your EPP auth code in your current registrar's control panel.
              Transfers typically complete within 5–7 days.
            </Typography>
          </Box>
        )}

        {/* ── Step 1: Review ────────────────────────────────────────────── */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            {[
              ['Domain',    domainName],
              ['EPP Code',  eppCode.replace(/./g, '•')],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: t.muted }}>{k}</Typography>
                <Typography sx={{ color: t.text }}>{v}</Typography>
              </Box>
            ))}
            <Alert severity="info" sx={{ mt: 1, bgcolor: isDark ? '#0f2340' : undefined }}>
              Transfer will be initiated immediately. You may need to approve it via email.
            </Alert>
            {error && <Typography sx={{ color: '#EF4444' }}>{error}</Typography>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${t.border}`, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: t.muted }}>Cancel</Button>
        {step > 0 && (
          <Button onClick={() => setStep(0)} sx={{ color: t.text }}>Back</Button>
        )}
        {step === 0 && (
          <Button
            variant="contained"
            onClick={() => setStep(1)}
            disabled={!canProceed}
            sx={{ bgcolor: t.brand, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            Review
          </Button>
        )}
        {step === 1 && (
          <Button
            variant="contained"
            onClick={handleTransfer}
            disabled={submitting}
            sx={{ bgcolor: t.brand, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Initiate Transfer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransferDomainModal;
