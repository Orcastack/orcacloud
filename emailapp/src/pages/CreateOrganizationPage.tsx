// OrcaCloud – Create Organization Page
// Shown when a user has no organization yet (first-time enterprise setup).
// On success, redirects to /enterprise/:orgSlug/overview

import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  CircularProgress, Alert, Stepper, Step, StepLabel,
  InputAdornment, Divider, Autocomplete,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import DomainIcon from '@mui/icons-material/Language';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublicIcon from '@mui/icons-material/Public';
import WorkIcon from '@mui/icons-material/Work';
import { useNavigate } from 'react-router-dom';
import { organizationApi } from '../services/enterpriseApi';
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

export const INDUSTRIES = [
  'Technology & Software',
  'Finance & Banking',
  'Healthcare & Life Sciences',
  'Energy & Utilities',
  'Oil & Gas',
  'Manufacturing & Industrial',
  'Retail & E-commerce',
  'Transportation & Logistics',
  'Media & Entertainment',
  'Telecommunications',
  'Education & Research',
  'Government & Public Sector',
  'Agriculture & Food',
  'Real Estate & Construction',
  'Hospitality & Tourism',
  'Sports & Recreation',
  'Legal & Compliance',
  'Nonprofit & NGOs',
  'Automotive',
  'Aerospace & Defense',
  'Pharmaceuticals',
  'Insurance',
  'Cybersecurity',
  'Consulting & Professional Services',
];

export const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
  'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros',
  'Congo (Brazzaville)','Congo (Kinshasa)','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
  'Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia',
  'Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau',
  'Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran',
  'Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan',
  'Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho',
  'Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar',
  'Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania',
  'Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro',
  'Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia',
  'Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea',
  'Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe',
  'Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea',
  'South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo',
  'Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States',
  'Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen','Zambia','Zimbabwe',
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

const STEPS = ['Organization identity', 'Contact & domain', 'Review & create'];

// shared sx for Autocomplete / TextField inputs
const inputSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.brand },
    '&.Mui-focused fieldset': { borderColor: T.brand },
    color: T.text,
  },
  '& .MuiInputLabel-root': { color: T.sub },
  '& .MuiInputLabel-root.Mui-focused': { color: T.brand },
  '& .MuiFormHelperText-root': { color: T.sub },
};

export default function CreateOrganizationPage() {
  const navigate = useNavigate();

  const [step, setStep]                   = useState(0);
  const [name, setName]                   = useState('');
  const [slug, setSlug]                   = useState('');
  const [slugEdited, setSlugEdited]       = useState(false);
  const [country, setCountry]             = useState<string | null>(null);
  const [industry, setIndustry]           = useState<string | null>(null);
  const [contactEmail, setContactEmail]   = useState('');
  const [domainEmail, setDomainEmail]     = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [logoUrl, setLogoUrl]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // field-level validation messages
  const [slugError, setSlugError]         = useState('');
  const [emailError, setEmailError]       = useState('');
  const [domainEmailError, setDomainEmailError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleSlugChange = (val: string) => {
    const clean = toSlug(val);
    setSlug(clean);
    setSlugEdited(true);
    setSlugError(clean.length > 0 && clean.length < 3 ? 'Slug must be at least 3 characters.' : '');
  };

  const handleEmailChange = (val: string) => {
    setContactEmail(val);
    setEmailError(val.length > 0 && !val.includes('@') ? 'Enter a valid email address.' : '');
  };

  const handleDomainEmailChange = (val: string) => {
    setDomainEmail(val);
    const trimmed = val.trim();
    if (trimmed.length === 0) { setDomainEmailError(''); return; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    setDomainEmailError(valid ? '' : 'Enter a valid email address, e.g. admin@acme.com');
  };

  const step0Valid = name.trim().length >= 2 && slug.trim().length >= 3 && !slugError && !!country;
  const step1Valid =
    contactEmail.trim().length > 0 && contactEmail.includes('@') && !emailError &&
    domainEmail.trim().length > 0 && !domainEmailError;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const org = await organizationApi.create({
        name:           name.trim(),
        slug:           slug.trim(),
        country:        country ?? '',
        industry:       industry ?? undefined,
        contact_email:  contactEmail.trim(),
        domain_email:   domainEmail.trim(),
        primary_domain: primaryDomain.trim() || undefined,
        logo_url:       logoUrl.trim() || undefined,
      });
      navigate(`/enterprise/${org.slug}/overview`, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === 'object') {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(' | ');
        setError(msgs);
      } else {
        setError('Failed to create organization. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 3 },
    }}>
      <Box sx={{ width: '100%', maxWidth: 620 }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: `${T.brand}18`, borderRadius: '50%', p: 2, mb: 2,
          }}>
            <BusinessIcon sx={{ color: T.brand, fontSize: '2.2rem' }} />
          </Box>
          <Typography sx={{ color: T.text, fontWeight: 800, fontSize: '1.75rem', fontFamily: T.font, mb: 0.5 }}>
            Create your organization
          </Typography>
          <Typography sx={{ color: T.sub, fontSize: '0.97rem' }}>
            Your organization is the root context for all enterprise features —&nbsp;
            teams, billing, marketing, compliance and more.
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel sx={{
                '& .MuiStepLabel-label':           { color: T.sub,   fontFamily: T.font, fontSize: '.85rem' },
                '& .MuiStepLabel-label.Mui-active':    { color: T.text,  fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: T.green },
                '& .MuiStepIcon-root':             { color: T.border },
                '& .MuiStepIcon-root.Mui-active':  { color: T.brand },
                '& .MuiStepIcon-root.Mui-completed':{ color: T.green },
              }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ bgcolor: T.card, border: `1px solid ${T.border}`, borderRadius: 2, p: { xs: 3, sm: 4 } }}>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* ── Step 0: Identity ─────────────────────────────────────────── */}
          {step === 0 && (
            <Box>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 3, fontFamily: T.font }}>
                Tell us about your organization
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Org name */}
                <TextField
                  label="Organization name *"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  fullWidth
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                      </InputAdornment>
                    ),
                  }}
                  helperText="This appears across dashboards, emails, and invoices."
                />

                {/* Slug */}
                <TextField
                  label="URL slug *"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  fullWidth
                  error={!!slugError}
                  helperText={slugError || `Your dashboard URL: /enterprise/${slug || 'my-org'}/overview`}
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ color: T.sub, fontSize: '.82rem', whiteSpace: 'nowrap' }}>
                          /enterprise/
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Country — searchable Autocomplete */}
                <Autocomplete
                  options={COUNTRIES}
                  value={country}
                  onChange={(_, val) => setCountry(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country *"
                      placeholder="Type to search…"
                      sx={inputSx}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <PublicIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  ListboxProps={{ style: { maxHeight: 240 } }}
                  noOptionsText="No country found"
                  fullWidth
                />

                {/* Industry — searchable Autocomplete */}
                <Autocomplete
                  options={INDUSTRIES}
                  value={industry}
                  onChange={(_, val) => setIndustry(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Industry"
                      placeholder="Type to search…"
                      sx={inputSx}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <WorkIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                      helperText="Optional — helps us tailor your experience."
                    />
                  )}
                  ListboxProps={{ style: { maxHeight: 240 } }}
                  noOptionsText="No industry found"
                  fullWidth
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button
                  variant="contained"
                  disabled={!step0Valid}
                  onClick={() => setStep(1)}
                  sx={{ bgcolor: T.brand, fontWeight: 700, px: 4, '&:hover': { bgcolor: T.brand, opacity: 0.9 } }}>
                  Next
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 1: Contact & Domain ──────────────────────────────────── */}
          {step === 1 && (
            <Box>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 3, fontFamily: T.font }}>
                Contact &amp; domain details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Contact email *"
                  value={contactEmail}
                  type="email"
                  onChange={e => handleEmailChange(e.target.value)}
                  fullWidth
                  error={!!emailError}
                  helperText={emailError || 'Used for billing notifications, compliance alerts, and team invitations.'}
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Organization email *"
                  value={domainEmail}
                  type="email"
                  onChange={e => handleDomainEmailChange(e.target.value)}
                  fullWidth
                  error={!!domainEmailError}
                  placeholder="e.g. admin@acme.com"
                  helperText={domainEmailError || 'The primary email address for your organization — used for SSO and member verification.'}
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Primary domain"
                  value={primaryDomain}
                  onChange={e => setPrimaryDomain(e.target.value)}
                  fullWidth
                  placeholder="e.g. acme.com"
                  helperText="Optional — you can add and verify domains later."
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DomainIcon sx={{ color: T.sub, fontSize: '1.1rem' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Logo URL"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  fullWidth
                  placeholder="https://example.com/logo.png"
                  helperText="Optional — a publicly accessible URL to your organization logo."
                  sx={inputSx}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={() => setStep(0)} sx={{ color: T.sub }}>Back</Button>
                <Button
                  variant="contained"
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  sx={{ bgcolor: T.brand, fontWeight: 700, px: 4, '&:hover': { bgcolor: T.brand, opacity: 0.9 } }}>
                  Review
                </Button>
              </Box>
            </Box>
          )}

          {/* ── Step 2: Review & Create ───────────────────────────────────── */}
          {step === 2 && (
            <Box>
              <Typography sx={{ color: T.text, fontWeight: 700, fontSize: '1rem', mb: 3, fontFamily: T.font }}>
                Review &amp; create
              </Typography>

              <Box sx={{ bgcolor: `${T.brand}08`, border: `1px solid ${T.brand}22`, borderRadius: 2, p: 3, mb: 3 }}>
                {([
                  ['Organization name', name],
                  ['Slug',              slug],
                  ['Country',           country ?? '—'],
                  ['Industry',          industry  ?? '—'],
                  ['Contact email',     contactEmail],
                  ['Email domain',      domainEmail],
                  ['Primary domain',    primaryDomain || '—'],
                  ['Logo URL',          logoUrl       || '—'],
                ] as [string, string][]).map(([label, val]) => (
                  <Box
                    key={label}
                    sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      py: 1.25, borderBottom: `1px solid ${T.border}`,
                      '&:last-child': { borderBottom: 'none', pb: 0 },
                    }}
                  >
                    <Typography variant="body2" sx={{ color: T.sub, fontWeight: 600, flexShrink: 0, mr: 2 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: T.text, fontWeight: 700, textAlign: 'right', wordBreak: 'break-all' }}>{val}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ borderColor: T.border, my: 2 }} />

              <Typography variant="caption" sx={{ color: T.sub, display: 'block', mb: 3, lineHeight: 1.6 }}>
                Creating this organization sets you as the <strong>OWNER</strong> and seeds a default{' '}
                <strong>General</strong> department, <strong>Core Team</strong>, and <strong>Default Group</strong>.
                You can customise these at any time from the Enterprise dashboard.
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep(1)} sx={{ color: T.sub }} disabled={loading}>Back</Button>
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <CheckCircleIcon />}
                  sx={{ bgcolor: T.brand, fontWeight: 700, px: 4, '&:hover': { bgcolor: T.brand, opacity: 0.9 } }}>
                  {loading ? 'Creating…' : 'Create organization'}
                </Button>
              </Box>
            </Box>
          )}

        </Paper>
      </Box>
    </Box>
  );
}
