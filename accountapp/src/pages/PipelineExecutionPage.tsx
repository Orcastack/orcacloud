/**
 * PipelineExecutionPage — Pipeline Execution Dashboard
 *
 * Per-run view (Harness-style):
 *  • Live execution graph (SVG nodes that update in real time via polling)
 *  • Node-level log viewer (searchable, downloadable)
 *  • Artifacts panel
 *  • Stage/step durations
 *  • Error messages
 *  • Cancel / re-trigger actions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  IconButton, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import StopIcon         from '@mui/icons-material/Stop';
import RefreshIcon      from '@mui/icons-material/Refresh';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import DownloadIcon     from '@mui/icons-material/Download';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import ErrorIcon        from '@mui/icons-material/Error';
import HourglassIcon    from '@mui/icons-material/HourglassEmpty';
import SkipNextIcon     from '@mui/icons-material/SkipNext';
import PendingIcon      from '@mui/icons-material/Pending';
import AccessTimeIcon   from '@mui/icons-material/AccessTime';
import BugReportIcon    from '@mui/icons-material/BugReport';
import FolderZipIcon    from '@mui/icons-material/FolderZip';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  dashboardCardSx,
  dashboardSemanticColors, dashboardTokens,
} from '../styles/dashboardDesignSystem';
import {
  getPipelineRun, getRunGraph, getRunNodeLogs, cancelPipelineRun,
  getRunArtifacts, triggerDefinition,
  type PipelineRun, type PipelineRunNode, type PipelineRunArtifact, type NodeStatus,
} from '../services/pipelinesApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const t    = dashboardTokens.colors;

const POLL_INTERVAL = 3000; // ms

/* ───── Node status config ────────────────────────────────────────────── */

type StatusCfg = { color: string; bg: string; border: string; icon: React.ReactNode; label: string };

const STATUS: Record<NodeStatus, StatusCfg> = {
  pending:   { color: '#6B7280', bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.3)', icon: <PendingIcon sx={{ fontSize: 14 }} />,        label: 'Pending' },
  running:   { color: dashboardSemanticColors.info,    bg: 'rgba(21,61,117,.12)',  border: dashboardSemanticColors.info,    icon: <CircularProgress size={12} sx={{ color: dashboardSemanticColors.info }} />, label: 'Running' },
  success:   { color: dashboardSemanticColors.success, bg: 'rgba(34,197,94,.1)',   border: dashboardSemanticColors.success, icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,                                  label: 'Success' },
  failed:    { color: dashboardSemanticColors.danger,  bg: 'rgba(239,68,68,.1)',   border: dashboardSemanticColors.danger,  icon: <ErrorIcon sx={{ fontSize: 14 }} />,                                        label: 'Failed' },
  skipped:   { color: '#6B7280', bg: 'rgba(107,114,128,.05)', border: 'rgba(107,114,128,.2)', icon: <SkipNextIcon sx={{ fontSize: 14 }} />,        label: 'Skipped' },
  waiting:   { color: '#F59E0B', bg: 'rgba(245,158,11,.1)',   border: '#F59E0B',               icon: <HourglassIcon sx={{ fontSize: 14 }} />,        label: 'Waiting' },
  cancelled: { color: '#6B7280', bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.3)', icon: <StopIcon sx={{ fontSize: 14 }} />,             label: 'Cancelled' },
};

const RUN_STATUS: Record<string, StatusCfg> = STATUS as any;

function fmtDuration(s: number | null | undefined): string {
  if (s == null) return '—';
  if (s < 60)    return `${Math.round(s)}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return `${Math.round(d)}s ago`;
  if (d < 3600)  return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

/* ───── Execution Graph (SVG) ─────────────────────────────────────────── */

interface GraphProps {
  nodes: PipelineRunNode[];
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
}

const STAGE_W = 160;
const STAGE_H = 54;
const STEP_W  = 140;
const STEP_H  = 40;
const H_GAP   = 60;
const V_GAP   = 12;

const ExecutionGraph: React.FC<GraphProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  const stages = nodes.filter((n) => n.node_type === 'stage').sort((a, b) => a.order - b.order);
  const stepsByStage: Record<string, PipelineRunNode[]> = {};
  nodes.filter((n) => n.node_type === 'step').forEach((s) => {
    (stepsByStage[s.stage_name] ??= []).push(s);
  });

  // layout: each stage column, steps stacked below
  const cols: Array<{ stage: PipelineRunNode; steps: PipelineRunNode[] }> = stages.map((s) => ({
    stage: s,
    steps: (stepsByStage[s.stage_name] ?? []).sort((a, b) => a.order - b.order),
  }));

  const colW = Math.max(STAGE_W, STEP_W) + H_GAP;
  const maxSteps = Math.max(0, ...cols.map((c) => c.steps.length));
  const svgH = STAGE_H + V_GAP + maxSteps * (STEP_H + V_GAP) + 32;
  const svgW = cols.length * colW + H_GAP;

  if (cols.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: t.textTertiary }}>No graph data yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto', overflowY: 'visible' }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: FONT }}>
        {cols.map((col, colIdx) => {
          const stageX = H_GAP / 2 + colIdx * colW;
          const stageY = 16;
          const sc     = STATUS[col.stage.status] ?? STATUS.pending;
          const isSelectedStage = selectedNodeId === col.stage.id;

          return (
            <g key={col.stage.id}>
              {/* connector line to next stage */}
              {colIdx < cols.length - 1 && (
                <line
                  x1={stageX + STAGE_W} y1={stageY + STAGE_H / 2}
                  x2={stageX + STAGE_W + H_GAP} y2={stageY + STAGE_H / 2}
                  stroke={sc.border} strokeWidth={2} strokeDasharray={col.stage.status === 'pending' ? '4 3' : undefined}
                />
              )}

              {/* stage box */}
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectNode(col.stage.id)}
              >
                <rect
                  x={stageX} y={stageY}
                  width={STAGE_W} height={STAGE_H}
                  rx={8}
                  fill={sc.bg}
                  stroke={isSelectedStage ? sc.color : sc.border}
                  strokeWidth={isSelectedStage ? 2 : 1}
                />
                {/* status dot */}
                <circle cx={stageX + 18} cy={stageY + STAGE_H / 2} r={6} fill={sc.color} />
                {col.stage.status === 'running' && (
                  <circle cx={stageX + 18} cy={stageY + STAGE_H / 2} r={8} fill="none" stroke={sc.color} strokeWidth={1.5} opacity={0.5}>
                    <animate attributeName="r" from="6" to="11" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <text x={stageX + 32} y={stageY + STAGE_H / 2 - 6} fontSize={11} fontWeight={700} fill={sc.color}>
                  {col.stage.stage_name.length > 14 ? col.stage.stage_name.slice(0, 13) + '…' : col.stage.stage_name}
                </text>
                <text x={stageX + 32} y={stageY + STAGE_H / 2 + 9} fontSize={10} fill={sc.color} opacity={0.8}>
                  {sc.label}{col.stage.duration_s != null ? ` · ${fmtDuration(col.stage.duration_s)}` : ''}
                </text>
              </g>

              {/* step boxes */}
              {col.steps.map((step, stepIdx) => {
                const sx2 = stageX + (STAGE_W - STEP_W) / 2;
                const sy2 = stageY + STAGE_H + V_GAP + stepIdx * (STEP_H + V_GAP);
                const ss  = STATUS[step.status] ?? STATUS.pending;
                const isSel = selectedNodeId === step.id;
                return (
                  <g key={step.id} style={{ cursor: 'pointer' }} onClick={() => onSelectNode(step.id)}>
                    {/* vertical connector from stage to first step */}
                    {stepIdx === 0 && (
                      <line
                        x1={stageX + STAGE_W / 2} y1={stageY + STAGE_H}
                        x2={sx2 + STEP_W / 2} y2={sy2}
                        stroke={ss.border} strokeWidth={1.5} strokeDasharray={step.status === 'pending' ? '3 2' : undefined}
                      />
                    )}
                    {/* connector between steps */}
                    {stepIdx > 0 && (
                      <line
                        x1={sx2 + STEP_W / 2} y1={sy2 - V_GAP}
                        x2={sx2 + STEP_W / 2} y2={sy2}
                        stroke={ss.border} strokeWidth={1.5} strokeDasharray={step.status === 'pending' ? '3 2' : undefined}
                      />
                    )}
                    <rect
                      x={sx2} y={sy2}
                      width={STEP_W} height={STEP_H}
                      rx={6}
                      fill={ss.bg}
                      stroke={isSel ? ss.color : ss.border}
                      strokeWidth={isSel ? 2 : 1}
                    />
                    <circle cx={sx2 + 14} cy={sy2 + STEP_H / 2} r={4} fill={ss.color} />
                    <text x={sx2 + 26} y={sy2 + STEP_H / 2 - 4} fontSize={10} fontWeight={600} fill={ss.color}>
                      {step.step_name.length > 16 ? step.step_name.slice(0, 15) + '…' : step.step_name}
                    </text>
                    <text x={sx2 + 26} y={sy2 + STEP_H / 2 + 8} fontSize={9} fill={ss.color} opacity={0.75}>
                      {ss.label}{step.duration_s != null ? ` · ${fmtDuration(step.duration_s)}` : ''}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

/* ───── Logs Viewer ───────────────────────────────────────────────────── */

interface LogsViewerProps {
  node: PipelineRunNode | null;
  runId: string;
}

const LogsViewer: React.FC<LogsViewerProps> = ({ node, runId }) => {
  const [logs,    setLogs]    = useState('');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!node) return;
    setLoading(true);
    getRunNodeLogs(runId, node.id)
      .then((d) => setLogs(d.log_output || '(no output)'))
      .catch(() => setLogs('(failed to load logs)'))
      .finally(() => setLoading(false));
  }, [node, runId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [logs]);

  const filtered = search
    ? logs.split('\n').filter((l) => l.toLowerCase().includes(search.toLowerCase())).join('\n')
    : logs;

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${node?.step_name || node?.stage_name || 'logs'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!node) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: t.textTertiary }}>Select a node in the graph to view logs.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1, borderBottom: `1px solid ${t.border}` }} gap={1}>
        <Typography sx={{ fontWeight: 600, fontSize: '.85rem', color: t.textPrimary }}>
          {node.stage_name}{node.step_name ? ` › ${node.step_name}` : ''}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 180, '& .MuiInputBase-root': { height: 30, fontSize: '.78rem', bgcolor: t.surfaceSubtle, color: t.textPrimary } }}
          />
          <Tooltip title="Download logs">
            <IconButton size="small" onClick={handleDownload} sx={{ color: t.textSecondary }}>
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: t.brandPrimary }} />
        </Box>
      ) : (
        <Box ref={boxRef} sx={{ flex: 1, overflowY: 'auto', bgcolor: '#0f172a', p: 2 }}>
          <pre style={{
            margin: 0, fontFamily: '"JetBrains Mono","Fira Code",monospace',
            fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {filtered || '(empty)'}
          </pre>
          {node.error_msg && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(239,68,68,.1)', borderRadius: 1, border: `1px solid ${dashboardSemanticColors.danger}44` }}>
              <Typography sx={{ color: dashboardSemanticColors.danger, fontSize: '.78rem', fontFamily: 'monospace' }}>
                {node.error_msg}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

/* ───── Artifacts Panel ───────────────────────────────────────────────── */

const ArtifactsPanel: React.FC<{ artifacts: PipelineRunArtifact[] }> = ({ artifacts }) => {
  if (artifacts.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <FolderZipIcon sx={{ fontSize: 40, color: t.textTertiary, mb: 1 }} />
        <Typography sx={{ color: t.textTertiary }}>No artifacts produced by this run.</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ p: 2 }}>
      {artifacts.map((a) => (
        <Card key={a.id} sx={{ ...dashboardCardSx, mb: 1.5 }}>
          <CardContent sx={{ py: '10px !important', px: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <FolderZipIcon sx={{ fontSize: 16, color: t.brandPrimary }} />
                  <Typography sx={{ fontWeight: 600, fontSize: '.88rem', color: t.textPrimary }}>{a.name}</Typography>
                  {a.artifact_type && (
                    <Chip size="small" label={a.artifact_type}
                      sx={{ bgcolor: `${t.brandPrimary}22`, color: t.brandPrimary, fontSize: '0.65rem' }} />
                  )}
                </Stack>
                <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mt: 0.25 }}>
                  {a.size_bytes > 0 ? `${(a.size_bytes / 1024).toFixed(1)} KB` : '—'} • {timeAgo(a.created_at)}
                </Typography>
              </Box>
              {a.storage_url && (
                <Tooltip title="Download">
                  <IconButton size="small" href={a.storage_url} target="_blank" rel="noopener"
                    sx={{ color: t.textSecondary }}>
                    <DownloadIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

/* ───── Run List panel (left side of execution page) ─────────────────── */

interface RunListProps {
  runs:          PipelineRun[];
  selectedRunId: string;
  onSelect:      (run: PipelineRun) => void;
}

const RunList: React.FC<RunListProps> = ({ runs, selectedRunId, onSelect }) => (
  <Box sx={{ flex: 1, overflowY: 'auto' }}>
    {runs.map((run) => {
      const sc = RUN_STATUS[run.status] ?? STATUS.pending;
      const isSelected = run.id === selectedRunId;
      return (
        <Box
          key={run.id}
          onClick={() => onSelect(run)}
          sx={{
            px: 2, py: 1.5,
            borderBottom: `1px solid ${t.border}`,
            cursor: 'pointer',
            bgcolor: isSelected ? `${t.brandPrimary}15` : 'transparent',
            borderLeft: isSelected ? `3px solid ${t.brandPrimary}` : '3px solid transparent',
            '&:hover': { bgcolor: t.surfaceHover },
          }}
        >
          <Stack direction="row" alignItems="center" gap={0.75} mb={0.3}>
            <Box sx={{ color: sc.color, display: 'flex' }}>{sc.icon}</Box>
            <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.textPrimary }}>
              {run.branch}
            </Typography>
            {run.commit_sha && (
              <Typography sx={{ fontFamily: 'monospace', fontSize: '.68rem', color: t.textTertiary }}>
                {run.commit_sha.slice(0, 7)}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
              {run.triggered_by}
            </Typography>
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary }}>
              {timeAgo(run.started_at)}
            </Typography>
            {run.duration_s != null && (
              <Stack direction="row" alignItems="center" gap={0.3}>
                <AccessTimeIcon sx={{ fontSize: 11, color: t.textTertiary }} />
                <Typography sx={{ fontSize: '.7rem', color: t.textTertiary }}>
                  {fmtDuration(run.duration_s)}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
      );
    })}
  </Box>
);

/* ───── Main Page Component ───────────────────────────────────────────── */

const PipelineExecutionPage: React.FC = () => {
  const { runId }           = useParams<{ runId?: string }>();
  const [searchParams]      = useSearchParams();
  const navigate            = useNavigate();
  const definitionId        = searchParams.get('definition') ?? undefined;

  const [run,          setRun]          = useState<PipelineRun | null>(null);
  const [nodes,        setNodes]        = useState<PipelineRunNode[]>([]);
  const [artifacts,    setArtifacts]    = useState<PipelineRunArtifact[]>([]);
  const [allRuns,      setAllRuns]      = useState<PipelineRun[]>([]);
  const [selectedNode, setSelectedNode] = useState<PipelineRunNode | null>(null);
  const [rightTab,     setRightTab]     = useState(0);   // 0=logs 1=artifacts
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [cancelling,   setCancelling]   = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRun = useCallback(async (id: string) => {
    try {
      const [runData, nodesData, artsData] = await Promise.all([
        getPipelineRun(id),
        getRunGraph(id),
        getRunArtifacts(id),
      ]);
      setRun(runData);
      setNodes(nodesData);
      setArtifacts(artsData);
      // auto-select first failed or running node
      if (!selectedNode) {
        const focus = nodesData.find((n) => n.status === 'failed') ?? nodesData.find((n) => n.status === 'running');
        if (focus) setSelectedNode(focus);
      } else {
        // refresh selected node data
        const refreshed = nodesData.find((n) => n.id === selectedNode.id);
        if (refreshed) setSelectedNode(refreshed);
      }
      return runData;
    } catch {
      setError('Failed to load run data.');
      return null;
    }
  }, [selectedNode]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        // load run list for left panel
        const runsData = await (definitionId
          ? (await import('../services/pipelinesApi')).listDefinitionRuns(definitionId)
          : (await import('../services/pipelinesApi')).listPipelineRuns()
        );
        setAllRuns(runsData);

        // load selected run
        const targetId = runId ?? runsData[0]?.id;
        if (targetId) {
          const r = await loadRun(targetId);
          if (r) setRun(r);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, definitionId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!run) return;
    const isLive = ['pending', 'running', 'waiting'].includes(run.status);
    if (isLive) {
      pollRef.current = setInterval(() => loadRun(run.id), POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [run?.status, run?.id, loadRun]);

  const handleSelectRun = (r: PipelineRun) => {
    setSelectedNode(null);
    setRun(r);
    setNodes([]);
    setArtifacts([]);
    loadRun(r.id);
    navigate(`/developer/Dashboard/cicd/runs/${r.id}`, { replace: true });
  };

  const handleCancel = async () => {
    if (!run) return;
    setCancelling(true);
    try {
      const updated = await cancelPipelineRun(run.id);
      setRun(updated);
    } catch {
      setError('Failed to cancel run.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRerun = async () => {
    if (!run) return;
    try {
      const newRun = await triggerDefinition(run.definition, {
        branch:     run.branch,
        commit_msg: run.commit_msg,
      });
      navigate(`/developer/Dashboard/cicd/runs/${newRun.id}`);
    } catch {
      setError('Failed to re-trigger pipeline.');
    }
  };

  const handleSelectNode = (nodeId: number) => {
    const node = nodes.find((n) => n.id === nodeId) ?? null;
    setSelectedNode(node);
    setRightTab(0);
  };

  /* run summary stats */
  const stageNodes = nodes.filter((n) => n.node_type === 'stage');
  const stepNodes  = nodes.filter((n) => n.node_type === 'step');
  const successN   = stepNodes.filter((n) => n.status === 'success').length;
  const failedN    = stepNodes.filter((n) => n.status === 'failed').length;
  const runningN   = stepNodes.filter((n) => n.status === 'running').length;

  /* ─── render ─── */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', bgcolor: t.background }}>
        <CircularProgress sx={{ color: t.brandPrimary }} />
      </Box>
    );
  }

  const runSc   = run ? (RUN_STATUS[run.status] ?? STATUS.pending) : null;
  const isLive  = run ? ['pending', 'running', 'waiting'].includes(run.status) : false;
  const canCancel = isLive;

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '100vh', bgcolor: t.background, fontFamily: FONT }}>

      {/* ─── LEFT: run history list ─── */}
      <Box sx={{
        width: 260,
        borderRight: `1px solid ${t.border}`,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        bgcolor: t.surface,
        flexShrink: 0,
      }}>
        <Box sx={{ p: 1.75, borderBottom: `1px solid ${t.border}` }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => navigate('/developer/Dashboard/cicd/builder')}
              sx={{ color: t.textSecondary }}>
              <ArrowBackIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '.9rem' }}>
              {run?.definition_name ?? 'Pipeline Runs'}
            </Typography>
          </Stack>
          {(definitionId || run?.definition) && (
            <Typography sx={{ fontSize: '.72rem', color: t.textTertiary, mt: 0.3, ml: 4 }}>
              {run?.project_name}
            </Typography>
          )}
        </Box>
        {allRuns.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: t.textTertiary, fontSize: '.82rem' }}>No runs yet.</Typography>
          </Box>
        ) : (
          <RunList
            runs={allRuns}
            selectedRunId={run?.id ?? ''}
            onSelect={handleSelectRun}
          />
        )}
      </Box>

      {/* ─── MAIN: execution graph + detail ─── */}
      {!run ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: t.textTertiary }}>No run selected.</Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* run header */}
          <Box sx={{ px: 3, pt: 2, pb: 1.25, borderBottom: `1px solid ${t.border}`, bgcolor: t.surface }}>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                {runSc && (
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    bgcolor: runSc.bg, border: `2px solid ${runSc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: runSc.color,
                  }}>
                    {runSc.icon}
                  </Box>
                )}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>
                      {run.definition_name}
                    </Typography>
                    <Chip size="small" label={runSc?.label ?? run.status}
                      sx={{ bgcolor: runSc?.bg, color: runSc?.color, fontWeight: 700, fontSize: '.7rem' }} />
                    {isLive && (
                      <Chip size="small" label="LIVE"
                        sx={{ bgcolor: 'rgba(34,197,94,.15)', color: dashboardSemanticColors.success, fontWeight: 700, fontSize: '.65rem', animation: 'pulse 2s infinite' }} />
                    )}
                  </Stack>
                  <Stack direction="row" gap={1.5} mt={0.3} flexWrap="wrap">
                    <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
                      branch: <strong style={{ color: t.textSecondary }}>{run.branch}</strong>
                    </Typography>
                    {run.commit_sha && (
                      <Typography sx={{ fontSize: '.75rem', fontFamily: 'monospace', color: t.textTertiary }}>
                        {run.commit_sha.slice(0, 7)}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
                      by {run.triggered_by}
                    </Typography>
                    <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
                      {timeAgo(run.started_at)}
                    </Typography>
                    {run.duration_s != null && (
                      <Stack direction="row" alignItems="center" gap={0.3}>
                        <AccessTimeIcon sx={{ fontSize: 12, color: t.textTertiary }} />
                        <Typography sx={{ fontSize: '.75rem', color: t.textTertiary }}>
                          {fmtDuration(run.duration_s)}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
              <Stack direction="row" gap={1}>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={() => loadRun(run.id)} sx={{ color: t.textSecondary }}>
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                {canCancel && (
                  <Button
                    size="small" variant="outlined" startIcon={<StopIcon />}
                    disabled={cancelling}
                    onClick={handleCancel}
                    sx={{ textTransform: 'none', borderColor: dashboardSemanticColors.danger, color: dashboardSemanticColors.danger, fontSize: '.8rem' }}
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel Run'}
                  </Button>
                )}
                <Button
                  size="small" variant="outlined" startIcon={<PlayArrowIcon />}
                  onClick={handleRerun}
                  sx={{ textTransform: 'none', borderColor: t.border, color: t.textSecondary, fontSize: '.8rem' }}
                >
                  Re-run
                </Button>
              </Stack>
            </Stack>

            {/* summary chips */}
            <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
              <Chip size="small" label={`${stageNodes.length} Stages`}
                sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
              <Chip size="small" label={`${stepNodes.length} Steps`}
                sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
              {successN > 0 && (
                <Chip size="small" label={`${successN} Passed`} icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{ bgcolor: 'rgba(34,197,94,.1)', color: dashboardSemanticColors.success }} />
              )}
              {failedN > 0 && (
                <Chip size="small" label={`${failedN} Failed`} icon={<ErrorIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{ bgcolor: 'rgba(239,68,68,.1)', color: dashboardSemanticColors.danger }} />
              )}
              {runningN > 0 && (
                <Chip size="small" label={`${runningN} Running`}
                  sx={{ bgcolor: 'rgba(21,61,117,.1)', color: dashboardSemanticColors.info }} />
              )}
              {artifacts.length > 0 && (
                <Chip size="small" label={`${artifacts.length} Artifact${artifacts.length !== 1 ? 's' : ''}`} icon={<FolderZipIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{ bgcolor: t.surfaceSubtle, color: t.textSecondary }} />
              )}
            </Stack>
          </Box>

          {/* body: graph top + detail bottom */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Execution Graph ── */}
            <Box sx={{
              borderBottom: `1px solid ${t.border}`,
              bgcolor: t.surfaceSubtle,
              overflowX: 'auto',
              p: 2,
              minHeight: 120,
              maxHeight: 320,
            }}>
              <Typography sx={{ fontSize: '.72rem', fontWeight: 700, color: t.textTertiary, mb: 1, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Execution Graph  {isLive && '· Live'}
              </Typography>
              <ExecutionGraph
                nodes={nodes}
                selectedNodeId={selectedNode?.id ?? null}
                onSelectNode={handleSelectNode}
              />
            </Box>

            {/* ── Detail: Logs + Artifacts ── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ borderBottom: `1px solid ${t.border}`, bgcolor: t.surface }}>
                <Tabs
                  value={rightTab}
                  onChange={(_, v) => setRightTab(v)}
                  sx={{ '& .MuiTab-root': { color: t.textSecondary, fontSize: '.82rem', textTransform: 'none', minHeight: 40 }, '& .Mui-selected': { color: t.brandPrimary } }}
                >
                  <Tab label={
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <BugReportIcon sx={{ fontSize: 15 }} />
                      Logs {selectedNode ? `— ${selectedNode.step_name || selectedNode.stage_name}` : ''}
                    </Stack>
                  } />
                  <Tab label={
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <FolderZipIcon sx={{ fontSize: 15 }} />
                      Artifacts
                      {artifacts.length > 0 && (
                        <Chip size="small" label={artifacts.length}
                          sx={{ height: 18, bgcolor: t.brandPrimary, color: '#fff', fontSize: '0.65rem' }} />
                      )}
                    </Stack>
                  } />
                </Tabs>
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {rightTab === 0 && (
                  <LogsViewer node={selectedNode} runId={run.id} />
                )}
                {rightTab === 1 && (
                  <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    <ArtifactsPanel artifacts={artifacts} />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PipelineExecutionPage;
