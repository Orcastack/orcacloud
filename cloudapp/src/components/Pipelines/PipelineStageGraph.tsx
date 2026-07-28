/**
 * PipelineStageGraph
 * Renders a Harness-style horizontal stage → step DAG.
 * Pure SVG-positioned boxes — no extra dependencies.
 */
import React, { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import ErrorIcon             from '@mui/icons-material/Error';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayArrowIcon         from '@mui/icons-material/PlayArrow';
import SkipNextIcon          from '@mui/icons-material/SkipNext';
import { dashboardTokens, dashboardSemanticColors } from '../../styles/dashboardDesignSystem';
import type { PipelineStage, PipelineStep } from '../../services/groupsApi';

const FONT = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const t    = dashboardTokens.colors;
const sc   = dashboardSemanticColors;

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  succeeded: sc.success,
  success:   sc.success,
  failed:    sc.danger,
  running:   t.brandPrimary,
  pending:   '#6b7280',
  skipped:   '#9ca3af',
  cancelled: '#6b7280',
};

const STATUS_BG: Record<string, string> = {
  succeeded: `${sc.success}18`,
  success:   `${sc.success}18`,
  failed:    `${sc.danger}18`,
  running:   `${t.brandPrimary}18`,
  pending:   '#6b728018',
  skipped:   '#9ca3af18',
  cancelled: '#6b728018',
};

function StatusIcon({ status, size = 14 }: { status?: string; size?: number }) {
  const color = STATUS_COLOR[status ?? 'pending'] ?? '#6b7280';
  if (status === 'succeeded' || status === 'success')
    return <CheckCircleIcon sx={{ fontSize: size, color }} />;
  if (status === 'failed')
    return <ErrorIcon sx={{ fontSize: size, color }} />;
  if (status === 'running')
    return <PlayArrowIcon sx={{ fontSize: size, color }} />;
  if (status === 'skipped')
    return <SkipNextIcon sx={{ fontSize: size, color }} />;
  return <RadioButtonUncheckedIcon sx={{ fontSize: size, color }} />;
}

// ── Step card ─────────────────────────────────────────────────────────────────

const StepCard: React.FC<{ step: PipelineStep; index: number }> = ({ step, index: _index }) => {
  const color = STATUS_COLOR[step.status ?? 'pending'];
  const bg    = STATUS_BG[step.status ?? 'pending'];
  return (
    <Box sx={{
      border: `1px solid ${color}55`,
      bgcolor: bg,
      borderRadius: 1,
      px: 1.25, py: 0.75,
      minWidth: 140,
      maxWidth: 200,
      cursor: 'default',
    }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <StatusIcon status={step.status} size={12} />
        <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {step.name}
        </Typography>
      </Stack>
      <Typography sx={{ fontFamily: FONT, fontSize: '.68rem', color: t.textSecondary, mt: 0.25, textTransform: 'capitalize' }}>
        {step.type ?? 'script'}
      </Typography>
    </Box>
  );
};

// ── Stage card ────────────────────────────────────────────────────────────────

const StageCard: React.FC<{ stage: PipelineStage; selected: boolean; onSelect: () => void }> = ({
  stage, selected, onSelect,
}) => {
  const color = STATUS_COLOR[stage.status ?? 'pending'];
  const bg    = STATUS_BG[stage.status ?? 'pending'];

  return (
    <Box
      onClick={onSelect}
      sx={{
        border: `2px solid ${selected ? color : `${color}55`}`,
        bgcolor: selected ? bg : t.surface,
        borderRadius: 1.5,
        p: 1.5,
        minWidth: 160,
        cursor: 'pointer',
        transition: 'all .15s',
        '&:hover': { bgcolor: bg, borderColor: color },
      }}
    >
      {/* Stage header */}
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        <StatusIcon status={stage.status} size={14} />
        <Typography sx={{ fontFamily: FONT, fontSize: '.8rem', fontWeight: 700, color: t.textPrimary }}>
          {stage.name}
        </Typography>
      </Stack>

      <Chip
        label={stage.type ?? 'custom'}
        size="small"
        sx={{
          fontFamily: FONT, fontSize: '.65rem', textTransform: 'capitalize',
          height: 18, mb: 0.5,
          bgcolor: `${color}18`, color, border: `1px solid ${color}44`,
        }}
      />

      {/* Step list (compact) */}
      <Stack spacing={0.4} sx={{ mt: 0.75 }}>
        {(stage.steps ?? []).slice(0, 4).map((step, i) => (
          <Stack key={i} direction="row" spacing={0.5} alignItems="center">
            <StatusIcon status={step.status} size={10} />
            <Typography sx={{ fontFamily: FONT, fontSize: '.68rem', color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {step.name}
            </Typography>
          </Stack>
        ))}
        {(stage.steps ?? []).length > 4 && (
          <Typography sx={{ fontFamily: FONT, fontSize: '.65rem', color: t.textSecondary, pl: 1.5 }}>
            +{stage.steps.length - 4} more
          </Typography>
        )}
        {(stage.steps ?? []).length === 0 && (
          <Typography sx={{ fontFamily: FONT, fontSize: '.68rem', color: t.textSecondary, fontStyle: 'italic' }}>
            No steps defined
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

// ── Arrow connector ───────────────────────────────────────────────────────────

const Arrow: React.FC = () => (
  <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', px: 0.5 }}>
    <Box component="svg" width={32} height={20} viewBox="0 0 32 20">
      <line x1={0} y1={10} x2={26} y2={10} stroke={t.border} strokeWidth={1.5} />
      <polygon points="26,6 32,10 26,14" fill={t.border} />
    </Box>
  </Box>
);

// ── Detail panel (shown when a stage is selected) ─────────────────────────────

const StageDetailPanel: React.FC<{ stage: PipelineStage }> = ({ stage }) => (
  <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 1.5, p: 2, bgcolor: t.surface }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', fontWeight: 700, color: t.textPrimary, mb: 1.5 }}>
      {stage.name} — Steps
    </Typography>
    <Stack spacing={1}>
      {(stage.steps ?? []).map((step, i) => <StepCard key={i} step={step} index={i} />)}
      {(stage.steps ?? []).length === 0 && (
        <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary, fontStyle: 'italic' }}>
          No steps defined for this stage.
        </Typography>
      )}
    </Stack>
    {stage.condition && (
      <Box sx={{ mt: 1.5, p: 1, bgcolor: `${t.brandPrimary}10`, borderRadius: 1, border: `1px solid ${t.brandPrimary}33` }}>
        <Typography sx={{ fontFamily: FONT, fontSize: '.72rem', color: t.textSecondary }}>
          Condition: <code>{stage.condition}</code>
        </Typography>
      </Box>
    )}
  </Box>
);

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyGraph: React.FC = () => (
  <Box sx={{ textAlign: 'center', py: 5 }}>
    <Typography sx={{ fontFamily: FONT, fontSize: '1rem', color: t.textSecondary, mb: 0.5 }}>
      No stages defined
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontSize: '.82rem', color: t.textSecondary }}>
      Add stages to this pipeline definition to see the graph.
    </Typography>
  </Box>
);

// ── Main export ───────────────────────────────────────────────────────────────

export interface PipelineStageGraphProps {
  stages: PipelineStage[];
  /** Set to false to show as read-only (hides selection hint) */
  interactive?: boolean;
}

const PipelineStageGraph: React.FC<PipelineStageGraphProps> = ({
  stages,
  interactive = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!stages || stages.length === 0) return <EmptyGraph />;

  const selected = selectedIndex !== null ? stages[selectedIndex] : null;

  return (
    <Stack spacing={2}>
      {/* Stage row */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-start',
        overflowX: 'auto',
        pb: 1,
        gap: 0,
      }}>
        {stages.map((stage, i) => (
          <React.Fragment key={i}>
            <StageCard
              stage={stage}
              selected={selectedIndex === i}
              onSelect={() => setSelectedIndex(selectedIndex === i ? null : i)}
            />
            {i < stages.length - 1 && <Arrow />}
          </React.Fragment>
        ))}
      </Box>

      {/* Detail panel */}
      {selected && <StageDetailPanel stage={selected} />}

      {interactive && !selected && stages.length > 0 && (
        <Typography sx={{ fontFamily: FONT, fontSize: '.75rem', color: t.textSecondary, textAlign: 'center' }}>
          Click a stage to view its steps
        </Typography>
      )}
    </Stack>
  );
};

export default PipelineStageGraph;
