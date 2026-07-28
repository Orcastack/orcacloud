// OrcaCloud – Create Managed Database Wizard Modal

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Box, Typography,
  Button, TextField, Stack, Chip, CircularProgress, Alert,
  IconButton, Switch, FormControlLabel, ToggleButton, ToggleButtonGroup,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import { databaseApi } from '../../services/cloudApi';
import {
  DBEngine, DBPlan, DB_PLANS, ENGINE_META, ManagedDatabase,
  CreateDatabasePayload, DBRegion, DBTenancy,
} from '../../types/database';
import type { DBEngineCatalogue } from '../../types/database';

const STEPS = ['Choose Engine', 'Select Plan', 'Configure'];

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSuccess: (db: ManagedDatabase, password: string) => void;
}

const REGIONS: { key: DBRegion; label: string }[] = [
  { key: 'af-south-1', label: 'Africa — Johannesburg' },
  { key: 'eu-west-1',  label: 'Europe — Frankfurt'    },
  { key: 'ap-south-1', label: 'Asia — Singapore'      },
  { key: 'us-east-1',  label: 'US East — New York'    },
  { key: 'us-west-1',  label: 'US West — Los Angeles' },
];

const TENANCY: { key: DBTenancy; label: string; desc: string }[] = [
  { key: 'shared',    label: 'Shared',       desc: 'Best value, shared cluster' },
  { key: 'dedicated', label: 'Dedicated',    desc: 'Isolated instance, better performance' },
  { key: 'cluster',   label: 'HA Cluster',   desc: 'Multi-node high availability' },
];

// ── Engine card ───────────────────────────────────────────────────────────────
function EngineCard({
  engine, versions, selected, onSelect, isDark,
}: {
  engine: DBEngine; versions: string[]; selected: boolean;
  onSelect: (e: DBEngine, v: string) => void; isDark: boolean;
}) {
  const meta = ENGINE_META[engine];
  const [ver, setVer] = useState(versions[0] ?? '');

  return (
    <Box
      onClick={() => onSelect(engine, ver)}
      sx={{
        p: 2, borderRadius: 2, cursor: 'pointer', border: '2px solid',
        borderColor: selected ? meta.color : isDark ? 'rgba(255,255,255,.1)' : '#E5E7EB',
        bgcolor: selected ? `${meta.color}14` : isDark ? 'rgba(255,255,255,.03)' : '#FAFAFA',
        transition: 'all .15s', '&:hover': { borderColor: meta.color, bgcolor: `${meta.color}0A` },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 32, height: 32, borderRadius: '6px', bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography fontWeight={800} fontSize=".65rem" color="#fff">{meta.icon}</Typography>
          </Box>
          <Box>
            <Typography fontWeight={700} fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'}>
              {engine.charAt(0).toUpperCase() + engine.slice(1)}
            </Typography>
            <Chip label={meta.category} size="small" sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: `${meta.color}20`, color: meta.color }} />
          </Box>
        </Box>
        {selected && <CheckCircleIcon sx={{ color: meta.color, fontSize: '1.1rem' }} />}
      </Box>
      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280', display: 'block', mb: 1 }}>
        {meta.description}
      </Typography>
      <ToggleButtonGroup
        value={ver} exclusive size="small"
        onChange={(_, v) => { if (v) { setVer(v); if (selected) onSelect(engine, v); } }}
        onClick={(e) => e.stopPropagation()}
      >
        {versions.map(v => (
          <ToggleButton key={v} value={v}
            sx={{ py: .25, px: 1, fontSize: '.7rem', fontWeight: 700, borderColor: `${meta.color}40`,
              '&.Mui-selected': { bgcolor: meta.color, color: '#fff', '&:hover': { bgcolor: meta.color } } }}>
            v{v}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect, isDark }: {
  plan: DBPlan; selected: boolean; onSelect: (p: DBPlan) => void; isDark: boolean;
}) {
  return (
    <Box
      onClick={() => onSelect(plan)}
      sx={{
        p: 2, borderRadius: 2, cursor: 'pointer', border: '2px solid', position: 'relative',
        borderColor: selected ? '#111827' : isDark ? 'rgba(255,255,255,.1)' : '#E5E7EB',
        bgcolor: selected ? 'rgba(21,61,117,.08)' : isDark ? 'rgba(255,255,255,.03)' : '#FAFAFA',
        transition: 'all .15s', '&:hover': { borderColor: '#111827' },
      }}
    >
      {plan.recommended && (
        <Chip label="Recommended" size="small" sx={{ position: 'absolute', top: 8, right: 8, height: 18, fontSize: '.6rem', fontWeight: 700, bgcolor: '#153d75', color: '#fff' }} />
      )}
      {selected && <CheckCircleIcon sx={{ position: 'absolute', top: 10, right: plan.recommended ? 100 : 10, color: '#111827', fontSize: '1rem' }} />}
      <Typography fontWeight={800} fontSize=".95rem" color={isDark ? '#ffffff' : '#111827'} mb={.5}>{plan.label}</Typography>
      <Stack spacing={.25} mb={1}>
        {[
          `${plan.vcpus} vCPU`,
          `${plan.memory_mb >= 1024 ? plan.memory_mb / 1024 + ' GB' : plan.memory_mb + ' MB'} RAM`,
          `${plan.storage_gb} GB SSD`,
        ].map(s => (
          <Typography key={s} variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.65)' : '#6B7280' }}>{s}</Typography>
        ))}
      </Stack>
      <Typography fontWeight={700} color="#111827" fontSize=".9rem">
        ${plan.hourly_usd.toFixed(3)}<Typography component="span" variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.45)' : '#9CA3AF' }}>/hr</Typography>
      </Typography>
    </Box>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
const CreateDatabaseModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [step, setStep]           = useState(0);
  const [engines, setEngines]     = useState<DBEngineCatalogue[]>([]);
  const [selEngine, setSelEngine] = useState<DBEngine | null>(null);
  const [selVersion, setSelVersion] = useState('');
  const [selPlan, setSelPlan]     = useState<DBPlan | null>(null);
  const [selTenancy, setSelTenancy] = useState<DBTenancy>('shared');
  const [selRegion, setSelRegion] = useState<DBRegion>('af-south-1');
  const [name, setName]           = useState('');
  const [dbName, setDbName]       = useState('atonix');
  const [sslEnabled, setSsl]      = useState(true);
  const [publicAccess, setPublic] = useState(false);
  const [backupEnabled, setBackup] = useState(true);
  const [retentionDays, setRetention] = useState(7);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) databaseApi.engines().then(r => setEngines(r.data)).catch(() => {});
  }, [open]);

  const handleReset = () => {
    setStep(0); setSelEngine(null); setSelVersion(''); setSelPlan(null);
    setName(''); setDbName('atonix'); setError('');
    setSelTenancy('shared'); setSelRegion('af-south-1');
  };

  const handleClose = () => { handleReset(); onClose(); };

  const canNext = () => {
    if (step === 0) return !!selEngine && !!selVersion;
    if (step === 1) return !!selPlan;
    if (step === 2) return name.trim().length >= 3;
    return false;
  };

  const handleSubmit = async () => {
    if (!selEngine || !selPlan) return;
    setSubmitting(true); setError('');
    try {
      const payload: CreateDatabasePayload = {
        name:                  name.trim(),
        engine:                selEngine,
        version:               selVersion,
        tenancy_model:         selTenancy,
        vcpus:                 selPlan.vcpus,
        memory_mb:             selPlan.memory_mb,
        storage_gb:            selPlan.storage_gb,
        read_replicas:         0,
        region:                selRegion,
        database_name:         dbName || 'atonix',
        ssl_enabled:           sslEnabled,
        publicly_accessible:   publicAccess,
        backup_enabled:        backupEnabled,
        backup_retention_days: retentionDays,
        allowed_ips:           [],
        hourly_cost_usd:       selPlan.hourly_usd,
      };
      const { data } = await databaseApi.create(payload);
      onSuccess(data, data.initial_password ?? '');
      handleReset();
    } catch (e: any) {
      setError(e?.response?.data?.name?.[0] ?? e?.response?.data?.detail ?? 'Failed to create database. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const bg      = isDark ? '#132336' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,.08)' : '#E5E7EB';
  const textSec = isDark ? 'rgba(255,255,255,.55)' : '#6B7280';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: bg, border: `1px solid ${border}`, borderRadius: '14px', backgroundImage: 'none', boxShadow: '0 20px 60px rgba(0,0,0,.4)' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography fontWeight={800} fontSize="1.1rem" color={isDark ? '#ffffff' : '#111827'}>Deploy Managed Database</Typography>
          <Typography variant="caption" sx={{ color: textSec }}>PostgreSQL, MySQL, MongoDB, Redis and more</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ color: textSec }}><CloseIcon /></IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={step} alternativeLabel>
          {STEPS.map(s => (
            <Step key={s}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { color: textSec, fontSize: '.8rem' },
                '& .MuiStepLabel-label.Mui-active': { color: isDark ? '#ffffff' : '#111827', fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: '#10B981', fontWeight: 600 },
                '& .MuiStepIcon-root': { color: isDark ? 'rgba(255,255,255,.15)' : '#E5E7EB' },
                '& .MuiStepIcon-root.Mui-active': { color: '#153d75' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#10B981' },
              }}>{s}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ pt: 1.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* STEP 0 – Choose Engine */}
        {step === 0 && (
          <Box>
            <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} mb={1.5}>Select a database engine</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
              {(engines.length ? engines : [
                { engine: 'postgresql' as DBEngine, label: 'PostgreSQL', versions: ['15','14'] },
                { engine: 'mysql'      as DBEngine, label: 'MySQL',      versions: ['8.0'] },
                { engine: 'mariadb'    as DBEngine, label: 'MariaDB',    versions: ['10.11'] },
                { engine: 'mongodb'    as DBEngine, label: 'MongoDB',    versions: ['7.0'] },
                { engine: 'redis'      as DBEngine, label: 'Redis',      versions: ['7.2'] },
                { engine: 'clickhouse' as DBEngine, label: 'ClickHouse', versions: ['24.1'] },
                { engine: 'cassandra'  as DBEngine, label: 'Cassandra',  versions: ['4.1'] },
              ]).map(e => (
                <Box key={e.engine}>
                  <EngineCard
                    engine={e.engine} versions={e.versions}
                    selected={selEngine === e.engine}
                    onSelect={(eng, ver) => { setSelEngine(eng); setSelVersion(ver); }}
                    isDark={isDark}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* STEP 1 – Select Plan */}
        {step === 1 && (
          <Box>
            <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} mb={.5}>Choose a plan</Typography>
            <Typography variant="caption" sx={{ color: textSec, display: 'block', mb: 1.5 }}>You can upgrade or downscale at any time.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
              {DB_PLANS.map(p => (
                <Box key={p.id}>
                  <PlanCard plan={p} selected={selPlan?.id === p.id} onSelect={setSelPlan} isDark={isDark} />
                </Box>
              ))}
            </Box>
            <Divider sx={{ borderColor: border, my: 2 }} />
            <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} mb={1}>Tenancy model</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {TENANCY.map(t => (
                <Box key={t.key} onClick={() => setSelTenancy(t.key)}
                  sx={{ p: 1.5, borderRadius: '10px', border: '2px solid', borderColor: selTenancy === t.key ? '#111827' : border, cursor: 'pointer', minWidth: 150, flex: '1 1 150px',
                    bgcolor: selTenancy === t.key ? 'rgba(21,61,117,.08)' : 'transparent', transition: 'all .15s', '&:hover': { borderColor: '#111827' } }}>
                  <Typography fontWeight={700} fontSize=".85rem" color={isDark ? '#ffffff' : '#111827'}>{t.label}</Typography>
                  <Typography variant="caption" sx={{ color: textSec }}>{t.desc}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* STEP 2 – Configure */}
        {step === 2 && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <Box>
                <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} mb={1.5}>Database settings</Typography>
                <Stack spacing={2}>
                  <TextField label="Database name" value={name} onChange={e => setName(e.target.value)}
                    size="small" fullWidth required
                    helperText="3–63 chars, lowercase letters, numbers and hyphens"
                    error={name.length > 0 && name.length < 3}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', color: isDark ? '#ffffff' : '#111827', '& fieldset': { borderColor: border } },
                      '& .MuiInputLabel-root': { color: textSec }, '& .MuiInputLabel-root.Mui-focused': { color: '#153d75' } }} />
                  <TextField label="Initial database" value={dbName} onChange={e => setDbName(e.target.value)}
                    size="small" fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', color: isDark ? '#ffffff' : '#111827', '& fieldset': { borderColor: border } },
                      '& .MuiInputLabel-root': { color: textSec }, '& .MuiInputLabel-root.Mui-focused': { color: '#153d75' } }} />
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ color: textSec, textTransform: 'uppercase', letterSpacing: '.07em', mb: .5, display: 'block' }}>Region</Typography>
                    <Stack spacing={.75}>
                      {REGIONS.map(r => (
                        <Box key={r.key} onClick={() => setSelRegion(r.key)} display="flex" alignItems="center" justifyContent="space-between"
                          sx={{ px: 1.5, py: .75, borderRadius: '8px', border: '1px solid', borderColor: selRegion === r.key ? '#111827' : border, cursor: 'pointer',
                            bgcolor: selRegion === r.key ? 'rgba(21,61,117,.08)' : 'transparent', transition: 'all .12s' }}>
                          <Typography fontSize=".85rem" color={isDark ? '#ffffff' : '#111827'}>{r.label}</Typography>
                          {selRegion === r.key && <CheckCircleIcon sx={{ fontSize: '1rem', color: '#111827' }} />}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
                </Box>
              <Box>
                <Typography fontWeight={700} color={isDark ? '#ffffff' : '#111827'} mb={1.5}>Options</Typography>
                <Stack spacing={1.5}>
                  <FormControlLabel control={<Switch checked={sslEnabled} onChange={e => setSsl(e.target.checked)} />}
                    label={<Box><Typography fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'} fontWeight={600}>SSL/TLS Encryption</Typography>
                      <Typography variant="caption" sx={{ color: textSec }}>Encrypt all connections</Typography></Box>} />
                  <FormControlLabel control={<Switch checked={backupEnabled} onChange={e => setBackup(e.target.checked)} />}
                    label={<Box><Typography fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'} fontWeight={600}>Automated Backups</Typography>
                      <Typography variant="caption" sx={{ color: textSec }}>Daily snapshots with PITR</Typography></Box>} />
                  {backupEnabled && (
                    <TextField label="Retention (days)" type="number" value={retentionDays} onChange={e => setRetention(Number(e.target.value))}
                      size="small" inputProps={{ min: 1, max: 35 }} sx={{ width: 150,
                        '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', color: isDark ? '#ffffff' : '#111827', '& fieldset': { borderColor: border } },
                        '& .MuiInputLabel-root': { color: textSec } }} />
                  )}
                  <FormControlLabel
                    control={<Switch checked={publicAccess} onChange={e => setPublic(e.target.checked)} />}
                    label={<Box><Typography fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'} fontWeight={600}>Public Access</Typography>
                      <Typography variant="caption" sx={{ color: textSec }}>Expose outside private network</Typography></Box>} />
                </Stack>
                <Box sx={{ mt: 3, p: 2, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${border}` }}>
                  <Typography fontWeight={700} fontSize=".85rem" color={isDark ? '#ffffff' : '#111827'} mb={1}>Summary</Typography>
                  {[
                    ['Engine',   `${selEngine ?? '—'} v${selVersion}`],
                    ['Plan',     selPlan?.label ?? '—'],
                    ['vCPU',     String(selPlan?.vcpus ?? 0)],
                    ['RAM',      selPlan ? `${selPlan.memory_mb >= 1024 ? selPlan.memory_mb/1024 + ' GB' : selPlan.memory_mb + ' MB'}` : '—'],
                    ['Storage',  selPlan ? `${selPlan.storage_gb} GB` : '—'],
                    ['Tenancy',  selTenancy],
                    ['Region',   REGIONS.find(r => r.key === selRegion)?.label ?? selRegion],
                    ['Cost',     selPlan ? `$${selPlan.hourly_usd.toFixed(3)}/hr` : '—'],
                  ].map(([k, v]) => (
                    <Box key={k} display="flex" justifyContent="space-between" py={.25}>
                      <Typography variant="caption" sx={{ color: textSec }}>{k}</Typography>
                      <Typography variant="caption" fontWeight={600} color={isDark ? '#ffffff' : '#111827'}>{v}</Typography>
                    </Box>
                  ))}
                </Box>
</Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: textSec, textTransform: 'none' }}>Cancel</Button>
        <Box flex={1} />
        {step > 0 && (
          <Button onClick={() => setStep(s => s - 1)} variant="outlined"
            sx={{ textTransform: 'none', borderColor: border, color: isDark ? '#ffffff' : '#374151', borderRadius: '8px' }}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} variant="contained"
            sx={{ bgcolor: '#153d75', '&:hover': { bgcolor: '#0f2d5a' }, textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 3 }}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canNext() || submitting} variant="contained"
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <LockIcon sx={{ fontSize: '1rem' }} />}
            sx={{ bgcolor: '#153d75', '&:hover': { bgcolor: '#0f2d5a' }, textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 3 }}>
            {submitting ? 'Deploying…' : 'Deploy Database'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateDatabaseModal;
