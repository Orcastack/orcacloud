import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Stepper, Step, StepLabel,
  TextField, MenuItem, Button, Chip, Stack, Alert, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox,
  FormControlLabel, Switch, LinearProgress, Divider,
  IconButton, Collapse,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kubernetesApi,
  KubeConfig,
  ManifestFile,
  ScanResult,
  KubeSyncRun,
} from '../services/kubernetesApi';

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = ['Configure', 'Scan Results', 'Confirm', 'Apply'];

// ─── Governance badge ─────────────────────────────────────────────────────────

const WarnBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <Chip
      size="small"
      icon={<WarningAmberIcon fontSize="small" />}
      label={`${count} warning${count !== 1 ? 's' : ''}`}
      color="warning"
      variant="outlined"
    />
  ) : (
    <Chip
      size="small"
      icon={<CheckCircleOutlineIcon fontSize="small" />}
      label="No warnings"
      color="success"
      variant="outlined"
    />
  );

// ─── File row ─────────────────────────────────────────────────────────────────

const FileRow: React.FC<{
  file: ManifestFile;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ file, checked, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          <Checkbox checked={checked} onChange={e => onChange(e.target.checked)} />
        </TableCell>
        <TableCell sx={{ fontFamily: 'monospace', fontSize: '.82rem' }}>
          {file.path}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {Array.from(new Set(file.resources.map(r => r.kind))).map(k => (
              <Chip key={k} label={k} size="small" variant="outlined" />
            ))}
          </Stack>
        </TableCell>
        <TableCell>{file.resources.length}</TableCell>
        <TableCell>
          <WarnBadge count={file.warnings.length} />
        </TableCell>
        <TableCell>
          {file.warnings.length > 0 && (
            <IconButton size="small" onClick={() => setOpen(v => !v)}>
              {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      {file.warnings.length > 0 && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0 }}>
            <Collapse in={open}>
              <Box sx={{ bgcolor: 'warning.50', px: 3, py: 1 }}>
                {file.warnings.map((w, i) => (
                  <Typography key={i} variant="caption" display="block" color="warning.dark">
                    [WARN] {w}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const KubernetesSetupPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Existing config (if any)
  const [existingConfig, setExistingConfig] = useState<KubeConfig | null>(null);

  // Step 1 — form state
  const [form, setForm] = useState({
    project_id:   projectId ?? '',
    project_name: '',
    environment:  'development',
    cluster_id:   '',
    cluster_name: '',
    git_provider: 'github',
    git_repo:     '',
    git_branch:   'main',
    git_path:     'k8s/',
    auto_apply:   false,
    git_token:    '',  // not persisted — sent only during scan/apply
  });

  // Step 2 — scan results
  const [scanResult, setScanResult]     = useState<ScanResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Step 4 — apply result
  const [syncRun, setSyncRun] = useState<KubeSyncRun | null>(null);
  const [applyProgress, setApplyProgress] = useState(0);

  // Load existing config on mount
  useEffect(() => {
    if (!projectId) return;
    kubernetesApi
      .listConfigs({ project_id: projectId })
      .then(res => {
        const list: KubeConfig[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.results ?? []);
        if (list.length > 0) {
          const cfg = list[0];
          setExistingConfig(cfg);
          setForm(f => ({
            ...f,
            project_id:   cfg.project_id,
            project_name: cfg.project_name ?? f.project_name,
            environment:  cfg.environment,
            cluster_id:   cfg.cluster_id ?? '',
            cluster_name: cfg.cluster_name ?? '',
            git_provider: cfg.git_provider,
            git_repo:     cfg.git_repo,
            git_branch:   cfg.git_branch,
            git_path:     cfg.git_path,
            auto_apply:   cfg.auto_apply ?? false,
          }));
        }
      })
      .catch(() => {});
  }, [projectId]);

  const handleField = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Step 1 → Save config + scan ──────────────────────────────────────────

  const handleSaveAndScan = async () => {
    setError('');
    setLoading(true);
    try {
      const cfgPayload = {
        project_id:   form.project_id,
        project_name: form.project_name,
        environment:  form.environment as any,
        cluster_id:   form.cluster_id,
        cluster_name: form.cluster_name,
        git_provider: form.git_provider as any,
        git_repo:     form.git_repo,
        git_branch:   form.git_branch,
        git_path:     form.git_path,
        auto_apply:   form.auto_apply,
      };
      const cfgRes = await kubernetesApi.createOrUpdateConfig(cfgPayload);
      setExistingConfig(cfgRes.data);

      // Trigger scan
      const scanRes = await kubernetesApi.scanRepo(cfgRes.data.id, {
        git_token: form.git_token,
      });
      setScanResult(scanRes.data);

      // Pre-select all files
      setSelectedFiles(new Set(scanRes.data.files.map(f => f.path)));

      setActiveStep(1);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 → proceed to confirm ──────────────────────────────────────────

  const handleConfirm = () => setActiveStep(2);

  // ── Step 3 → Apply ───────────────────────────────────────────────────────

  const handleApply = async () => {
    if (!existingConfig || !scanResult) return;
    setError('');
    setLoading(true);
    setApplyProgress(10);
    setActiveStep(3);

    const interval = setInterval(() =>
      setApplyProgress(p => Math.min(p + 15, 85)), 800);

    try {
      const res = await kubernetesApi.applyManifests(existingConfig.id, {
        commit_sha:     scanResult.commit_sha,
        selected_files: Array.from(selectedFiles),
        git_token:      form.git_token,
      });
      setSyncRun(res.data);
      setApplyProgress(100);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Apply failed');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const toggleFile = (path: string, checked: boolean) =>
    setSelectedFiles(prev => {
      const next = new Set(prev);
      checked ? next.add(path) : next.delete(path);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelectedFiles(
      checked ? new Set(scanResult?.files.map(f => f.path) ?? []) : new Set()
    );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
        Kubernetes Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect your project to a cluster and Git repository, then confirm and apply manifests.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ── STEP 0 — Configure ── */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Configure Kubernetes Connection
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField label="Project Name" value={form.project_name}
                onChange={e => handleField('project_name', e.target.value)} fullWidth />
              <TextField label="Environment" value={form.environment}
                onChange={e => handleField('environment', e.target.value)}
                select fullWidth>
                {['development', 'staging', 'production'].map(e => (
                  <MenuItem key={e} value={e}>{e}</MenuItem>
                ))}
              </TextField>
              <TextField label="Cluster Name" value={form.cluster_name}
                onChange={e => handleField('cluster_name', e.target.value)}
                helperText="Kubernetes context name or cluster identifier" fullWidth />
              <TextField label="Cluster ID (optional)" value={form.cluster_id}
                onChange={e => handleField('cluster_id', e.target.value)} fullWidth />

              <Divider sx={{ gridColumn: '1 / -1' }} />

              <TextField label="Git Provider" value={form.git_provider}
                onChange={e => handleField('git_provider', e.target.value)}
                select fullWidth>
                {['github', 'gitlab', 'bitbucket', 'other'].map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
              <TextField label="Repository (owner/repo)" value={form.git_repo}
                onChange={e => handleField('git_repo', e.target.value)}
                placeholder="myorg/my-app" fullWidth />
              <TextField label="Branch" value={form.git_branch}
                onChange={e => handleField('git_branch', e.target.value)} fullWidth />
              <TextField label="Manifests Path" value={form.git_path}
                onChange={e => handleField('git_path', e.target.value)}
                helperText="Directory inside repo containing YAML files" fullWidth />
              <TextField label="Git Access Token (for private repos)" value={form.git_token}
                onChange={e => handleField('git_token', e.target.value)}
                type="password" helperText="Not stored — used only for this session" fullWidth />

              <Box sx={{ gridColumn: '1 / -1' }}>
                <FormControlLabel
                  control={
                    <Switch checked={form.auto_apply}
                      onChange={e => handleField('auto_apply', e.target.checked)} />
                  }
                  label="Auto-apply on CI/CD trigger (skip human confirmation)"
                />
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleSaveAndScan}
                disabled={loading || !form.git_repo}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}>
                {loading ? 'Scanning…' : 'Save & Scan Repository'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1 — Scan Results ── */}
      {activeStep === 1 && scanResult && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Discovered Manifests
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={`Commit: ${scanResult.commit_sha.slice(0, 8)}`} size="small" />
                <Chip label={`Branch: ${scanResult.branch}`} size="small" variant="outlined" />
                <Chip label={`${scanResult.total_files} files`} size="small" color="primary" variant="outlined" />
                <WarnBadge count={scanResult.all_warnings.length} />
              </Stack>
            </Stack>

            {/* Summary chips */}
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              {Object.entries(scanResult.summary)
                .filter(([k]) => k !== 'total_warnings')
                .map(([kind, count]) => (
                  <Chip key={kind} label={`${kind}: ${count}`} size="small"
                    color={kind === 'Deployment' ? 'primary' : 'default'} />
                ))}
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedFiles.size > 0 && selectedFiles.size < scanResult.files.length}
                      checked={selectedFiles.size === scanResult.files.length}
                      onChange={e => toggleAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Resource Types</TableCell>
                  <TableCell>Resources</TableCell>
                  <TableCell>Governance</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {scanResult.files.map(f => (
                  <FileRow key={f.path} file={f}
                    checked={selectedFiles.has(f.path)}
                    onChange={(c) => toggleFile(f.path, c)} />
                ))}
              </TableBody>
            </Table>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleConfirm}
                disabled={selectedFiles.size === 0}>
                Proceed to Confirmation ({selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''})
              </Button>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>Back</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2 — Confirm ── */}
      {activeStep === 2 && scanResult && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Confirm Apply
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Namespace</Typography>
                <Typography fontWeight={700}>{existingConfig?.derived_namespace}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Commit</Typography>
                <Typography fontFamily="monospace" fontWeight={700}>{scanResult.commit_sha.slice(0, 12)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Files to Apply</Typography>
                <Typography fontWeight={700}>{selectedFiles.size}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Resources</Typography>
                <Typography fontWeight={700}>
                  {scanResult.files
                    .filter(f => selectedFiles.has(f.path))
                    .reduce((s, f) => s + f.resources.length, 0)}
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Files</Typography>
            {Array.from(selectedFiles).map(p => (
              <Typography key={p} variant="body2" fontFamily="monospace" color="text.secondary">
                › {p}
              </Typography>
            ))}

            {scanResult.all_warnings.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">
                  {scanResult.all_warnings.length} governance warning{scanResult.all_warnings.length !== 1 ? 's' : ''} detected.
                  Review before applying to production.
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button variant="contained" color="success" onClick={handleApply} disabled={loading}>
                {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                Apply to Cluster
              </Button>
              <Button variant="outlined" onClick={() => setActiveStep(1)}>Back</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3 — Apply Progress / Results ── */}
      {activeStep === 3 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Apply Progress
            </Typography>

            <LinearProgress
              variant="determinate"
              value={applyProgress}
              color={syncRun?.status === 'failed' ? 'error' : 'success'}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />

            {loading && !syncRun && (
              <Typography color="text.secondary">Applying manifests to cluster…</Typography>
            )}

            {syncRun && (
              <>
                <Stack direction="row" spacing={1} mb={2}>
                  <Chip
                    label={syncRun.status.toUpperCase()}
                    color={
                      syncRun.status === 'success' ? 'success' :
                      syncRun.status === 'partial' ? 'warning' : 'error'
                    }
                  />
                  <Chip label={`${syncRun.files_applied.length} / ${syncRun.files_selected.length} files applied`} variant="outlined" />
                  {syncRun.duration_seconds != null && (
                    <Chip label={`${syncRun.duration_seconds}s`} variant="outlined" />
                  )}
                </Stack>

                {syncRun.status === 'success' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    All manifests applied successfully to namespace{' '}
                    <strong>{existingConfig?.derived_namespace}</strong>.
                  </Alert>
                )}

                {syncRun.status === 'partial' && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Partial apply — some files failed. Review logs below.
                  </Alert>
                )}

                {syncRun.status === 'failed' && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Apply failed. {syncRun.error}
                  </Alert>
                )}

                {syncRun.governance_issues.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" mb={0.5}>
                      {syncRun.governance_issues.length} governance issues recorded:
                    </Typography>
                    {syncRun.governance_issues.slice(0, 5).map((w, i) => (
                      <Typography key={i} variant="caption" display="block">[WARN] {w}</Typography>
                    ))}
                    {syncRun.governance_issues.length > 5 && (
                      <Typography variant="caption">+ {syncRun.governance_issues.length - 5} more…</Typography>
                    )}
                  </Alert>
                )}

                <Typography variant="subtitle2" mb={0.5}>Apply Logs</Typography>
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'grey.900', color: 'grey.100',
                    p: 2, borderRadius: 2, fontSize: '.75rem',
                    overflow: 'auto', maxHeight: 320,
                  }}
                >
                  {syncRun.logs || '(no output)'}
                </Box>
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              {existingConfig && (
                <Button variant="contained"
                  onClick={() => navigate(`/developer/Dashboard/kubernetes/monitor/${existingConfig.id}`)}>
                  Open Kubernetes Monitor
                </Button>
              )}
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Back to Kubernetes
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default KubernetesSetupPage;
