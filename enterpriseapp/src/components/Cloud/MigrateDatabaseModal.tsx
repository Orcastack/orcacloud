// OrcaCloud – Migrate Database Modal
// 3-step wizard: Choose Target → Migration Strategy → Options & Confirm

import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Stepper, Step, StepLabel,
  Chip, Divider, CircularProgress, Alert, TextField,
  Switch, Tooltip, Skeleton, Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';
import ContentCopyIcon   from '@mui/icons-material/ContentCopy';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import SyncIcon          from '@mui/icons-material/Sync';
import StorageIcon       from '@mui/icons-material/Storage';

import { databaseApi }  from '../../services/cloudApi';
import {
  ManagedDatabase, DBMigrationStrategy, DBMigrationResult, ENGINE_META,
} from '../../types/database';

// ── Strategy definitions ──────────────────────────────────────────────────────
interface StrategyMeta {
  id:       DBMigrationStrategy;
  label:    string;
  desc:     string;
  tag:      string;
  tagColor: string;
  icon:     string;
  warning?: string;
}

const STRATEGIES: StrategyMeta[] = [
  {
    id: 'full_copy', label: 'Full Copy',
    desc: 'Copy all schemas and data from source to target. Target is overwritten.',
    tag: 'Most common', tagColor: '#111827', icon: '⬤',
  },
  {
    id: 'schema_only', label: 'Schema Only',
    desc: 'Copy table/collection structure only. No data rows are transferred.',
    tag: 'Fast', tagColor: '#10B981', icon: '◉',
  },
  {
    id: 'data_only', label: 'Data Only',
    desc: 'Copy rows/documents into existing schema on target. Schema must already match.',
    tag: 'Incremental', tagColor: '#153d75', icon: '◈',
  },
  {
    id: 'incremental', label: 'Incremental Sync',
    desc: 'Sync only changed rows since last migration. Requires binary logging / WAL on source.',
    tag: 'Advanced', tagColor: '#F59E0B', icon: '↻',
    warning: 'Ensure binary logging (MySQL/MariaDB) or WAL (PostgreSQL) is enabled on the source.',
  },
];

const STEPS = ['Choose Target', 'Migration Strategy', 'Options & Confirm'];

// ── Target DB card ────────────────────────────────────────────────────────────
function TargetCard({
  db, source, selected, onClick, isDark,
}: {
  db: ManagedDatabase; source: ManagedDatabase;
  selected: boolean; onClick: () => void; isDark: boolean;
}) {
  const meta       = ENGINE_META[db.engine];
  const compatible = db.engine === source.engine;
  const border     = isDark ? 'rgba(255,255,255,.09)' : '#E5E7EB';

  return (
    <Box
      onClick={compatible ? onClick : undefined}
      sx={{
        p: 2, borderRadius: '12px', cursor: compatible ? 'pointer' : 'not-allowed',
        border: `2px solid ${selected ? meta.color : border}`,
        bgcolor: selected ? `${meta.color}15` : (isDark ? 'rgba(255,255,255,.03)' : '#F9FAFB'),
        opacity: compatible ? 1 : 0.42,
        transition: 'all .14s',
        position: 'relative',
        '&:hover': compatible ? { borderColor: meta.color, bgcolor: `${meta.color}0d` } : {},
      }}
    >
      {selected && (
        <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: '.95rem', color: meta.color }} />
      )}
      {!compatible && (
        <Chip label="Incompatible engine" size="small"
          sx={{ position: 'absolute', top: 8, right: 8, fontSize: '.6rem', bgcolor: 'rgba(239,68,68,.1)', color: '#EF4444' }} />
      )}
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography fontWeight={800} fontSize=".65rem" color="#fff">{meta.icon}</Typography>
        </Box>
        <Box>
          <Typography fontWeight={700} fontSize=".88rem" color={isDark ? '#ffffff' : '#111827'}>{db.name}</Typography>
          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF' }}>
            {db.engine_display} v{db.version}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" gap={1.5} flexWrap="wrap">
        {[`${db.vcpus} vCPU`, `${db.memory_mb >= 1024 ? (db.memory_mb/1024).toFixed(0)+'GB' : db.memory_mb+'MB'}`, db.region].map(s => (
          <Typography key={s} variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>{s}</Typography>
        ))}
      </Box>
    </Box>
  );
}

// ── Strategy card ─────────────────────────────────────────────────────────────
function StrategyCard({
  s, selected, onClick, isDark,
}: { s: StrategyMeta; selected: boolean; onClick: () => void; isDark: boolean }) {
  const border = isDark ? 'rgba(255,255,255,.09)' : '#E5E7EB';
  return (
    <Box onClick={onClick} sx={{
      p: 2, borderRadius: '12px', cursor: 'pointer',
      border: `2px solid ${selected ? s.tagColor : border}`,
      bgcolor: selected ? `${s.tagColor}12` : (isDark ? 'rgba(255,255,255,.03)' : '#F9FAFB'),
      transition: 'all .14s', position: 'relative',
      '&:hover': { borderColor: s.tagColor, bgcolor: `${s.tagColor}08` },
    }}>
      {selected && <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: '.9rem', color: s.tagColor }} />}
      <Box display="flex" alignItems="center" gap={1} mb={.75}>
        <Typography fontWeight={700} fontSize=".9rem" color={isDark ? '#ffffff' : '#111827'}>{s.label}</Typography>
        <Chip size="small" label={s.tag}
          sx={{ height: 16, fontSize: '.6rem', fontWeight: 700, bgcolor: `${s.tagColor}18`, color: s.tagColor }} />
      </Box>
      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280', lineHeight: 1.45, display: 'block' }}>
        {s.desc}
      </Typography>
      {s.warning && (
        <Box display="flex" alignItems="flex-start" gap={.5} mt={.75}>
          <WarningAmberIcon sx={{ fontSize: '.8rem', color: '#F59E0B', mt: '1px', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#F59E0B', fontSize: '.67rem', lineHeight: 1.35 }}>{s.warning}</Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────
function ResultPanel({ result, isDark }: { result: DBMigrationResult; isDark: boolean }) {
  const [copiedId, setCopiedId] = useState(false);
  const copy = () => { navigator.clipboard.writeText(result.migration_id); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500); };
  const border = isDark ? 'rgba(255,255,255,.08)' : '#E5E7EB';
  const isOk   = result.status !== 'failed';
  return (
    <Box>
      <Box display="flex" flexDirection="column" alignItems="center" py={2}>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%',
          bgcolor: isOk ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {isOk
            ? <CheckCircleIcon sx={{ fontSize: '2rem', color: '#10B981' }} />
            : <WarningAmberIcon sx={{ fontSize: '2rem', color: '#EF4444' }} />
          }
        </Box>
        <Typography fontWeight={800} fontSize="1.05rem" color={isDark ? '#ffffff' : '#111827'} textAlign="center">
          {result.dry_run ? 'Dry-Run Complete' : 'Migration Complete'}
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF', maxWidth: 380, textAlign: 'center', mt: .5 }}>
          {result.message}
        </Typography>
      </Box>

      {/* Stats grid */}
      <Box display="grid" gridTemplateColumns="repeat(3,1fr)" gap={1} mb={2}>
        {[
          { label: 'Tables', value: String(result.tables_migrated) },
          { label: 'Rows', value: result.rows_migrated.toLocaleString() },
          { label: 'Duration', value: `${result.duration_s}s` },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${border}` }}>
            <Typography fontWeight={800} fontSize="1.15rem" color={isDark ? '#ffffff' : '#111827'}>{s.value}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Route */}
      <Box sx={{ p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${border}`, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography fontWeight={700} fontSize=".82rem" color={isDark ? '#ffffff' : '#111827'}>{result.source.name}</Typography>
        <ArrowForwardIcon sx={{ fontSize: '.9rem', color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF' }} />
        <Typography fontWeight={700} fontSize=".82rem" color={isDark ? '#ffffff' : '#111827'}>{result.target.name}</Typography>
        <Box flex={1} />
        <Chip size="small" label={result.strategy} sx={{ fontSize: '.65rem', fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,.08)' : '#E5E7EB', color: isDark ? '#ffffff' : '#374151' }} />
      </Box>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5, fontSize: '.82rem' }}>
          {result.warnings.map(w => <div key={w}>{w}</div>)}
        </Alert>
      )}

      {/* Migration ID */}
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF' }}>Migration ID:</Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: isDark ? 'rgba(255,255,255,.6)' : '#374151' }}>{result.migration_id}</Typography>
        <Tooltip title={copiedId ? 'Copied!' : 'Copy ID'}>
          <ContentCopyIcon onClick={copy} sx={{ fontSize: '.78rem', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,.3)' : '#9CA3AF', '&:hover': { color: isDark ? '#ffffff' : '#374151' } }} />
        </Tooltip>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  open:    boolean;
  source:  ManagedDatabase;
  onClose: () => void;
}

const MigrateDatabaseModal: React.FC<Props> = ({ open, source, onClose }) => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const border = isDark ? 'rgba(255,255,255,.09)' : '#E5E7EB';

  const [step,     setStep]     = useState(0);
  const [targets,  setTargets]  = useState<ManagedDatabase[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [target,   setTarget]   = useState<ManagedDatabase | null>(null);
  const [strategy, setStrategy] = useState<DBMigrationStrategy>('full_copy');
  const [tables,   setTables]   = useState('');
  const [truncate, setTruncate] = useState(false);
  const [dryRun,   setDryRun]   = useState(false);
  const [running,  setRunning]  = useState(false);
  const [error,    setError]    = useState('');
  const [result,   setResult]   = useState<DBMigrationResult | null>(null);

  // Load all user databases whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTarget(null); setStep(0); setResult(null); setError('');
    databaseApi.list()
      .then(r => setTargets(r.data.filter(d => d.id !== source.id)))
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));
  }, [open, source.id]);

  const canNext = step === 0 ? !!target : step === 1 ? !!strategy : true;

  const handleSubmit = async () => {
    if (!target) return;
    setRunning(true); setError('');
    try {
      const res = await databaseApi.migrate(source.id, {
        target_id:       target.id,
        strategy,
        tables:          tables.split(',').map(t => t.trim()).filter(Boolean),
        truncate_target: truncate,
        dry_run:         dryRun,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Migration failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleClose = () => { setStep(0); setResult(null); setError(''); onClose(); };

  const sourceMeta = ENGINE_META[source.engine];
  const targetMeta = target ? ENGINE_META[target.engine] : null;
  const selectedStrategy = STRATEGIES.find(s => s.id === strategy)!;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { bgcolor: isDark ? '#0D1826' : '#ffffff', borderRadius: '14px', border: `1px solid ${border}`, maxHeight: '92vh' } }}>

      {/* Header */}
      <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: sourceMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography fontWeight={800} fontSize=".7rem" color="#fff">{sourceMeta.icon}</Typography>
          </Box>
          <Box>
            <Typography fontWeight={800} fontSize="1rem" color={isDark ? '#ffffff' : '#111827'}>
              Migrate Database
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF' }}>
              Source: <strong>{source.name}</strong> ({source.engine_display} v{source.version})
            </Typography>
          </Box>
        </Box>
        {!result && (
          <Stepper activeStep={step} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '.75rem', color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF', mt: .5, '&.Mui-active': { color: isDark ? '#ffffff' : '#111827', fontWeight: 700 } }, '& .MuiStepIcon-root': { color: isDark ? 'rgba(255,255,255,.15)' : '#E5E7EB', '&.Mui-active': { color: '#153d75' }, '&.Mui-completed': { color: '#10B981' } } }}>

            {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        )}
      </DialogTitle>
      <Divider sx={{ mt: 2, borderColor: border }} />

      <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto' }}>
        {result ? (
          <ResultPanel result={result} isDark={isDark} />
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* ── Step 0: Choose target ── */}
            {step === 0 && (
              <Box>
                <Typography variant="body2" fontWeight={600} color={isDark ? '#ffffff' : '#111827'} mb={.5}>
                  Choose destination database
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF', display: 'block', mb: 2 }}>
                  Only databases with the same engine as the source are compatible. Incompatible databases are greyed out.
                </Typography>
                {loading ? (
                  <Stack spacing={1.5}>
                    {[1,2,3].map(k => <Skeleton key={k} height={88} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', borderRadius: 2 }} />)}
                  </Stack>
                ) : targets.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <StorageIcon sx={{ fontSize: '2.5rem', color: isDark ? 'rgba(255,255,255,.15)' : '#E5E7EB', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>
                      No other databases found. Create a target database first.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {targets.map(db => (
                      <TargetCard key={db.id} db={db} source={source} selected={target?.id === db.id} onClick={() => setTarget(db)} isDark={isDark} />
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {/* ── Step 1: Strategy ── */}
            {step === 1 && (
              <Box>
                <Typography variant="body2" fontWeight={600} color={isDark ? '#ffffff' : '#111827'} mb={.5}>
                  Select migration strategy
                </Typography>
                <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.5)' : '#9CA3AF', display: 'block', mb: 2 }}>
                  Route: <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{source.name}</strong>
                  <ArrowForwardIcon sx={{ fontSize: '.8rem', mx: .5, verticalAlign: 'middle', color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }} />
                  <strong style={{ color: isDark ? '#ffffff' : '#111827' }}>{target?.name}</strong>
                </Typography>
                <Stack spacing={1.5}>
                  {STRATEGIES.map(s => (
                    <StrategyCard key={s.id} s={s} selected={strategy === s.id} onClick={() => setStrategy(s.id)} isDark={isDark} />
                  ))}
                </Stack>
              </Box>
            )}

            {/* ── Step 2: Options + summary ── */}
            {step === 2 && (
              <Box>
                <Typography variant="body2" fontWeight={600} color={isDark ? '#ffffff' : '#111827'} mb={2}>
                  Options &amp; review
                </Typography>

                {/* Summary chips */}
                <Box sx={{ p: 2, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '10px', border: `1px solid ${border}`, mb: 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.25} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={.75}>
                      <Box sx={{ width: 22, height: 22, borderRadius: '5px', bgcolor: sourceMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography fontWeight={800} fontSize=".5rem" color="#fff">{sourceMeta.icon}</Typography>
                      </Box>
                      <Typography fontWeight={700} fontSize=".85rem" color={isDark ? '#ffffff' : '#111827'}>{source.name}</Typography>
                    </Box>
                    <ArrowForwardIcon sx={{ fontSize: '.85rem', color: isDark ? 'rgba(255,255,255,.3)' : '#9CA3AF' }} />
                    {targetMeta && target && (
                      <Box display="flex" alignItems="center" gap={.75}>
                        <Box sx={{ width: 22, height: 22, borderRadius: '5px', bgcolor: targetMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography fontWeight={800} fontSize=".5rem" color="#fff">{targetMeta.icon}</Typography>
                        </Box>
                        <Typography fontWeight={700} fontSize=".85rem" color={isDark ? '#ffffff' : '#111827'}>{target.name}</Typography>
                      </Box>
                    )}
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip size="small" label={selectedStrategy.label}
                      sx={{ bgcolor: `${selectedStrategy.tagColor}18`, color: selectedStrategy.tagColor, fontWeight: 700, fontSize: '.68rem' }} />
                    <Chip size="small" label={source.engine_display}
                      sx={{ bgcolor: isDark ? 'rgba(255,255,255,.08)' : '#E5E7EB', color: isDark ? '#ffffff' : '#374151', fontSize: '.68rem' }} />
                    <Chip size="small" label={`${source.storage_gb} GB → ${target?.storage_gb} GB`}
                      sx={{ bgcolor: isDark ? 'rgba(255,255,255,.08)' : '#E5E7EB', color: isDark ? '#ffffff' : '#374151', fontSize: '.68rem' }} />
                  </Box>
                </Box>

                {/* Tables filter */}
                <TextField
                  fullWidth size="small" label="Tables / Collections to migrate"
                  placeholder="Leave empty to migrate all, or: users, orders, products"
                  value={tables} onChange={e => setTables(e.target.value)}
                  helperText="Comma-separated list. Empty = migrate all tables."
                  sx={{ mb: 2,
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', '& fieldset': { borderColor: border }, '&:hover fieldset': { borderColor: '#153d75' }, '&.Mui-focused fieldset': { borderColor: '#153d75' } },
                    '& .MuiInputLabel-root': { color: isDark ? 'rgba(255,255,255,.5)' : '#6B7280', '&.Mui-focused': { color: '#153d75' } },
                    '& .MuiInputBase-input': { color: isDark ? '#ffffff' : '#111827' },
                    '& .MuiFormHelperText-root': { color: isDark ? 'rgba(255,255,255,.35)' : '#9CA3AF' },
                  }}
                />

                {/* Toggles */}
                <Stack spacing={.75} mb={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '9px', border: `1px solid ${border}` }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} color={isDark ? '#ffffff' : '#111827'}>Truncate target first</Typography>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>Drop all existing rows on the target before migrating</Typography>
                    </Box>
                    <Switch checked={truncate} onChange={e => setTruncate(e.target.checked)}
                      size="small" sx={{ '& .MuiSwitch-thumb': { bgcolor: truncate ? '#EF4444' : undefined }, '& .MuiSwitch-track': { bgcolor: truncate ? 'rgba(239,68,68,.35) !important' : undefined } }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,.04)' : '#F9FAFB', borderRadius: '9px', border: `1px solid ${border}` }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} color={isDark ? '#ffffff' : '#111827'}>Dry run</Typography>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,.4)' : '#9CA3AF' }}>Validate the migration without writing any data</Typography>
                    </Box>
                    <Switch checked={dryRun} onChange={e => setDryRun(e.target.checked)} size="small"
                      sx={{ '& .MuiSwitch-thumb': { bgcolor: dryRun ? '#10B981' : undefined }, '& .MuiSwitch-track': { bgcolor: dryRun ? 'rgba(16,185,129,.35) !important' : undefined } }} />
                  </Box>
                </Stack>

                {truncate && (
                  <Alert severity="warning" sx={{ mt: 1, fontSize: '.8rem' }}>
                    All existing data in <strong>{target?.name}</strong> will be permanently deleted before migration.
                  </Alert>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: border }} />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,.55)' : '#6B7280' }}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <>
            {step > 0 && (
              <Button onClick={() => setStep(s => s - 1)} sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,.7)' : '#374151' }}>
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button variant="contained" disabled={!canNext} onClick={() => setStep(s => s + 1)}
                sx={{ bgcolor: '#153d75', '&:hover': { bgcolor: '#0f2d5a' }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
                Continue
              </Button>
            ) : (
              <Button variant="contained" disabled={running} onClick={handleSubmit}
                startIcon={running ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                sx={{ bgcolor: dryRun ? '#10B981' : '#153d75', '&:hover': { bgcolor: dryRun ? '#059669' : '#0f2d5a' }, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
                {running ? 'Migrating…' : dryRun ? 'Run Dry Test' : 'Start Migration'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MigrateDatabaseModal;
