import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import StopIcon from '@mui/icons-material/Stop';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import {
  getPipeline, listPipelineJobs, getJobLogs, cancelPipeline,
  type BackendPipeline, type BackendPipelineJob,
} from '../../services/pipelinesApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const t = dashboardTokens.colors;

const STATUS_CONFIG = {
  success: { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.12)', label: 'Success', icon: <CheckCircleIcon sx={{ fontSize: '1rem' }} /> },
  failed: { color: dashboardSemanticColors.danger, bg: 'rgba(239,68,68,.12)', label: 'Failed', icon: <CancelIcon sx={{ fontSize: '1rem' }} /> },
  running: { color: dashboardSemanticColors.info, bg: 'rgba(21,61,117,.12)', label: 'Running', icon: <HourglassTopIcon sx={{ fontSize: '1rem' }} /> },
  pending: { color: dashboardTokens.colors.textSecondary, bg: 'rgba(100,116,139,.12)', label: 'Pending', icon: <HourglassTopIcon sx={{ fontSize: '1rem', opacity: 0.5 }} /> },
};

interface PipelineDetailProps {
  pipelineId: string;
  open: boolean;
  onClose: () => void;
}

const PipelineDetail: React.FC<PipelineDetailProps> = ({ pipelineId, open, onClose }) => {
  const [pipeline, setPipeline] = useState<BackendPipeline | null>(null);
  const [jobs, setJobs] = useState<BackendPipelineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BackendPipelineJob | null>(null);
  const [jobLogs, setJobLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  const loadPipeline = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const [pipe, jobList] = await Promise.all([
        getPipeline(pipelineId),
        listPipelineJobs(pipelineId),
      ]);
      setPipeline(pipe);
      setJobs(jobList);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    if (open && pipelineId) loadPipeline();
  }, [open, pipelineId, loadPipeline]);

  const handleViewLogs = async (job: BackendPipelineJob) => {
    setSelectedJob(job);
    setLogsOpen(true);
    setLogsLoading(true);
    setJobLogs('');
    try {
      const logs = await getJobLogs(job.id);
      setJobLogs(logs.map((l: any) => l.log || l.log_output || '').join('\n'));
    } catch {
      setJobLogs('[error] Could not load job logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!pipelineId) return;
    try {
      await cancelPipeline(pipelineId);
      loadPipeline();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 600, bgcolor: t.surface } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      </Drawer>
    );
  }

  if (!pipeline) return null;

  const pipelineCfg = STATUS_CONFIG[pipeline.status as keyof typeof STATUS_CONFIG];

  // Map BackendPipeline fields to display labels
  const pipelineDisplay = {
    pipelineId: pipeline.id,
    status:     pipeline.status,
    branch:     pipeline.branch,
    triggeredBy: pipeline.triggered_by,
    startedAt:  pipeline.started_at,
    project:    pipeline.project,
    repo:       pipeline.repo,
    pipelineName: pipeline.pipeline_name,
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 600, bgcolor: t.surface } }}
      >
        <Box sx={{ p: 3, fontFamily: FONT }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: t.textPrimary }}>
              Pipeline {pipelineDisplay.pipelineId}
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Status Card */}
          <Card sx={{ mb: 3, border: `1px solid ${t.border}`, boxShadow: 'none', borderRadius: '10px' }}>
            <CardContent sx={{ p: '20px !important' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pipelineCfg.icon}
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: pipelineCfg.color }}>
                    {pipelineCfg.label}
                  </Typography>
                  <Chip label={pipelineDisplay.status} size="small" sx={{ bgcolor: pipelineCfg.bg, color: pipelineCfg.color, fontWeight: 600 }} />
                </Box>

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Project:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{pipelineDisplay.project}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Repository:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{pipelineDisplay.repo}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Branch:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{pipelineDisplay.branch}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Pipeline:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{pipelineDisplay.pipelineName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Triggered by:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{pipelineDisplay.triggeredBy}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: t.textSecondary }}>Started:</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{new Date(pipelineDisplay.startedAt).toLocaleString()}</Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={handleCancel}
              sx={{ borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger, '&:hover': { borderColor: dashboardSemanticColors.danger, bgcolor: `${dashboardSemanticColors.danger}0a` } }}
            >
              Cancel Pipeline
            </Button>
          </Stack>

          {/* Jobs Table */}
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary, mb: 2 }}>
            Jobs
          </Typography>
          <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: t.surfaceSubtle }}>
                  <TableCell sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', borderColor: t.border, py: 1.5 }}>Job</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', borderColor: t.border, py: 1.5 }}>Status</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', borderColor: t.border, py: 1.5 }}>Duration</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontSize: '.72rem', fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em', borderColor: t.border, py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => {
                  const cfg = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG];
                  const duration = job.finished_at && job.started_at ?
                    Math.round((new Date(job.finished_at).getTime() - new Date(job.started_at).getTime()) / 1000) + 's' :
                    job.started_at ? 'Running...' : '—';

                  return (
                    <TableRow key={job.id} sx={{ '& td': { borderColor: t.border } }}>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '.85rem', fontWeight: 600, color: t.textPrimary, py: 1.5 }}>
                        {job.name}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: cfg.color }}>
                          {cfg.icon}
                          <Typography sx={{ fontSize: '.8rem', fontWeight: 600, color: cfg.color, fontFamily: FONT }}>
                            {cfg.label}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: '.8rem', color: t.textSecondary, py: 1.5 }}>
                        {duration}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewLogs(job)}
                          sx={{ fontSize: '.7rem', fontFamily: FONT, textTransform: 'none', borderColor: t.border, color: t.textSecondary, borderRadius: '6px', py: 0.25, '&:hover': { borderColor: dashboardTokens.colors.brandPrimary, color: dashboardTokens.colors.brandPrimary } }}
                        >
                          View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Drawer>

      {/* Logs Drawer */}
      <Drawer
        anchor="right"
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        PaperProps={{ sx: { width: 600, bgcolor: '#0d1117' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.border}` }}>
          <Typography sx={{ fontWeight: 700, color: '#e6edf3', fontFamily: FONT, fontSize: '.9rem', flex: 1 }}>
            Job Logs · {selectedJob?.name}
          </Typography>
          <IconButton onClick={() => setLogsOpen(false)} sx={{ color: '#8b949e' }}>
            <CloseIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, fontFamily: 'monospace', fontSize: '.78rem', color: '#e6edf3', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflow: 'auto', flex: 1 }}>
          {logsLoading ? 'Loading logs…' : (jobLogs || '— No log output available —')}
          {!logsLoading && <Box component="span" sx={{ display: 'inline-block', width: 8, height: '1em', bgcolor: '#153d75', animation: 'blink 1s step-end infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } } }} />}
        </Box>
      </Drawer>
    </>
  );
};

export default PipelineDetail;
