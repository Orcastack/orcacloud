import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Chip,
  CircularProgress, InputAdornment, IconButton,
  Stepper, Step, StepLabel, FormControlLabel, Switch,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { domainApi } from '../../services/cloudApi';
import type { TldInfo, DomainAvailability, RegisterDomainPayload } from '../../types/domain';

interface Props {
  open:    boolean;
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = ['Search', 'Configure', 'Review'];

const RegisterDomainModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const t = {
    bg:        isDark ? '#262626' : '#FFFFFF', // Carbon Gray 90
    card:      isDark ? '#161616' : '#F9FAFB', // Carbon Gray 100
    border:    isDark ? '#525252' : '#E5E7EB', // Carbon Gray 70
    text:      isDark ? '#f4f4f4' : '#111827', // Carbon Gray 10
    muted:     isDark ? '#c6c6c6' : '#6B7280', // Carbon Gray 30
    brand:     '#153d75', // OrcaCloud brand
    available: isDark ? '#1a3d2e' : '#DCFCE7',
    taken:     isDark ? '#3d1a1a' : '#FEE2E2',
  };

  const [step,          setStep]          = useState(0);
  const [name,          setName]          = useState('');
  const [catalogueTlds, setCatalogueTlds] = useState<TldInfo[]>([]);
  const [results,       setResults]       = useState<DomainAvailability[]>([]);
  const [selected,      setSelected]      = useState<DomainAvailability | null>(null);
  const [searching,     setSearching]     = useState(false);
  const [years,         setYears]         = useState(1);
  const [privacy,       setPrivacy]       = useState(true);
  const [autoRenew,     setAutoRenew]     = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  // Load TLD catalogue once on mount
  useEffect(() => {
    domainApi.tldCatalogue()
      .then(r => setCatalogueTlds(r.data))
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!name.trim()) return;
    setSearching(true);
    setResults([]);
    setError('');
    try {
      const r = await domainApi.checkAvailability(
        name,
        catalogueTlds.map(t => t.tld),
      );
      const raw = (r.data as any).results ?? r.data ?? [];
      setResults(Array.isArray(raw) ? raw : []);
    } catch {
      setError('Availability check failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (d: DomainAvailability) => {
    if (d.status !== 'available') return;
    setSelected(d);
    setStep(1);
  };

  const handleRegister = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    const payload: RegisterDomainPayload = {
      domain_name:        `${name}.${selected.tld}`.replace(/\.+/g, '.'),
      registration_years: years,
      whois_privacy:      privacy,
      auto_renew:         autoRenew,
    };
    try {
      await domainApi.register(payload);
      onCreated();
      handleClose();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Registration failed.');
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setName('');
    setResults([]);
    setSelected(null);
    setError('');
    onClose();
  };

  const totalCost = selected
    ? (selected.price ?? 0) * years
    : 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: t.bg, border: `1px solid ${t.border}`, borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Typography variant="h6" sx={{ color: t.text, fontWeight: 700 }}>Register Domain</Typography>
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
        {/* ── Step 0: Search ─────────────────────────────────────────────── */}
        {step === 0 && (
          <Box>
            <TextField
              fullWidth
              placeholder="e.g. myawesomebiz"
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              label="Domain name (without TLD)"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} disabled={searching}>
                      {searching ? <CircularProgress size={20} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { color: t.text },
              }}
              InputLabelProps={{ sx: { color: t.muted } }}
              sx={{ mb: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border } }}
            />

            {results.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 360, overflow: 'auto' }}>
                {results.map(d => (
                  <Box
                    key={d.tld}
                    onClick={() => handleSelect(d)}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      p: 1.5, borderRadius: 1, cursor: d.status === 'available' ? 'pointer' : 'default',
                      bgcolor: d.status === 'available' ? t.available : t.taken,
                      border: `1px solid ${t.border}`,
                      '&:hover': d.status === 'available' ? { filter: 'brightness(1.08)' } : {},
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {d.status === 'available'
                        ? <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                        : <CancelIcon     sx={{ color: '#EF4444', fontSize: 18 }} />}
                      <Typography sx={{ color: t.text, fontFamily: 'monospace', fontWeight: 600 }}>
                        {name}.{d.tld}
                      </Typography>
                    </Box>
                    {d.status === 'available' && d.price && (
                      <Typography sx={{ color: '#22C55E', fontWeight: 700 }}>
                        ${d.price.toFixed(2)}/yr
                      </Typography>
                    )}
                    {d.status !== 'available' && (
                      <Chip size="small" label="Taken" sx={{ bgcolor: '#EF4444', color: '#FFF' }} />
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ── Step 1: Configure ──────────────────────────────────────────── */}
        {step === 1 && selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ color: t.muted, mb: 1 }}>
              Configuring: <strong style={{ color: t.text }}>{name}.{selected.tld}</strong>
            </Typography>
            <TextField
              label="Registration Years"
              type="number"
              value={years}
              onChange={e => setYears(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              inputProps={{ min: 1, max: 10 }}
              InputProps={{ sx: { color: t.text } }}
              InputLabelProps={{ sx: { color: t.muted } }}
              sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border } }}
            />
            <FormControlLabel
              control={<Switch checked={privacy} onChange={e => setPrivacy(e.target.checked)} />}
              label={<Typography sx={{ color: t.text }}>WHOIS Privacy Protection</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} />}
              label={<Typography sx={{ color: t.text }}>Auto-Renew</Typography>}
            />
          </Box>
        )}

        {/* ── Step 2: Review ─────────────────────────────────────────────── */}
        {step === 2 && selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              ['Domain',          `${name}.${selected.tld}`],
              ['Registration',    `${years} year${years > 1 ? 's' : ''}`],
              ['WHOIS Privacy',   privacy   ? 'Enabled'  : 'Disabled'],
              ['Auto-Renew',      autoRenew ? 'Enabled'  : 'Disabled'],
              ['Price/yr',        `$${(selected.price ?? 0).toFixed(2)}`],
              ['Total',           `$${totalCost.toFixed(2)}`],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ color: t.muted }}>{k}</Typography>
                <Typography sx={{ color: t.text, fontWeight: k === 'Total' ? 700 : 400 }}>{v}</Typography>
              </Box>
            ))}
            {error && (
              <Typography sx={{ color: '#EF4444', mt: 1 }}>{error}</Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${t.border}`, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: t.muted }}>Cancel</Button>
        {step > 0 && (
          <Button onClick={() => setStep(s => s - 1)} sx={{ color: t.text }}>Back</Button>
        )}
        {step < 2 && (
          <Button
            variant="contained"
            onClick={() => step === 0 ? (selected ? setStep(1) : handleSearch()) : setStep(2)}
            disabled={step === 0 ? (!name || !selected) : false}
            sx={{ bgcolor: t.brand, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            {step === 0 ? (selected ? 'Configure' : 'Search') : 'Review'}
          </Button>
        )}
        {step === 2 && (
          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={submitting}
            sx={{ bgcolor: t.brand, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Register Domain'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RegisterDomainModal;
