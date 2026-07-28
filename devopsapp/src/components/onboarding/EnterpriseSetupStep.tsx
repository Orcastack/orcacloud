// OrcaCloud Onboarding – Enterprise Organization Setup Step
// Shown after user selects the Enterprise plan during registration.

import React, { useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, Divider, Alert,
} from '@mui/material';
import BusinessIcon        from '@mui/icons-material/Business';
import DomainIcon          from '@mui/icons-material/Language';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import GroupsIcon          from '@mui/icons-material/Groups';
import { Card as DSCard }  from '../design-system/Card';
import { Button as DSButton } from '../design-system/Button';

const INDUSTRIES = [
  'Cloud Infrastructure', 'Software & SaaS', 'Fintech & Payments',
  'Healthcare & Life Sciences', 'Media & Entertainment', 'E-commerce & Retail',
  'Manufacturing & Logistics', 'Government & Public Sector',
  'Education & Research', 'Telecommunications', 'Other',
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Netherlands', 'Australia', 'Singapore', 'Japan', 'India', 'Brazil', 'Other',
];

export interface EnterpriseOrgData {
  name: string;
  slug: string;
  industry: string;
  country: string;
  primaryDomain: string;
}

interface Props {
  onComplete: (data: EnterpriseOrgData) => void;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const EnterpriseSetupStep: React.FC<Props> = ({ onComplete }) => {
  const [name, setName]               = useState('');
  const [slug, setSlug]               = useState('');
  const [slugEdited, setSlugEdited]   = useState(false);
  const [industry, setIndustry]       = useState('');
  const [country, setCountry]         = useState('');
  const [domain, setDomain]           = useState('');
  const [slugError, setSlugError]     = useState('');

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const handleSlugChange = (v: string) => {
    setSlugEdited(true);
    const clean = slugify(v);
    setSlug(clean);
    setSlugError(clean.length < 3 ? 'Slug must be at least 3 characters.' : '');
  };

  const canSubmit = name.trim().length >= 2 && slug.length >= 3 && !slugError && industry && country;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({ name: name.trim(), slug, industry, country, primaryDomain: domain.trim() });
  };

  const BRAND = '#153d75';
  const GREEN = '#16a34a';

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: 3, bgcolor: `${BRAND}18`, mb: 2 }}>
          <BusinessIcon sx={{ fontSize: 36, color: BRAND }} />
        </Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Set up your Enterprise organization
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This becomes your business command center — teams, marketing, billing, domains and more all under one roof.
        </Typography>
      </Box>

      {/* Capabilities preview */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
        {['Organization & Teams', 'Marketing Campaigns', 'Email Service', 'Custom Domains', 'Branding', 'Compliance & Audit'].map(f => (
          <Chip key={f} label={f} size="small" icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
            sx={{ bgcolor: `${GREEN}12`, color: GREEN, fontWeight: 600, fontSize: '.78rem',
              '& .MuiChip-icon': { color: GREEN } }} />
        ))}
      </Box>

      {/* Form card */}
      <DSCard variant="dashboard">
        <Box sx={{ p: 3 }}>
          {/* Org identity */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <GroupsIcon sx={{ color: BRAND }} />
            <Typography fontWeight={700} fontSize="1rem">Organization Identity</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <TextField
              label="Organization Name *"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. OrcaCloud"
              sx={{ flex: '1 1 260px' }}
              helperText="Your company or team name"
            />
            <TextField
              label="URL Slug *"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="e.g. orcacloud"
              sx={{ flex: '1 1 220px' }}
              error={!!slugError}
              helperText={slugError || `enterprise.orcacloud.com/${slug || '…'}`}
              InputProps={{
                startAdornment: <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5, whiteSpace: 'nowrap' }}>/</Typography>,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
            <FormControl sx={{ flex: '1 1 220px' }}>
              <InputLabel>Industry *</InputLabel>
              <Select value={industry} label="Industry *" onChange={e => setIndustry(e.target.value)}>
                {INDUSTRIES.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl sx={{ flex: '1 1 220px' }}>
              <InputLabel>Country *</InputLabel>
              <Select value={country} label="Country *" onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Optional domain */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DomainIcon sx={{ color: BRAND }} />
            <Typography fontWeight={700} fontSize="1rem">Primary Domain <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography></Typography>
          </Box>

          <TextField
            label="Primary Domain"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="e.g. orcacloud.com"
            fullWidth
            helperText="You can configure DNS records and email sending from the Enterprise dashboard later."
            sx={{ mb: 3 }}
          />

          {/* Plan summary */}
          <Alert
            icon={<CheckCircleIcon sx={{ color: BRAND }} />}
            severity="info"
            sx={{ bgcolor: `${BRAND}0d`, border: `1px solid ${BRAND}33`, color: 'text.primary',
              '& .MuiAlert-icon': { color: BRAND } }}
          >
            <Typography variant="body2" fontWeight={700} gutterBottom>Enterprise Plan included</Typography>
            <Typography variant="caption" color="text.secondary">
              Unlimited members · 50 teams · 100 campaigns · Custom branding · Compliance audit log · Priority support
            </Typography>
          </Alert>
        </Box>
      </DSCard>

      {/* CTA */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <DSButton
          variant="primary"
          size="large"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Create Organization & Go to Dashboard
        </DSButton>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 2 }}>
        You can edit all organization details from the Enterprise dashboard at any time.
      </Typography>
    </Box>
  );
};

export default EnterpriseSetupStep;
