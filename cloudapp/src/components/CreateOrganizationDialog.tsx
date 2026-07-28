// CreateOrganizationDialog
// A self-contained 3-step wizard rendered inside a MUI Dialog.
// Used both when the user has no org yet and from the "New org" button
// anywhere in the dashboard.

import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField, Button,
  Grid, CircularProgress, Alert, Stepper, Step, StepLabel,
  InputAdornment, Divider, Select, MenuItem, FormControl, InputLabel,
  IconButton,
} from '@mui/material';
import BusinessIcon   from '@mui/icons-material/Business';
import DomainIcon     from '@mui/icons-material/Language';
import EmailIcon      from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon      from '@mui/icons-material/Close';
import { organizationApi } from '../services/enterpriseApi';
import { INDUSTRIES, COUNTRIES } from '../pages/CreateOrganizationPage';
import { dashboardTokens, dashboardSemanticColors } from '../styles/dashboardDesignSystem';

const T = {
  bg:     dashboardTokens.colors.background,
  card:   dashboardTokens.colors.surface,
  border: dashboardTokens.colors.border,
  text:   dashboardTokens.colors.textPrimary,
  sub:    dashboardTokens.colors.textSecondary,
  brand:  dashboardTokens.colors.brandPrimary,
  green:  dashboardSemanticColors.success,
  red:    dashboardSemanticColors.danger,
  font:   '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const STEPS = ['Organization identity', 'Contact & domain', 'Review & create'];

function toSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 64);
}

interface Props {
  open: boolean;
  /** Called with the new org's slug on success */
  onSuccess: (slug: string) => void;
  /** Optional — if omitted the dialog has no close button (mandatory first-time setup) */
  onClose?: () => void;
}

export default function CreateOrganizationDialog({ open, onSuccess, onClose }: Props) {
  const [step, setStep]                   = useState(0);
  const [name, setName]                   = useState('');
  const [slug, setSlug]                   = useState('');
  const [slugEdited, setSlugEdited]       = useState(false);
  const [country, setCountry]             = useState('');
  const [industry, setIndustry]           = useState('');
  const [contactEmail, setContactEmail]   = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [logoUrl, setLogoUrl]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const reset = () => {
    setStep(0); setName(''); setSlug(''); setSlugEdited(false);
    setCountry(''); setIndustry(''); setContactEmail('');
    setPrimaryDomain(''); setLogoUrl(''); setLoading(false); setError('');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const step0Valid = name.trim().length > 0 && slug.trim().length > 0 && country.trim().length > 0;
  const step1Valid = contactEmail.trim().length > 0 && contactEmail.includes('@');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const org = await organizationApi.create({
        name:           name.trim(),
        slug:           slug.trim(),
        country:        country.trim(),
        industry:       industry.trim() || undefined,
        contact_email:  contactEmail.trim(),
        primary_domain: primaryDomain.trim() || undefined,
        logo_url:       logoUrl.trim() || undefined,
      });
      reset();
      onSuccess(org.slug);
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === 'object') {
        setError(Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(' | '));
      } else {
        setError('Failed to create organization. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  const stepSx = {
    '& .MuiStepLabel-label':           { color: T.sub,  fontFamily: T.font },
    '& .MuiStepLabel-label.Mui-active':    { color: T.text, fontWeight: 700 },
    '& .MuiStepLabel-label.Mui-completed': { color: T.green },
    '& .MuiStepIcon-root':             { color: T.border },
    '& .MuiStepIcon-root.Mui-active':  { color: T.brand },
    '& .MuiStepIcon-root.Mui-completed':{ color: T.green },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 2,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 3, sm: 4 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${T.brand}18`, borderRadius: '50%', p: 1.5, mb: 1.5,
            }}>
              <BusinessIcon sx={{ color: T.brand, fontSize: '2rem' }} />
            </Box>
            <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.55rem', fontFamily: T.font, mb: 0.5 }}>
              Create your organization
            </Typography>
            <Typography sx={{ color: T.sub, fontSize: '.95rem' }}>
              Your organization is the root context for all enterprise features.
            </Typography>
          </Box>
          {onClose && (
            <IconButton onClick={handleClose} disabled={loading} sx={{ ml: 1, mt: -1, color: T.sub }}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map(label => (
            <Step key={label}><StepLabel sx={stepSx}>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Step 0: Identity ── */}
        {step === 0 && (
          <Box>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 2.5, fontFamily: T.font }}>
              Organization identity
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  label="Organization name *" value={name}
                  onChange={e => handleNameChange(e.target.value)} fullWidth autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ color: T.sub }} /></InputAdornment> }}
                  helperText="Appears across dashboards, emails and invoices."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Slug *" value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugEdited(true); }} fullWidth
                  helperText="Used in your enterprise URLs — e.g. /enterprise/my-org/overview"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">
                      <Typography sx={{ color: T.sub, fontSize: '.82rem', mr: 0.5 }}>/enterprise/</Typography>
                    </InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Country *</InputLabel>
                  <Select value={country} label="Country *" onChange={e => setCountry(e.target.value)} displayEmpty>
                    <MenuItem value=""><em style={{ color: T.sub }}>Select country…</em></MenuItem>
                    {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Industry</InputLabel>
                  <Select value={industry} label="Industry" onChange={e => setIndustry(e.target.value)} displayEmpty>
                    <MenuItem value=""><em style={{ color: T.sub }}>Select industry…</em></MenuItem>
                    {INDUSTRIES.map(ind => <MenuItem key={ind} value={ind}>{ind}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" disabled={!step0Valid} onClick={() => setStep(1)}
                sx={{ bgcolor: T.brand, fontWeight: 700, px: 4 }}>
                Next
              </Button>
            </Box>
          </Box>
        )}

        {/* ── Step 1: Contact & Domain ── */}
        {step === 1 && (
          <Box>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 2.5, fontFamily: T.font }}>
              Contact & domain
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  label="Contact email *" value={contactEmail} type="email" autoFocus
                  onChange={e => setContactEmail(e.target.value)} fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: T.sub }} /></InputAdornment> }}
                  helperText="Used for billing notifications, compliance alerts, and team invitations."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Primary domain" value={primaryDomain}
                  onChange={e => setPrimaryDomain(e.target.value)} fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><DomainIcon sx={{ color: T.sub }} /></InputAdornment> }}
                  helperText="Optional — e.g. acme.com. You can add and verify domains later."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Logo URL" value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)} fullWidth
                  helperText="Optional — a publicly accessible URL to your organization logo."
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={() => setStep(0)} sx={{ color: T.sub }}>Back</Button>
              <Button variant="contained" disabled={!step1Valid} onClick={() => setStep(2)}
                sx={{ bgcolor: T.brand, fontWeight: 700, px: 4 }}>
                Review
              </Button>
            </Box>
          </Box>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <Box>
            <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 2.5, fontFamily: T.font }}>
              Review & create
            </Typography>
            <Box sx={{ bgcolor: `${T.brand}08`, border: `1px solid ${T.brand}22`, borderRadius: 2, p: 2.5, mb: 2.5 }}>
              {[
                ['Organization name', name],
                ['Slug',              slug],
                ['Country',          country],
                ['Industry',         industry      || '—'],
                ['Contact email',    contactEmail],
                ['Primary domain',   primaryDomain || '—'],
                ['Logo URL',         logoUrl       || '—'],
              ].map(([label, val]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: .9, borderBottom: `1px solid ${T.border}`, '&:last-child': { borderBottom: 'none' } }}>
                  <Typography variant="body2" sx={{ color: T.sub, fontWeight: 600 }}>{label}</Typography>
                  <Typography variant="body2" sx={{ color: T.text, fontWeight: 700, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{val}</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ borderColor: T.border, mb: 2 }} />
            <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 2.5 }}>
              This will set you as the <strong>OWNER</strong> and seed a default <strong>General</strong> department, <strong>Core Team</strong>, and <strong>Default Group</strong>. You can customise these later.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setStep(1)} sx={{ color: T.sub }} disabled={loading}>Back</Button>
              <Button
                variant="contained" onClick={handleCreate} disabled={loading}
                startIcon={loading ? <CircularProgress size={15} sx={{ color: 'white' }} /> : <CheckCircleIcon />}
                sx={{ bgcolor: T.brand, fontWeight: 700, px: 4 }}>
                {loading ? 'Creating…' : 'Create organization'}
              </Button>
            </Box>
          </Box>
        )}

      </DialogContent>
    </Dialog>
  );
}
