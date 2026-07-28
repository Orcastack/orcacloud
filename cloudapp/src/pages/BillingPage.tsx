import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, CardHeader,
  Chip, Button, CircularProgress, Alert as MuiAlert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, LinearProgress, Paper, Divider,
  Switch, FormControlLabel,
  AppBar, Toolbar, InputBase, Avatar, Menu, Badge,
  Snackbar,
} from '@mui/material';
import RefreshIcon           from '@mui/icons-material/Refresh';
import AddIcon               from '@mui/icons-material/Add';
import CreditCardIcon        from '@mui/icons-material/CreditCard';
import DeleteIcon            from '@mui/icons-material/Delete';
import DownloadIcon          from '@mui/icons-material/Download';
import AccountBalanceIcon    from '@mui/icons-material/AccountBalance';
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';
import CheckCircleIcon       from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon      from '@mui/icons-material/ErrorOutline';
import SpeedIcon             from '@mui/icons-material/Speed';
import SwapHorizIcon         from '@mui/icons-material/SwapHoriz';
import SecurityIcon          from '@mui/icons-material/Security';
import ArrowBackIcon         from '@mui/icons-material/ArrowBack';
import SaveIcon              from '@mui/icons-material/Save';
import SearchIcon            from '@mui/icons-material/Search';
import NotificationsIcon     from '@mui/icons-material/Notifications';
import LightModeIcon         from '@mui/icons-material/LightMode';
import DarkModeIcon          from '@mui/icons-material/DarkMode';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../services/cloudApi';
import { useAuth }  from '../contexts/AuthContext';
import { useTheme as useColorMode } from '../contexts/ThemeContext';
import type {
  BillingOverview, BillingAccount, UpdateBillingAccountPayload,
  Invoice, PaymentMethod,
  CurrentUsage, PlanTier, ServiceCost,
} from '../types/billing';
import {
  dashboardTokens,
  dashboardSemanticColors,
  dashboardStatusColors,
} from '../styles/dashboardDesignSystem';

// ── Theme tokens ──────────────────────────────────────────────────────────────

function useT() {
  // Consume mode so every component using useT() re-renders on theme toggle
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  return {
    panelBg: dashboardTokens.colors.background,
    cardBg: dashboardTokens.colors.surface,
    border: dashboardTokens.colors.border,
    text: dashboardTokens.colors.textPrimary,
    sub: dashboardTokens.colors.textSecondary,
    brand: dashboardTokens.colors.brandPrimary,
    green: dashboardSemanticColors.success,
    yellow: dashboardSemanticColors.warning,
    red: dashboardSemanticColors.danger,
    isDark,
    blue: dashboardSemanticColors.info,
    purple: dashboardSemanticColors.purple,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INVOICE_STATUS_COLOR: Record<string, string> = {
  ...dashboardStatusColors.invoice,
};

const PLAN_COLOR: Record<PlanTier, string> = {
  free: dashboardStatusColors.plan.free,
  starter: dashboardStatusColors.plan.starter,
  professional: dashboardStatusColors.plan.professional,
  enterprise: dashboardStatusColors.plan.enterprise,
};



const SERVICE_COLORS: Record<string, string> = {
  ...dashboardStatusColors.service,
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip label={label.toUpperCase()} size="small"
      sx={{ bgcolor: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: 700, fontSize: '0.65rem' }} />
  );
}

// ── Mini sparkline (SVG) ──────────────────────────────────────────────────────

function TrendBar({ trend }: { trend: { month: string; amount: number }[] }) {
  const t = useT();
  if (!trend.length) return null;
  const max = Math.max(...trend.map(p => p.amount), 1);
  const w = 260, h = 60;
  const step = w / (trend.length - 1 || 1);
  const pts = trend.map((p, i) => ({
    x: i * step,
    y: h - (p.amount / max) * (h - 8) - 4,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <Box>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
        <path d={area} fill={`${t.brand}33`} />
        <path d={d} stroke={t.brand} strokeWidth="2" fill="none" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={t.brand} />
        ))}
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        {trend.map((p) => (
          <Box key={p.month} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: t.sub, fontSize: '0.65rem', display: 'block' }}>{p.month}</Typography>
            <Typography variant="caption" sx={{ color: t.text, fontSize: '0.7rem', fontWeight: 600 }}>{fmt(p.amount)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Usage Donut (CSS-only bar chart) ─────────────────────────────────────────

function UsageServiceChart({ items }: { items: ServiceCost[] }) {
  const t = useT();
  const total = items.reduce((s, i) => s + i.cost, 0) || 1;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {items.slice(0, 8).map((item) => (
        <Box key={item.service}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: SERVICE_COLORS[item.service] ?? t.brand }} />
              <Typography variant="caption" sx={{ color: t.text, textTransform: 'capitalize' }}>{item.service}</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: t.text, fontWeight: 700 }}>{fmt(item.cost)}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(item.cost / total) * 100}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: `${SERVICE_COLORS[item.service] ?? t.brand}22`,
              '& .MuiLinearProgress-bar': { bgcolor: SERVICE_COLORS[item.service] ?? t.brand, borderRadius: 3 },
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

type SpendAnalysis = {
  current_week:    { week_start: string; week_end: string; total: number; by_service: Record<string, number> };
  prior_week:      { week_start: string; total: number } | null;
  wow_delta:       number;
  wow_pct:         number;
  top_services:    { service: string; cost: number }[];
  weekly_avg:      number;
  projected_month: number;
  mtd:             number;
  prior_mtd:       number;
  mtd_delta:       number;
  mtd_pct:         number;
  peak_week:       { week_start: string; total: number };
  weekly_trend:    { week_start: string; week_end: string; total: number; by_service: Record<string, number> }[];
};

function WeeklyTrendBar({ weeks }: { weeks: SpendAnalysis['weekly_trend'] }) {
  const t = useT();
  if (!weeks.length) return null;
  const max = Math.max(...weeks.map(w => w.total), 1);
  const W = 480, H = 64;
  const step = W / (weeks.length - 1 || 1);
  const pts = weeks.map((w, i) => ({ x: i * step, y: H - (w.total / max) * (H - 10) - 5, w }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${d} L${W},${H} L0,${H} Z`;
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 360 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
          <defs>
            <linearGradient id="wk-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.brand} stopOpacity="0.25" />
              <stop offset="100%" stopColor={t.brand} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#wk-grad)" />
          <path d={d} stroke={t.brand} strokeWidth="2" fill="none" />
          {pts.map((p, i) => (
            <Tooltip key={i} title={`${p.w.week_start}: ${fmt(p.w.total)}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill={t.brand} style={{ cursor: 'pointer' }} />
            </Tooltip>
          ))}
        </svg>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
          {weeks.map((w) => (
            <Typography key={w.week_start} variant="caption"
              sx={{ color: t.sub, fontSize: '.6rem', whiteSpace: 'nowrap' }}>
              {w.week_start.slice(5)}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function OverviewTab({ data, loading }: { data: BillingOverview | null; loading: boolean }) {
  const t = useT();
  const [analysis, setAnalysis] = useState<SpendAnalysis | null>(null);

  useEffect(() => {
    billingApi.spendingAnalysis()
      .then(r => setAnalysis(r.data as any))
      .catch(() => {});
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!data) return null;
  const { account, current_spend, projected, open_balance, credit_balance, trend, usage_breakdown } = data;
  const byService: ServiceCost[] = Object.values(
    (usage_breakdown ?? []).reduce<Record<string, ServiceCost>>((acc, i) => {
      acc[i.service] = { service: i.service, cost: (acc[i.service]?.cost ?? 0) + i.cost };
      return acc;
    }, {})
  ).sort((a, b) => b.cost - a.cost);

  return (
    <Box>
      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'This Month', value: fmt(current_spend), color: t.blue },
          { label: 'Projected', value: fmt(projected), color: t.yellow },
          { label: 'Open Balance', value: fmt(open_balance), color: open_balance > 0 ? t.red : t.green },
          { label: 'Credits', value: fmt(credit_balance), color: t.purple },
          { label: 'Plan', value: account.plan.toUpperCase(), color: PLAN_COLOR[account.plan] },
        ].map((s) => (
          <Grid key={s.label} item xs={12} sm={6} md={2}>
            <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
              <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: t.sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Weekly analysis cards */}
      {analysis && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            {
              label: 'Week-over-Week',
              value: `${analysis.wow_delta >= 0 ? '+' : ''}${fmt(analysis.wow_delta)}`,
              sub: `${analysis.wow_pct >= 0 ? '+' : ''}${analysis.wow_pct}% vs prior week`,
              color: analysis.wow_delta > 0 ? t.red : t.green,
            },
            {
              label: 'MTD Spend',
              value: fmt(analysis.mtd),
              sub: `${analysis.mtd_delta >= 0 ? '+' : ''}${fmt(analysis.mtd_delta)} vs last month (${analysis.mtd_pct >= 0 ? '+' : ''}${analysis.mtd_pct}%)`,
              color: t.blue,
            },
            {
              label: 'Weekly Average',
              value: fmt(analysis.weekly_avg),
              sub: 'Last 4 weeks',
              color: t.sub,
            },
            {
              label: 'Projected Month',
              value: fmt(analysis.projected_month),
              sub: 'Based on weekly run-rate',
              color: t.yellow,
            },
          ].map(s => (
            <Grid key={s.label} item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="caption" sx={{ color: t.sub, textTransform: 'uppercase', fontSize: '.65rem', fontWeight: 600, letterSpacing: '.05em' }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, mt: 0.25 }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub, fontSize: '.72rem' }}>{s.sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Weekly spend trend (12 weeks) */}
        {analysis && (
          <Grid item xs={12} md={7}>
            <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, height: '100%' }}>
              <CardHeader
                title={<Typography sx={{ color: t.text, fontWeight: 700 }}>12-Week Spend Trend</Typography>}
                subheader={
                  analysis.peak_week && (
                    <Typography variant="caption" sx={{ color: t.sub }}>
                      Peak week: {analysis.peak_week.week_start} — {fmt(analysis.peak_week.total)}
                    </Typography>
                  )
                }
              />
              <CardContent sx={{ pt: 0 }}>
                <WeeklyTrendBar weeks={analysis.weekly_trend} />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top services this week */}
        {analysis && (
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, height: '100%' }}>
              <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Top Services (This Week)</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {analysis.top_services.map((s) => {
                    const weekTotal = analysis.current_week.total || 1;
                    const pct = Math.round((s.cost / weekTotal) * 100);
                    return (
                      <Box key={s.service}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SERVICE_COLORS[s.service] ?? t.brand }} />
                            <Typography variant="body2" sx={{ color: t.text, textTransform: 'capitalize' }}>{s.service}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: t.sub }}>{pct}%</Typography>
                            <Typography variant="body2" sx={{ color: t.text, fontWeight: 600 }}>{fmt(s.cost)}</Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate" value={pct}
                          sx={{
                            height: 5, borderRadius: 3,
                            bgcolor: `${SERVICE_COLORS[s.service] ?? t.brand}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: SERVICE_COLORS[s.service] ?? t.brand, borderRadius: 3 },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Monthly spend trend (backwards compat) */}
        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, height: '100%' }}>
            <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Monthly Spend Trend</Typography>} />
            <CardContent>
              <TrendBar trend={trend ?? []} />
            </CardContent>
          </Card>
        </Grid>

        {/* Spend by service */}
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, height: '100%' }}>
            <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Spend by Service</Typography>} />
            <CardContent>
              <UsageServiceChart items={byService} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────────────

function InvoicesTab() {
  const t = useT();
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Invoice | null>(null);
  const [paying, setPaying]       = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    billingApi.listInvoices()
      .then(r => setInvoices((r.data as any).results ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = (inv: Invoice) => {
    billingApi.getInvoice(inv.id)
      .then(r => setSelected(r.data as any))
      .catch(() => {});
  };

  const payNow = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaying(inv.id);
    billingApi.payInvoice(inv.id)
      .then(() => load())
      .catch(() => {})
      .finally(() => setPaying(null));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: t.text }}>Invoice History</Typography>
          <IconButton onClick={load} sx={{ color: t.sub }}><RefreshIcon /></IconButton>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Invoice #','Period','Status','Subtotal','Tax','Total','Due','Actions'].map(h => (
                    <TableCell key={h} sx={{ color: t.sub, borderColor: t.border, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id} hover onClick={() => openDetail(inv)}
                    selected={selected?.id === inv.id}
                    sx={{ cursor: 'pointer', '& td': { borderColor: t.border }, '&.Mui-selected': { bgcolor: `${t.brand}22` } }}>
                    <TableCell sx={{ color: t.blue, fontFamily: 'monospace', fontSize: '0.75rem' }}>{inv.invoice_number}</TableCell>
                    <TableCell sx={{ color: t.sub, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{inv.period_start} – {inv.period_end}</TableCell>
                    <TableCell><StatusChip label={inv.status} color={INVOICE_STATUS_COLOR[inv.status] ?? t.sub} /></TableCell>
                    <TableCell sx={{ color: t.text }}>{fmt(Number(inv.subtotal))}</TableCell>
                    <TableCell sx={{ color: t.sub }}>{fmt(Number(inv.tax_amount))}</TableCell>
                    <TableCell sx={{ color: t.text, fontWeight: 700 }}>{fmt(Number(inv.total))}</TableCell>
                    <TableCell sx={{ color: t.sub, fontSize: '0.75rem' }}>{inv.due_date ?? '—'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {inv.status === 'open' && (
                          <Tooltip title="Pay now">
                            <Button size="small" variant="contained" onClick={(e) => payNow(inv, e)}
                              disabled={paying === inv.id}
                              sx={{ bgcolor: t.green, fontSize: '0.65rem', px: 1, minWidth: 0 }}>
                              {paying === inv.id ? <CircularProgress size={12} /> : 'Pay'}
                            </Button>
                          </Tooltip>
                        )}
                        {inv.pdf_url && (
                          <Tooltip title="Download PDF">
                            <IconButton size="small" sx={{ color: t.sub }}><DownloadIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: t.sub, py: 4, borderColor: t.border }}>No invoices yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Invoice detail */}
      {selected && (
        <Box sx={{ width: 360, flexShrink: 0 }}>
          <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
            <CardHeader
              title={<Typography sx={{ color: t.text, fontWeight: 700, fontFamily: 'monospace' }}>{selected.invoice_number}</Typography>}
              subheader={<Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <StatusChip label={selected.status} color={INVOICE_STATUS_COLOR[selected.status]} />
                <Chip label={selected.currency} size="small" sx={{ color: t.sub, bgcolor: 'transparent', border: `1px solid ${t.border}` }} />
              </Box>}
              action={<IconButton size="small" onClick={() => setSelected(null)} sx={{ color: t.sub }}>x</IconButton>}
            />
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="caption" sx={{ color: t.sub }}>Period: {selected.period_start} – {selected.period_end}</Typography>
              <Divider sx={{ borderColor: t.border, my: 1.5 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: t.sub, borderColor: t.border, fontSize: '0.7rem' }}>Description</TableCell>
                      <TableCell align="right" sx={{ color: t.sub, borderColor: t.border, fontSize: '0.7rem' }}>Qty</TableCell>
                      <TableCell align="right" sx={{ color: t.sub, borderColor: t.border, fontSize: '0.7rem' }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selected.line_items ?? []).map(li => (
                      <TableRow key={li.id} sx={{ '& td': { borderColor: t.border } }}>
                        <TableCell sx={{ color: t.text, fontSize: '0.75rem' }}>{li.description}</TableCell>
                        <TableCell align="right" sx={{ color: t.sub, fontSize: '0.75rem' }}>{Number(li.quantity).toFixed(1)} {li.unit}</TableCell>
                        <TableCell align="right" sx={{ color: t.text, fontSize: '0.75rem', fontWeight: 600 }}>{fmt(Number(li.amount))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider sx={{ borderColor: t.border, my: 1.5 }} />
              {[
                ['Subtotal', fmt(Number(selected.subtotal))],
                ['Tax (8%)', fmt(Number(selected.tax_amount))],
                ['Credits', `- ${fmt(Number(selected.credits_applied))}`],
              ].map(([l, v]) => (
                <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: t.sub }}>{l}</Typography>
                  <Typography variant="caption" sx={{ color: t.text }}>{v}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography sx={{ color: t.text, fontWeight: 700 }}>Total</Typography>
                <Typography sx={{ color: t.text, fontWeight: 800, fontSize: '1.1rem' }}>{fmt(Number(selected.total))}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}

// ── Usage Tab ─────────────────────────────────────────────────────────────────

function UsageTab() {
  const t = useT();
  const [usage, setUsage]   = useState<CurrentUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    billingApi.currentUsage()
      .then(r => setUsage(r.data as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!usage) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: t.text }}>Current Usage — {usage.period}</Typography>
          <Typography variant="body2" sx={{ color: t.sub }}>Estimated charges for the current month</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ color: t.text, fontWeight: 800, fontSize: '1.5rem' }}>{fmt(usage.total)}</Typography>
          <IconButton onClick={load} sx={{ color: t.sub }}><RefreshIcon /></IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* By service */}
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
            <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>By Service</Typography>} />
            <CardContent>
              <UsageServiceChart items={usage.by_service ?? []} />
            </CardContent>
          </Card>
        </Grid>

        {/* Line items */}
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
            <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Usage Breakdown</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Service','Metric','Quantity','Unit Price','Cost'].map(h => (
                        <TableCell key={h} sx={{ color: t.sub, borderColor: t.border, fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(usage.line_items ?? []).map((li, i) => (
                      <TableRow key={i} sx={{ '& td': { borderColor: t.border } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SERVICE_COLORS[li.service] ?? t.brand }} />
                            <Typography variant="caption" sx={{ color: t.text, textTransform: 'capitalize' }}>{li.service}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: t.sub, fontSize: '0.75rem' }}>{li.description}</TableCell>
                        <TableCell sx={{ color: t.text, fontFamily: 'monospace' }}>{Number(li.quantity).toLocaleString()} {li.unit}</TableCell>
                        <TableCell sx={{ color: t.sub, fontFamily: 'monospace', fontSize: '0.75rem' }}>${li.unit_price}/unit</TableCell>
                        <TableCell sx={{ color: t.text, fontWeight: 700 }}>{fmt(li.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Payment Methods Tab ───────────────────────────────────────────────────────

const CARD_BRAND_COLORS: Record<string, string> = {
  visa: '#1A1F71', mastercard: '#EB001B', amex: '#007BC1',
  discover: '#F76F20', default: dashboardTokens.colors.textSecondary,
};

function AddCardDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ card_last4: '', card_brand: 'visa', card_exp_month: '', card_exp_year: '', display_name: '', is_default: false });
  const [busy, setBusy] = useState(false);

  const handle = (f: string) => (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
    setForm(p => ({ ...p, [f]: (e.target as any).value }));

  const submit = () => {
    setBusy(true);
    billingApi.addPaymentMethod({
      type: 'card',
      card_brand:     form.card_brand,
      card_last4:     form.card_last4,
      card_exp_month: Number(form.card_exp_month),
      card_exp_year:  Number(form.card_exp_year),
      display_name:   form.display_name,
      is_default:     form.is_default,
    })
      .then(() => { onAdded(); onClose(); })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  const inputSx = { '& .MuiInputLabel-root': { color: t.sub }, '& .MuiOutlinedInput-root': { color: t.text, '& fieldset': { borderColor: t.border } } };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: t.cardBg, color: t.text, minWidth: 420 } }}>
      <DialogTitle>Add Payment Method</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Cardholder / Display Name" value={form.display_name} onChange={handle('display_name')} fullWidth sx={inputSx} />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small" sx={inputSx}>
              <InputLabel>Card Brand</InputLabel>
              <Select value={form.card_brand} label="Card Brand" onChange={handle('card_brand') as any} sx={{ color: t.text }}>
                {['visa','mastercard','amex','discover'].map(b => <MenuItem key={b} value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField label="Last 4 digits" value={form.card_last4} onChange={handle('card_last4')} inputProps={{ maxLength: 4 }} fullWidth size="small" sx={inputSx} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Exp Month (MM)" type="number" value={form.card_exp_month} onChange={handle('card_exp_month')} fullWidth size="small" sx={inputSx} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Exp Year (YYYY)" type="number" value={form.card_exp_year} onChange={handle('card_exp_year')} fullWidth size="small" sx={inputSx} />
          </Grid>
        </Grid>
        <FormControlLabel
          control={<Switch checked={form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} />}
          label={<Typography variant="body2" sx={{ color: t.text }}>Set as default</Typography>}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: t.sub }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !form.card_last4} sx={{ bgcolor: t.brand }}>
          {busy ? <CircularProgress size={16} /> : 'Add Card'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PaymentMethodsTab() {
  const t = useT();
  const [methods, setMethods]   = useState<PaymentMethod[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    billingApi.listPaymentMethods()
      .then(r => setMethods((r.data as any).results ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setDefault = (id: number) => {
    billingApi.setDefaultPaymentMethod(id).then(() => load()).catch(() => {});
  };

  const remove = (id: number) => {
    billingApi.deletePaymentMethod(id).then(() => load()).catch(() => {});
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: t.text }}>Payment Methods</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ bgcolor: t.brand }}>
          Add Card
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : methods.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CreditCardIcon sx={{ fontSize: 48, color: t.sub, mb: 2 }} />
          <Typography sx={{ color: t.sub }}>No payment methods added yet.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ mt: 2, bgcolor: t.brand }}>
            Add Your First Card
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {methods.map(pm => (
            <Grid key={pm.id} item xs={12} sm={6} md={4}>
              <Card sx={{
                bgcolor: t.cardBg, border: `1px solid ${pm.is_default ? t.brand : t.border}`,
                position: 'relative',
              }}>
                {pm.is_default && (
                  <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                    <Chip label="DEFAULT" size="small" sx={{ bgcolor: `${t.brand}33`, color: t.brand, fontWeight: 700, fontSize: '0.6rem' }} />
                  </Box>
                )}
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 40, height: 26, borderRadius: 1,
                      bgcolor: CARD_BRAND_COLORS[pm.card_brand] ?? CARD_BRAND_COLORS.default,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CreditCardIcon sx={{ fontSize: 16, color: dashboardTokens.colors.white }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: t.text, fontWeight: 700, textTransform: 'capitalize' }}>
                        {pm.card_brand} •••• {pm.card_last4}
                      </Typography>
                      {pm.card_exp_month && (
                        <Typography variant="caption" sx={{ color: t.sub }}>
                          Exp {String(pm.card_exp_month).padStart(2, '0')}/{pm.card_exp_year}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {pm.display_name && (
                    <Typography variant="caption" sx={{ color: t.sub, display: 'block', mb: 1.5 }}>{pm.display_name}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!pm.is_default && (
                      <Button size="small" variant="outlined" onClick={() => setDefault(pm.id)}
                        sx={{ fontSize: '0.7rem', borderColor: t.border, color: t.sub, flex: 1 }}>
                        Set Default
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => remove(pm.id)} sx={{ color: t.red, border: `1px solid ${t.red}33` }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <AddCardDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
    </Box>
  );
}



// ── Payments Board ───────────────────────────────────────────────────────────

// Mock data for payments board (replace with real API calls)
const mockPaymentsData = {
  executive: {
    volume: { today: 125000, week: 850000, month: 3200000 },
    successRate: 98.7,
    avgLatency: 1.2,
    topCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
    topCorridors: ['US→EU', 'EU→US', 'US→CA', 'UK→US'],
    railDistribution: [
      { rail: 'Stripe', volume: 45, color: '#635bff' },
      { rail: 'PayPal', volume: 25, color: '#0070ba' },
      { rail: 'ACH', volume: 15, color: '#00d4aa' },
      { rail: 'Wire', volume: 10, color: '#ff6b35' },
      { rail: 'Crypto', volume: 5, color: '#f7931a' },
    ],
    countryHeatmap: [
      { country: 'US', volume: 1200000, risk: 'low' },
      { country: 'EU', volume: 950000, risk: 'low' },
      { country: 'UK', volume: 450000, risk: 'low' },
      { country: 'CA', volume: 350000, risk: 'medium' },
      { country: 'AU', volume: 250000, risk: 'low' },
    ],
  },
  risk: {
    blockedTransactions: 234,
    fraudRate: 0.12,
    amlFlags: 45,
    velocityTriggers: 89,
    ruleHits: [
      { rule: 'Velocity Check', count: 89, severity: 'medium' },
      { rule: 'Device Risk', count: 67, severity: 'low' },
      { rule: 'IP Geolocation', count: 45, severity: 'high' },
      { rule: 'Amount Threshold', count: 33, severity: 'medium' },
    ],
    reviewQueue: [
      { id: 'TXN-001', amount: 5000, risk: 'high', reason: 'Unusual amount' },
      { id: 'TXN-002', amount: 1200, risk: 'medium', reason: 'New device' },
      { id: 'TXN-003', amount: 800, risk: 'low', reason: 'Velocity limit' },
    ],
  },
  technical: {
    services: [
      { name: 'payments-api', latency: 45, errorRate: 0.02, status: 'healthy' },
      { name: 'orchestrator', latency: 120, errorRate: 0.01, status: 'healthy' },
      { name: 'risk-service', latency: 89, errorRate: 0.03, status: 'warning' },
      { name: 'ledger', latency: 67, errorRate: 0.005, status: 'healthy' },
      { name: 'settlement', latency: 234, errorRate: 0.01, status: 'healthy' },
    ],
    adapters: [
      { rail: 'Stripe', health: 'healthy', latency: 1200, queueDepth: 12 },
      { rail: 'PayPal', health: 'healthy', latency: 1500, queueDepth: 8 },
      { rail: 'ACH', health: 'warning', latency: 3000, queueDepth: 45 },
      { rail: 'Wire', health: 'healthy', latency: 1800, queueDepth: 3 },
    ],
    circuitBreakers: [
      { service: 'stripe-adapter', status: 'closed', failures: 2 },
      { service: 'paypal-adapter', status: 'closed', failures: 0 },
      { service: 'ach-adapter', status: 'open', failures: 15 },
    ],
  },
  finance: {
    settlements: [
      { rail: 'Stripe', net: 45000, feesEarned: 2250, feesPaid: 1800, pnl: 450 },
      { rail: 'PayPal', net: 25000, feesEarned: 1250, feesPaid: 1000, pnl: 250 },
      { rail: 'ACH', net: 15000, feesEarned: 750, feesPaid: 600, pnl: 150 },
      { rail: 'Wire', net: 10000, feesEarned: 500, feesPaid: 400, pnl: 100 },
    ],
    fxPnL: 1250,
    reconciliation: {
      clean: 98.5,
      mismatched: 1.2,
      pending: 0.3,
    },
    exports: [
      { type: 'Settlement Report', format: 'CSV', period: 'Daily' },
      { type: 'FX P&L', format: 'JSON', period: 'Weekly' },
      { type: 'Audit Trail', format: 'PDF', period: 'Monthly' },
    ],
  },
};

function PaymentsBoardTab() {
  const t = useT();
  const [view, setView] = useState<'executive' | 'risk' | 'technical' | 'finance'>('executive');
  const data = mockPaymentsData;

  const views = [
    { key: 'executive', label: 'Executive / Ops', icon: <AccountBalanceIcon /> },
    { key: 'risk', label: 'Risk & Compliance', icon: <SecurityIcon /> },
    { key: 'technical', label: 'Technical / SRE', icon: <SpeedIcon /> },
    { key: 'finance', label: 'Finance & Settlement', icon: <AccountBalanceIcon /> },
  ] as const;

  return (
    <Box>
      {/* View selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {views.map(v => (
          <Button
            key={v.key}
            variant={view === v.key ? 'contained' : 'outlined'}
            startIcon={v.icon}
            onClick={() => setView(v.key)}
            sx={{
              bgcolor: view === v.key ? t.brand : 'transparent',
              borderColor: t.border,
              color: view === v.key ? '#fff' : t.text,
              '&:hover': { bgcolor: view === v.key ? t.brand : `${t.brand}11` },
            }}
          >
            {v.label}
          </Button>
        ))}
      </Box>

      {/* Executive / Ops View */}
      {view === 'executive' && (
        <Box>
          <Typography variant="h6" sx={{ color: t.text, mb: 3 }}>Executive Operations Dashboard</Typography>
          <Grid container spacing={3}>
            {/* KPIs */}
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.green }}>{fmt(data.executive.volume.today)}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Today Volume</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.blue }}>{data.executive.successRate}%</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Success Rate</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.yellow }}>{data.executive.avgLatency}s</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Avg Latency</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.purple }}>{data.executive.topCurrencies.length}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Active Currencies</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Rail Distribution Pie */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Rail Distribution</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.executive.railDistribution.map(rail => (
                      <Box key={rail.rail}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: rail.color }} />
                            <Typography variant="body2" sx={{ color: t.text }}>{rail.rail}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: t.text, fontWeight: 600 }}>{rail.volume}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={rail.volume}
                          sx={{
                            height: 8, borderRadius: 4,
                            bgcolor: `${rail.color}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: rail.color, borderRadius: 4 },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Corridors */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Top Corridors</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.executive.topCorridors.map(corridor => (
                      <Box key={corridor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SwapHorizIcon sx={{ fontSize: '1rem', color: t.sub }} />
                        <Typography variant="body2" sx={{ color: t.text }}>{corridor}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Risk & Compliance View */}
      {view === 'risk' && (
        <Box>
          <Typography variant="h6" sx={{ color: t.text, mb: 3 }}>Risk & Compliance Dashboard</Typography>
          <Grid container spacing={3}>
            {/* Risk Metrics */}
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.red }}>{data.risk.blockedTransactions}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Blocked Transactions</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.yellow }}>{data.risk.fraudRate}%</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Fraud Rate</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.purple }}>{data.risk.amlFlags}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>AML Flags</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: t.blue }}>{data.risk.velocityTriggers}</Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>Velocity Triggers</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Rule Hits */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Rule Hit Breakdown</Typography>} />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Rule</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Count</TableCell>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Severity</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.risk.ruleHits.map(rule => (
                          <TableRow key={rule.rule}>
                            <TableCell sx={{ color: t.text }}>{rule.rule}</TableCell>
                            <TableCell align="right" sx={{ color: t.text, fontWeight: 600 }}>{rule.count}</TableCell>
                            <TableCell>
                              <StatusChip label={rule.severity} color={
                                rule.severity === 'high' ? t.red :
                                rule.severity === 'medium' ? t.yellow : t.green
                              } />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Review Queue */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Manual Review Queue</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.risk.reviewQueue.map(item => (
                      <Box key={item.id} sx={{ p: 1.5, border: `1px solid ${t.border}`, borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ color: t.text, fontWeight: 600 }}>{item.id}</Typography>
                          <StatusChip label={item.risk} color={
                            item.risk === 'high' ? t.red :
                            item.risk === 'medium' ? t.yellow : t.green
                          } />
                        </Box>
                        <Typography variant="caption" sx={{ color: t.sub }}>{fmt(item.amount)} - {item.reason}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Technical / SRE View */}
      {view === 'technical' && (
        <Box>
          <Typography variant="h6" sx={{ color: t.text, mb: 3 }}>Technical Operations Dashboard</Typography>
          <Grid container spacing={3}>
            {/* Service Health */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Service Health</Typography>} />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Service</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Latency</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Error Rate</TableCell>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.technical.services.map(service => (
                          <TableRow key={service.name}>
                            <TableCell sx={{ color: t.text }}>{service.name}</TableCell>
                            <TableCell align="right" sx={{ color: t.text }}>{service.latency}ms</TableCell>
                            <TableCell align="right" sx={{ color: t.text }}>{(service.errorRate * 100).toFixed(2)}%</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {service.status === 'healthy' ? (
                                  <CheckCircleIcon sx={{ fontSize: '1rem', color: t.green }} />
                                ) : service.status === 'warning' ? (
                                  <WarningAmberIcon sx={{ fontSize: '1rem', color: t.yellow }} />
                                ) : (
                                  <ErrorOutlineIcon sx={{ fontSize: '1rem', color: t.red }} />
                                )}
                                <Typography variant="caption" sx={{ color: t.text, textTransform: 'capitalize' }}>{service.status}</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Adapter Health */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Rail Adapters</Typography>} />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Rail</TableCell>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Health</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Latency</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Queue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.technical.adapters.map(adapter => (
                          <TableRow key={adapter.rail}>
                            <TableCell sx={{ color: t.text }}>{adapter.rail}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {adapter.health === 'healthy' ? (
                                  <CheckCircleIcon sx={{ fontSize: '1rem', color: t.green }} />
                                ) : (
                                  <WarningAmberIcon sx={{ fontSize: '1rem', color: t.yellow }} />
                                )}
                                <Typography variant="caption" sx={{ color: t.text, textTransform: 'capitalize' }}>{adapter.health}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ color: t.text }}>{adapter.latency}ms</TableCell>
                            <TableCell align="right" sx={{ color: t.text }}>{adapter.queueDepth}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Circuit Breakers */}
            <Grid item xs={12}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Circuit Breakers</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {data.technical.circuitBreakers.map(cb => (
                      <Box key={cb.service} sx={{ p: 1.5, border: `1px solid ${t.border}`, borderRadius: 1, minWidth: 200 }}>
                        <Typography variant="body2" sx={{ color: t.text, fontWeight: 600, mb: 0.5 }}>{cb.service}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: t.sub }}>Status:</Typography>
                          <StatusChip label={cb.status} color={cb.status === 'closed' ? t.green : t.red} />
                        </Box>
                        <Typography variant="caption" sx={{ color: t.sub }}>Failures: {cb.failures}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Finance & Settlement View */}
      {view === 'finance' && (
        <Box>
          <Typography variant="h6" sx={{ color: t.text, mb: 3 }}>Finance & Settlement Dashboard</Typography>
          <Grid container spacing={3}>
            {/* Settlement Summary */}
            <Grid item xs={12} md={8}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Settlement by Rail</Typography>} />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.sub, fontWeight: 600 }}>Rail</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Net Settlement</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Fees Earned</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>Fees Paid</TableCell>
                          <TableCell align="right" sx={{ color: t.sub, fontWeight: 600 }}>P&L</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.finance.settlements.map(settlement => (
                          <TableRow key={settlement.rail}>
                            <TableCell sx={{ color: t.text }}>{settlement.rail}</TableCell>
                            <TableCell align="right" sx={{ color: t.text }}>{fmt(settlement.net)}</TableCell>
                            <TableCell align="right" sx={{ color: t.green }}>{fmt(settlement.feesEarned)}</TableCell>
                            <TableCell align="right" sx={{ color: t.red }}>{fmt(settlement.feesPaid)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: settlement.pnl > 0 ? t.green : t.red }}>
                              {fmt(settlement.pnl)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Reconciliation Status */}
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Reconciliation Status</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: t.text }}>Clean</Typography>
                        <Typography variant="body2" sx={{ color: t.green, fontWeight: 600 }}>{data.finance.reconciliation.clean}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.finance.reconciliation.clean}
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: `${t.green}22`,
                          '& .MuiLinearProgress-bar': { bgcolor: t.green, borderRadius: 4 },
                        }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: t.text }}>Mismatched</Typography>
                        <Typography variant="body2" sx={{ color: t.red, fontWeight: 600 }}>{data.finance.reconciliation.mismatched}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.finance.reconciliation.mismatched}
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: `${t.red}22`,
                          '& .MuiLinearProgress-bar': { bgcolor: t.red, borderRadius: 4 },
                        }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: t.text }}>Pending</Typography>
                        <Typography variant="body2" sx={{ color: t.yellow, fontWeight: 600 }}>{data.finance.reconciliation.pending}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.finance.reconciliation.pending}
                        sx={{
                          height: 8, borderRadius: 4,
                          bgcolor: `${t.yellow}22`,
                          '& .MuiLinearProgress-bar': { bgcolor: t.yellow, borderRadius: 4 },
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* FX P&L */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: data.finance.fxPnL > 0 ? t.green : t.red }}>
                    {fmt(data.finance.fxPnL)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: t.sub }}>FX P&L (This Month)</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Export Options */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}` }}>
                <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Export Reports</Typography>} />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.finance.exports.map(export_ => (
                      <Box key={export_.type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: `1px solid ${t.border}`, borderRadius: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: t.text, fontWeight: 600 }}>{export_.type}</Typography>
                          <Typography variant="caption" sx={{ color: t.sub }}>{export_.format} • {export_.period}</Typography>
                        </Box>
                        <Button size="small" variant="outlined" sx={{ borderColor: t.border, color: t.sub }}>
                          Export
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}

// ── Billing Account Settings Tab ────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, professional: 99, enterprise: 299 };
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'];
const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' }, { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' }, { code: 'BR', name: 'Brazil' },
];

function BillingAccountTab() {
  const t = useT();
  const [account, setAccount]       = useState<BillingAccount | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm]             = useState<UpdateBillingAccountPayload>({});
  const [changingPlan, setChangingPlan] = useState(false);
  const [planBusy, setPlanBusy]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    billingApi.getAccount()
      .then(r => {
        const acct = r.data as any;
        setAccount(acct);
        setForm({
          company_name:  acct.company_name,  billing_email: acct.billing_email,
          tax_id:        acct.tax_id,        address_line1: acct.address_line1,
          address_line2: acct.address_line2, city:          acct.city,
          state:         acct.state,         postal_code:   acct.postal_code,
          country:       acct.country,       currency:      acct.currency,
          auto_pay:      acct.auto_pay,      spend_limit:   acct.spend_limit,
        });
      })
      .catch(() => setToast({ msg: 'Failed to load account settings.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleField = (field: keyof UpdateBillingAccountPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | { value: unknown }>) =>
      setForm(p => ({ ...p, [field]: (e.target as any).value }));

  const save = () => {
    setSaving(true);
    billingApi.updateAccount(form)
      .then(r => { setAccount(r.data as any); setToast({ msg: 'Billing account updated successfully.', type: 'success' }); })
      .catch(() => setToast({ msg: 'Failed to save changes.', type: 'error' }))
      .finally(() => setSaving(false));
  };

  const changePlan = (newPlan: string) => {
    setPlanBusy(true);
    billingApi.changePlan(newPlan)
      .then(() => { load(); setChangingPlan(false); setToast({ msg: `Plan changed to ${newPlan}.`, type: 'success' }); })
      .catch(() => setToast({ msg: 'Failed to change plan.', type: 'error' }))
      .finally(() => setPlanBusy(false));
  };

  const inputSx = {
    '& .MuiInputLabel-root': { color: t.sub },
    '& .MuiOutlinedInput-root': {
      color: t.text,
      '& fieldset': { borderColor: t.border },
      '&:hover fieldset': { borderColor: t.sub },
      '&.Mui-focused fieldset': { borderColor: t.brand },
    },
  };

  const sectionSx = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, mb: 3, borderRadius: '6px' };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ color: t.text, fontWeight: 700 }}>Billing Account Settings</Typography>
          <Typography variant="body2" sx={{ color: t.sub }}>Manage your billing profile, address, and preferences</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          onClick={save} disabled={saving}
          sx={{ bgcolor: t.brand, '&:hover': { filter: 'brightness(1.1)' } }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </Box>

      {/* Plan */}
      <Card sx={sectionSx}>
        <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Current Plan</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={(account?.plan ?? 'free').toUpperCase()}
              sx={{
                bgcolor: `${PLAN_COLOR[(account?.plan ?? 'free') as PlanTier]}22`,
                color: PLAN_COLOR[(account?.plan ?? 'free') as PlanTier],
                border: `1px solid ${PLAN_COLOR[(account?.plan ?? 'free') as PlanTier]}44`,
                fontWeight: 700, fontSize: '.75rem', px: 0.5,
              }}
            />
            <Typography sx={{ color: t.sub }}>{fmt(account?.plan_price ?? 0)}/month</Typography>
            {(account?.credit_balance ?? 0) > 0 && (
              <Chip label={`${fmt(account!.credit_balance)} credits`} size="small"
                sx={{ bgcolor: `${t.green}22`, color: t.green, border: `1px solid ${t.green}44`, fontWeight: 600 }} />
            )}
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" onClick={() => setChangingPlan(p => !p)}
              sx={{ borderColor: t.border, color: t.sub, '&:hover': { borderColor: t.brand, color: t.brand } }}>
              {changingPlan ? 'Cancel' : 'Change Plan'}
            </Button>
          </Box>
          {changingPlan && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {(['free', 'starter', 'professional', 'enterprise'] as PlanTier[]).map(p => (
                <Card key={p} onClick={() => !planBusy && changePlan(p)} sx={{
                  flex: '1 1 140px', minWidth: 140, cursor: 'pointer',
                  bgcolor: account?.plan === p ? `${t.brand}15` : t.panelBg,
                  border: `1px solid ${account?.plan === p ? t.brand : t.border}`,
                  borderRadius: '6px', transition: 'border .15s, background .15s',
                  '&:hover': { borderColor: t.brand }, opacity: planBusy ? 0.6 : 1,
                }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography sx={{ color: t.text, fontWeight: 700, textTransform: 'capitalize', mb: 0.5 }}>{p}</Typography>
                    <Typography sx={{ color: t.brand, fontWeight: 800, fontSize: '1.1rem' }}>
                      {p === 'free' ? 'Free' : `${fmt(PLAN_PRICES[p])}/mo`}
                    </Typography>
                    {account?.plan === p && <Typography variant="caption" sx={{ color: t.green }}>Current</Typography>}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Business information */}
      <Card sx={sectionSx}>
        <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Business Information</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Company Name" value={form.company_name ?? ''} onChange={handleField('company_name')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Billing Email" type="email" value={form.billing_email ?? ''} onChange={handleField('billing_email')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Tax ID / VAT Number" value={form.tax_id ?? ''} onChange={handleField('tax_id')} fullWidth sx={inputSx} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Billing address */}
      <Card sx={sectionSx}>
        <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Billing Address</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Address Line 1" value={form.address_line1 ?? ''} onChange={handleField('address_line1')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address Line 2" value={form.address_line2 ?? ''} onChange={handleField('address_line2')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField label="City" value={form.city ?? ''} onChange={handleField('city')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="State / Region" value={form.state ?? ''} onChange={handleField('state')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Postal Code" value={form.postal_code ?? ''} onChange={handleField('postal_code')} fullWidth sx={inputSx} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Country</InputLabel>
                <Select value={form.country ?? ''} label="Country" onChange={handleField('country') as any} sx={{ color: t.text }}>
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Billing preferences */}
      <Card sx={sectionSx}>
        <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Billing Preferences</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Currency</InputLabel>
                <Select value={form.currency ?? 'USD'} label="Currency" onChange={handleField('currency') as any} sx={{ color: t.text }}>
                  {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                label="Spend Limit (USD)"
                type="number"
                value={form.spend_limit ?? ''}
                onChange={(e) => setForm(p => ({ ...p, spend_limit: e.target.value === '' ? null : Number(e.target.value) }))}
                placeholder="No limit"
                fullWidth sx={inputSx}
                helperText={<Typography variant="caption" sx={{ color: t.sub }}>Leave blank for no limit</Typography>}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.auto_pay ?? false}
                    onChange={(e) => setForm(p => ({ ...p, auto_pay: e.target.checked }))}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: t.brand },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: t.brand },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ color: t.text, fontWeight: 600 }}>Auto-Pay</Typography>
                    <Typography variant="caption" sx={{ color: t.sub }}>
                      Automatically charge your default payment method when invoices are due
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Read-only meta */}
      {account && (
        <Card sx={{ ...sectionSx, mb: 0 }}>
          <CardHeader title={<Typography sx={{ color: t.text, fontWeight: 700 }}>Account Details</Typography>} />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              {([
                ['Account ID',   String(account.id)],
                ['Created',      new Date(account.created_at).toLocaleDateString()],
                ['Last Updated', new Date(account.updated_at).toLocaleDateString()],
              ] as [string, string][]).map(([label, value]) => (
                <Grid key={label} item xs={12} sm={4}>
                  <Typography variant="caption" sx={{ color: t.sub, textTransform: 'uppercase', fontWeight: 600, fontSize: '.65rem' }}>{label}</Typography>
                  <Typography sx={{ color: t.text, fontFamily: 'monospace', mt: 0.25 }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert severity={toast?.type ?? 'info'} onClose={() => setToast(null)} sx={{ minWidth: 280 }}>
          {toast?.msg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

const TABS = ['Overview', 'Invoices', 'Usage', 'Payment Methods', 'Payments Board', 'Account Settings'] as const;

// ── Billing-specific AppBar header ───────────────────────────────────────────

type BillingNotif = {
  message: string;
  detail:  string;
  color:   string;
};

function BillingHeader({
  onRefresh, overview, onNavigateTab,
}: {
  onRefresh: () => void;
  overview: BillingOverview | null;
  onNavigateTab: (tab: number) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { user, logout } = useAuth() as any;
  const { mode, toggleTheme } = useColorMode();
  const isDark = mode === 'dark';
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor,   setNotifAnchor]   = useState<null | HTMLElement>(null);
  const BLUE = t.brand;
  const DIVIDER = t.border;

  const notifications = useMemo((): BillingNotif[] => {
    if (!overview) return [];
    const items: BillingNotif[] = [];

    if (overview.open_balance > 0)
      items.push({
        message: `Unpaid balance: ${fmt(overview.open_balance)}`,
        detail:  'Payment is required to avoid service interruption.',
        color:   t.red,
      });

    if (overview.account?.spend_limit && overview.current_spend > overview.account.spend_limit * 0.8)
      items.push({
        message: 'Approaching spend limit',
        detail:  `${fmt(overview.current_spend)} used of ${fmt(overview.account.spend_limit)} limit.`,
        color:   t.yellow,
      });

    if (overview.projected > overview.current_spend * 1.3 && overview.projected > 0)
      items.push({
        message: 'Projected spend is elevated',
        detail:  `${fmt(overview.projected)} projected this billing cycle.`,
        color:   t.yellow,
      });

    if (overview.account && !overview.account.auto_pay)
      items.push({
        message: 'Auto-pay is disabled',
        detail:  'Enable auto-pay to prevent missed payments.',
        color:   t.yellow,
      });

    if (overview.credit_balance > 0)
      items.push({
        message: `Credit balance available`,
        detail:  `${fmt(overview.credit_balance)} in credits will be applied to your next invoice.`,
        color:   t.blue,
      });

    return items;
  }, [overview, t.red, t.yellow, t.blue]);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: t.cardBg,
        borderBottom: `1px solid ${DIVIDER}`,
        color: t.text,
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ gap: 1.5, px: { xs: 1.5, md: 3 }, minHeight: '64px !important' }}>

        {/* Logo + back */}
        <Box
          onClick={() => navigate('/dashboard')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            cursor: 'pointer', mr: 1,
            '&:hover': { opacity: 0.85 },
          }}
        >
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '4px',
              bgcolor: BLUE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: '#fff', fontSize: '.85rem',
              letterSpacing: '-.02em', flexShrink: 0,
            }}
          >
            A
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontWeight: 800, fontSize: '.9rem', color: t.text, lineHeight: 1.1, letterSpacing: '-.01em' }}>
              OrcaCloud
            </Typography>
            <Typography sx={{ fontSize: '.65rem', color: t.sub, lineHeight: 1 }}>
              Cloud Platform
            </Typography>
          </Box>
        </Box>

        {/* Search */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' }, alignItems: 'center',
            flex: 1, maxWidth: 380,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            borderRadius: '4px',
            px: 1.5, py: 0.5, gap: 1,
            border: `1px solid ${DIVIDER}`,
            '&:focus-within': { border: `1px solid ${BLUE}`, bgcolor: t.cardBg },
            transition: 'border .15s',
          }}
        >
          <SearchIcon sx={{ color: t.sub, fontSize: '1rem', flexShrink: 0 }} />
          <InputBase
            placeholder="Search invoices, payments…"
            sx={{ flex: 1, fontSize: '.875rem', color: t.text, '& input::placeholder': { color: t.sub } }}
          />
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Back to dashboard */}
        <Tooltip title="Back to Dashboard">
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
            onClick={() => navigate('/dashboard')}
            size="small"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              color: t.sub, fontSize: '.8rem', fontWeight: 600,
              border: `1px solid ${DIVIDER}`,
              borderRadius: '4px', px: 1.5, py: 0.5,
              '&:hover': { bgcolor: `${BLUE}11`, borderColor: BLUE, color: BLUE },
              transition: 'all .15s',
            }}
          >
            Dashboard
          </Button>
        </Tooltip>

        {/* Refresh */}
        <Tooltip title="Refresh billing data">
          <IconButton onClick={onRefresh} sx={{ color: t.sub, '&:hover': { color: BLUE } }}>
            <RefreshIcon sx={{ fontSize: '1.15rem' }} />
          </IconButton>
        </Tooltip>

        {/* Dark/Light toggle */}
        <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <IconButton
            onClick={toggleTheme}
            sx={{ color: t.sub, borderRadius: '4px', '&:hover': { color: BLUE, bgcolor: `${BLUE}11` }, transition: 'all .15s' }}
          >
            {isDark
              ? <LightModeIcon sx={{ fontSize: '1.15rem' }} />
              : <DarkModeIcon  sx={{ fontSize: '1.15rem' }} />}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Billing Notifications">
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: t.sub, '&:hover': { color: t.text } }}>
            <Badge
              badgeContent={notifications.length}
              color={notifications.some(n => n.color === t.red) ? 'error' : 'warning'}
              sx={{ '& .MuiBadge-badge': { fontSize: '.6rem', minWidth: 16, height: 16 } }}
            >
              <NotificationsIcon sx={{ fontSize: '1.2rem' }} />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{ sx: { width: 340, mt: 1, borderRadius: '4px', boxShadow: 'none', border: `1px solid ${DIVIDER}`, bgcolor: t.cardBg } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${DIVIDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography fontWeight={700} fontSize=".9rem" sx={{ color: t.text }}>Billing Alerts</Typography>
            {notifications.length > 0 && (
              <Chip label={`${notifications.length} active`} size="small" sx={{ bgcolor: `${t.red}22`, color: t.red, fontWeight: 700, fontSize: '.65rem', height: 20 }} />
            )}
          </Box>
          {notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: '2rem', color: t.green, mb: 1 }} />
              <Typography fontSize=".82rem" sx={{ color: t.sub }}>No billing alerts</Typography>
            </Box>
          ) : (
            notifications.map((n, i) => (
              <MenuItem key={i} disableRipple sx={{ py: 1.25, gap: 1.5, alignItems: 'flex-start', borderBottom: i < notifications.length - 1 ? `1px solid ${DIVIDER}` : 'none', '&:hover': { bgcolor: `${n.color}0d` } }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.color, mt: 0.6, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontSize=".82rem" fontWeight={600} sx={{ color: t.text, lineHeight: 1.3 }}>{n.message}</Typography>
                  <Typography fontSize=".72rem" sx={{ color: t.sub, mt: 0.25, lineHeight: 1.4 }}>{n.detail}</Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>

        {/* User profile */}
        <Box
          onClick={(e) => setProfileAnchor(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 1, py: 0.5, borderRadius: '4px',
            cursor: 'pointer', border: `1px solid ${DIVIDER}`,
            '&:hover': { borderColor: BLUE },
            transition: 'border .15s',
          }}
        >
          <Avatar sx={{ width: 28, height: 28, bgcolor: BLUE, fontSize: '.75rem', fontWeight: 700 }}>
            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </Avatar>
          <Typography sx={{ fontSize: '.82rem', fontWeight: 600, color: t.text, display: { xs: 'none', sm: 'block' } }}>
            {user?.first_name || user?.username}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: '.85rem', color: t.sub, display: { xs: 'none', sm: 'block' } }} />
        </Box>
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { minWidth: 220, mt: 1, borderRadius: '4px', boxShadow: 'none', border: `1px solid ${DIVIDER}`, bgcolor: t.cardBg } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${DIVIDER}` }}>
            <Typography fontWeight={700} fontSize=".875rem" sx={{ color: t.text }}>
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
            </Typography>
            <Typography fontSize=".75rem" sx={{ color: t.sub }}>{user?.email}</Typography>
          </Box>
          <MenuItem onClick={() => { setProfileAnchor(null); navigate('/dashboard/settings'); }} sx={{ gap: 1.5, py: 1.25 }}>
            <Typography fontSize=".875rem" sx={{ color: t.text }}>Account Settings</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setProfileAnchor(null); onNavigateTab(5); }} sx={{ gap: 1.5, py: 1.25 }}>
            <Typography fontSize=".875rem" sx={{ color: t.text }}>Billing Account</Typography>
          </MenuItem>
          <Divider sx={{ borderColor: DIVIDER }} />
          <MenuItem onClick={() => { setProfileAnchor(null); logout(); navigate('/'); }} sx={{ gap: 1.5, py: 1.25 }}>
            <Typography fontSize=".875rem" sx={{ color: t.red }}>Sign Out</Typography>
          </MenuItem>
        </Menu>

      </Toolbar>
    </AppBar>
  );
}

export default function BillingPage() {
  const t = useT();
  const [tab, setTab]           = useState(0);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadOverview = useCallback(() => {
    setLoading(true);
    billingApi.overview()
      .then(r => setOverview(r.data as any))
      .catch(() => setError('Failed to load billing data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  return (
    <Box sx={{ bgcolor: t.panelBg, minHeight: '100vh' }}>
      <BillingHeader onRefresh={loadOverview} overview={overview} onNavigateTab={setTab} />

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ color: t.text, fontWeight: 700 }}>Billing & Payments</Typography>
            <Typography variant="body2" sx={{ color: t.sub }}>
              Manage your plan, invoices, usage and payment methods
            </Typography>
          </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {overview && (
            <Chip
              label={`Balance: ${fmt(overview.open_balance)}`}
              sx={{
                bgcolor: overview.open_balance > 0 ? `${t.red}22` : `${t.green}22`,
                color:   overview.open_balance > 0 ? t.red : t.green,
                border:  `1px solid ${overview.open_balance > 0 ? t.red : t.green}44`,
                fontWeight: 700,
              }}
            />
          )}
          <Tooltip title="Refresh"><IconButton onClick={loadOverview} sx={{ color: t.sub }}><RefreshIcon /></IconButton></Tooltip>
        </Box>
      </Box>

      {error && <MuiAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</MuiAlert>}

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3, borderBottom: `1px solid ${t.border}`,
          '& .MuiTab-root': { color: t.sub, textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: t.brand },
          '& .MuiTabs-indicator': { bgcolor: t.brand },
        }}
      >
        {TABS.map((l: string) => <Tab key={l} label={l} />)}
      </Tabs>

      {tab === 0 && <OverviewTab data={overview} loading={loading} />}
      {tab === 1 && <InvoicesTab />}
      {tab === 2 && <UsageTab />}
      {tab === 3 && <PaymentMethodsTab />}
      {tab === 4 && <PaymentsBoardTab />}
      {tab === 5 && <BillingAccountTab />}

      </Box>
    </Box>
  );
}
