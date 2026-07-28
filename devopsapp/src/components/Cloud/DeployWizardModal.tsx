// OrcaCloud – Deploy Server Wizard Modal

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Box, Typography, Grid, Button,
  TextField, Stack, Chip, CircularProgress, Alert,
  IconButton, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ComputerIcon from '@mui/icons-material/Computer';
import HubIcon from '@mui/icons-material/Hub';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TerminalIcon from '@mui/icons-material/Terminal';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import ExtensionIcon from '@mui/icons-material/Extension';
import AlbumIcon from '@mui/icons-material/Album';
import { CloudImage, CloudFlavor, CloudNetwork, CreateVMPayload } from '../../types/cloud';
import { vmApi, onboardingApi } from '../../services/cloudApi';

interface DeployWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ['Choose Image', 'Choose Flavor', 'Choose Network & Name'];

const OS_ICONS: Record<string, React.ReactElement> = {
  linux:   <TerminalIcon sx={{ fontSize: '1.5rem', color: '#9ca3af' }} />,
  windows: <DesktopWindowsIcon sx={{ fontSize: '1.5rem', color: '#9ca3af' }} />,
  custom:  <ExtensionIcon sx={{ fontSize: '1.5rem', color: '#9ca3af' }} />,
};
const OS_ICON_FALLBACK = <AlbumIcon sx={{ fontSize: '1.5rem', color: '#9ca3af' }} />;

const DeployWizardModal: React.FC<DeployWizardModalProps> = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep]     = useState(0);
  const [images,   setImages]           = useState<CloudImage[]>([]);
  const [flavors,  setFlavors]          = useState<CloudFlavor[]>([]);
  const [networks, setNetworks]         = useState<CloudNetwork[]>([]);
  const [loadingOpts, setLoadingOpts]   = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [selectedImage, setSelectedImage]   = useState<CloudImage | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<CloudFlavor | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<CloudNetwork | null>(null);
  const [serverName, setServerName]     = useState('');
  const [keyName, setKeyName]           = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);

  useEffect(() => {
    if (!open || optionsLoaded) return;
    setLoadingOpts(true);
    Promise.allSettled([
      vmApi.listImages(),
      vmApi.listFlavors(),
      vmApi.listNetworks(),
    ]).then(([imgRes, flvRes, netRes]) => {
      setImages(
        imgRes.status === 'fulfilled' && imgRes.value.data?.length
          ? imgRes.value.data
          : FALLBACK_IMAGES,
      );
      setFlavors(
        flvRes.status === 'fulfilled' && flvRes.value.data?.length
          ? flvRes.value.data
          : FALLBACK_FLAVORS,
      );
      if (netRes.status === 'fulfilled') setNetworks(netRes.value.data ?? []);
      setOptionsLoaded(true);
    }).finally(() => setLoadingOpts(false));
  }, [open, optionsLoaded]);

  const reset = () => {
    setActiveStep(0);
    setSelectedImage(null);
    setSelectedFlavor(null);
    setSelectedNetwork(null);
    setServerName('');
    setKeyName('');
    setError(null);
    setSuccess(false);
    // Don't reset optionsLoaded — reuse cached flavors/images
  };

  const handleClose = () => { reset(); onClose(); };

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => setActiveStep((s) => s - 1);

  const canNext = () => {
    if (activeStep === 0) return !!selectedImage;
    if (activeStep === 1) return !!selectedFlavor;
    if (activeStep === 2) return serverName.trim().length >= 2;
    return false;
  };

  const handleDeploy = async () => {
    if (!selectedImage || !selectedFlavor) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateVMPayload = {
        name:       serverName.trim(),
        image_id:   selectedImage.image_id,
        flavor_id:  selectedFlavor.flavor_id,
        network_id: selectedNetwork?.id,
        key_name:   keyName.trim() || undefined,
        wait:       false,
      };
      await vmApi.create(payload);
      // Mark create_vm step as done in onboarding checklist
      try { await onboardingApi.updateChecklist({ create_vm: true }); } catch { /* best-effort */ }
      setSuccess(true);
      setTimeout(() => { handleClose(); onSuccess(); }, 1500);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || '';
      if (detail.includes('not configured') || e?.response?.status === 503) {
        setError('OpenStack is not connected. Configure your cloud credentials in Settings to provision real servers.');
      } else {
        setError(detail || 'Failed to create server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // images / flavors / networks come directly from state (fallbacks applied during load)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: '#0b1220',
          border: '1px solid rgba(21,61,117,.25)',
          borderRadius: 3,
          color: '#e6eef7',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RocketLaunchIcon sx={{ color: '#153d75' }} />
          <Typography fontWeight={800} fontSize="1.1rem" color="#fff">
            Deploy Your First Server
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: '#9ca3af' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: 'rgba(255,255,255,.07)' }} />

      {/* Stepper */}
      <Box sx={{ px: 3, pt: 2.5 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': { color: '#9ca3af', fontSize: '.8rem' },
                  '& .MuiStepLabel-label.Mui-active': { color: '#fff', fontWeight: 700 },
                  '& .MuiStepLabel-label.Mui-completed': { color: '#153d75' },
                  '& .MuiStepIcon-root': { color: 'rgba(255,255,255,.1)' },
                  '& .MuiStepIcon-root.Mui-active': { color: '#153d75' },
                  '& .MuiStepIcon-root.Mui-completed': { color: '#153d75' },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(21,61,117,.1)', color: '#153d75', border: '1px solid rgba(21,61,117,.3)' }}>
            Server is being provisioned! Redirecting…
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loadingOpts ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress sx={{ color: '#153d75' }} />
            <Typography mt={2} color="#9ca3af" fontSize=".9rem">Loading cloud options…</Typography>
          </Box>
        ) : (
          <>
            {/* STEP 0 – Choose Image */}
            {activeStep === 0 && (
              <Box>                  {/* STEP 0 – Choose Image */}
                <Typography fontWeight={700} color="#fff" mb={2}>Select an Operating System</Typography>
                <Grid container spacing={1.5}>
                  {images.map((img) => (
                    <Grid item xs={12} sm={6} md={4} key={img.image_id}>
                      <Box
                        onClick={() => setSelectedImage(img)}
                        sx={{
                          p: 2, borderRadius: 2, cursor: 'pointer',
                          border: '1px solid',
                          borderColor: selectedImage?.image_id === img.image_id
                            ? '#153d75' : 'rgba(255,255,255,.08)',
                          bgcolor: selectedImage?.image_id === img.image_id
                            ? 'rgba(21,61,117,.08)' : 'rgba(255,255,255,.03)',
                          transition: 'all .15s',
                          '&:hover': { borderColor: 'rgba(21,61,117,.5)', bgcolor: 'rgba(21,61,117,.05)' },
                        }}
                      >
                        <Box mb={.5} sx={{ lineHeight: 1 }}>{OS_ICONS[img.os_type] ?? OS_ICON_FALLBACK}</Box>
                        <Typography fontWeight={700} color="#fff" fontSize=".88rem">{img.os_name}</Typography>
                        <Typography variant="caption" color="#9ca3af">{img.os_version}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* STEP 1 – Choose Flavor */}
            {activeStep === 1 && (
              <Box>
                <Typography fontWeight={700} color="#fff" mb={2}>Select Instance Size</Typography>
                <Stack spacing={1.5}>
                  {flavors.map((fl) => (
                    <Box
                      key={fl.flavor_id}
                      onClick={() => setSelectedFlavor(fl)}
                      sx={{
                        p: 2, borderRadius: 2, cursor: 'pointer',
                        border: '1px solid',
                        borderColor: selectedFlavor?.flavor_id === fl.flavor_id
                          ? '#153d75' : 'rgba(255,255,255,.08)',
                        bgcolor: selectedFlavor?.flavor_id === fl.flavor_id
                          ? 'rgba(21,61,117,.08)' : 'rgba(255,255,255,.03)',
                        display: 'flex', alignItems: 'center', gap: 2,
                        transition: 'all .15s',
                        '&:hover': { borderColor: 'rgba(21,61,117,.5)' },
                      }}
                    >
                      <ComputerIcon sx={{ color: fl.is_gpu ? '#f59e0b' : '#153d75', fontSize: '1.8rem', flexShrink: 0 }} />
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={700} color="#fff" fontSize=".9rem">{fl.name}</Typography>
                          {fl.is_gpu && <Chip label="GPU" size="small" sx={{ bgcolor: 'rgba(245,158,11,.15)', color: '#f59e0b', fontWeight: 700, fontSize: '.65rem', height: 18 }} />}
                        </Stack>
                        <Typography variant="caption" color="#9ca3af">
                          {fl.vcpus} vCPU · {(fl.memory_mb / 1024).toFixed(0)} GB RAM · {fl.disk_gb} GB SSD
                        </Typography>
                      </Box>
                      <Typography fontWeight={700} color="#153d75" fontSize=".9rem">
                        ${fl.hourly_cost_usd}/hr
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* STEP 2 – Network & Name */}
            {activeStep === 2 && (
              <Box>
                <Typography fontWeight={700} color="#fff" mb={2}>Name & Network</Typography>
                <Stack spacing={2.5}>
                  <TextField
                    label="Server Name"
                    placeholder="e.g. web-server-01"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    fullWidth
                    size="small"
                    sx={textFieldSx}
                  />

                  <TextField
                    label="SSH Key Name (optional)"
                    placeholder="e.g. my-ssh-key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    fullWidth
                    size="small"
                    helperText="Name of a key pair registered in OpenStack. Leave blank to skip."
                    FormHelperTextProps={{ sx: { color: '#6b7280' } }}
                    sx={textFieldSx}
                  />

                  <Box>
                    <Typography fontWeight={600} color="#e6eef7" fontSize=".88rem" mb={1}>
                      Network
                    </Typography>
                    <Stack spacing={1}>
                      <Box
                        onClick={() => setSelectedNetwork(null)}
                        sx={{
                          p: 1.5, borderRadius: 2, cursor: 'pointer',
                          border: '1px solid',
                          borderColor: !selectedNetwork ? '#153d75' : 'rgba(255,255,255,.08)',
                          bgcolor: !selectedNetwork ? 'rgba(21,61,117,.08)' : 'rgba(255,255,255,.03)',
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          transition: 'all .15s',
                        }}
                      >
                        <HubIcon sx={{ color: '#153d75', fontSize: '1.1rem' }} />
                        <Typography fontSize=".85rem" color="#e6eef7" fontWeight={600}>Default Network</Typography>
                        <Chip label="Recommended" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(21,61,117,.12)', color: '#153d75', fontSize: '.65rem', height: 18 }} />
                      </Box>
                      {networks.map((net) => (
                        <Box
                          key={net.id}
                          onClick={() => setSelectedNetwork(net)}
                          sx={{
                            p: 1.5, borderRadius: 2, cursor: 'pointer',
                            border: '1px solid',
                            borderColor: selectedNetwork?.id === net.id ? '#153d75' : 'rgba(255,255,255,.08)',
                            bgcolor: selectedNetwork?.id === net.id ? 'rgba(21,61,117,.08)' : 'rgba(255,255,255,.03)',
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            transition: 'all .15s',
                          }}
                        >
                          <HubIcon sx={{ color: '#8b5cf6', fontSize: '1.1rem' }} />
                          <Typography fontSize=".85rem" color="#e6eef7">{net.name}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {/* Summary */}
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <Typography fontWeight={700} color="#fff" fontSize=".85rem" mb={1}>Summary</Typography>
                    <Stack spacing={.5}>
                      <SummaryRow label="Image"   value={selectedImage?.os_name ?? '—'} />
                      <SummaryRow label="Flavor"  value={selectedFlavor?.name ?? '—'} />
                      <SummaryRow label="Network" value={selectedNetwork?.name ?? 'Default'} />
                      {keyName && <SummaryRow label="SSH Key" value={keyName} />}
                      <SummaryRow label="Cost"    value={selectedFlavor ? `$${selectedFlavor.hourly_cost_usd}/hr` : '—'} highlight />
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: 'rgba(255,255,255,.07)' }} />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={activeStep === 0 ? handleClose : handleBack}
          sx={{ color: '#9ca3af', '&:hover': { color: '#e6eef7' } }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {activeStep < 2 ? (
          <Button
            variant="contained"
            disabled={!canNext()}
            onClick={handleNext}
            sx={{ bgcolor: '#153d75', color: '#FFFFFF', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={!canNext() || submitting}
            onClick={handleDeploy}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <RocketLaunchIcon />}
            sx={{ bgcolor: '#153d75', color: '#FFFFFF', fontWeight: 700, borderRadius: 2, px: 3, '&:hover': { bgcolor: '#0f2d5a' } }}
          >
            {submitting ? 'Deploying…' : 'Create Server'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const SummaryRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant="caption" color="#9ca3af">{label}</Typography>
    <Typography variant="caption" color={highlight ? '#153d75' : '#e6eef7'} fontWeight={highlight ? 700 : 400}>
      {value}
    </Typography>
  </Stack>
);

// Fallback data if backend has no seeded records yet
const FALLBACK_IMAGES: CloudImage[] = [
  { image_id: 'ubuntu-22', name: 'Ubuntu 22.04 LTS', os_name: 'Ubuntu', os_type: 'linux', os_version: '22.04 LTS' },
  { image_id: 'debian-12', name: 'Debian 12', os_name: 'Debian', os_type: 'linux', os_version: '12 Bookworm' },
  { image_id: 'centos-9',  name: 'CentOS Stream 9', os_name: 'CentOS', os_type: 'linux', os_version: 'Stream 9' },
  { image_id: 'win-2022',  name: 'Windows Server 2022', os_name: 'Windows', os_type: 'windows', os_version: '2022' },
];

const FALLBACK_FLAVORS: CloudFlavor[] = [
  { flavor_id: 'small',   name: 'Starter',    vcpus: 1,  memory_mb: 1024,  disk_gb: 25,  hourly_cost_usd: '0.0075', is_gpu: false },
  { flavor_id: 'medium',  name: 'Standard',   vcpus: 2,  memory_mb: 4096,  disk_gb: 80,  hourly_cost_usd: '0.0280', is_gpu: false },
  { flavor_id: 'large',   name: 'Performance',vcpus: 4,  memory_mb: 8192,  disk_gb: 160, hourly_cost_usd: '0.0550', is_gpu: false },
  { flavor_id: 'gpu-v1',  name: 'GPU Compute',vcpus: 8,  memory_mb: 32768, disk_gb: 400, hourly_cost_usd: '0.4900', is_gpu: true  },
];

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,.15)' },
    '&:hover fieldset': { borderColor: 'rgba(21,61,117,.5)' },
    '&.Mui-focused fieldset': { borderColor: '#153d75' },
  },
  '& .MuiInputLabel-root': { color: '#9ca3af' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#153d75' },
};

export default DeployWizardModal;
