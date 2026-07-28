import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { billingApi, marketingApi } from '../services/cloudApi';
import type { BillingOverview } from '../types/billing';
import type { AccountStats } from '../types/marketing';

const MarketingBillingPage: React.FC = () => {
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [stats,   setStats]   = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      billingApi.overview().then(r => setBilling(r.data)).catch(() => null),
      marketingApi.accountStats().then(r => setStats(r.data)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const breakdown  = billing?.usage_breakdown ?? [];
  const findSpend  = (kw: string) =>
    breakdown.find(i => i.service?.toLowerCase().includes(kw))?.cost ?? 0;

  const campaignSpend = findSpend('campaign') || findSpend('marketing') || findSpend('email');
  const adSpend       = findSpend('ad') || findSpend('platform');
  const contentSpend  = findSpend('content') || findSpend('storage');

  const cards = loading
    ? [{ label: 'Campaign Spend', value: '…' }, { label: 'Ad Platforms', value: '…' }, { label: 'Content Production', value: '…' }]
    : [
        { label: 'Campaign Spend',    value: fmt(campaignSpend || billing?.current_spend || 0) },
        { label: 'Ad Platforms',      value: fmt(adSpend) },
        { label: 'Content Production',value: fmt(contentSpend) },
      ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Marketing Billing</Typography>
        {loading && <CircularProgress size={18} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Budget and spend tracking for campaigns, channels, and acquisition programs.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 1.5, mb: 2.5 }}>
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{c.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5 }}>
          {[
            { label: 'Total Campaigns',      value: stats.campaigns      ?? 0 },
            { label: 'Total Contacts',       value: (stats.total_contacts ?? 0).toLocaleString() },
            { label: 'Avg Open Rate',        value: stats.avg_open_rate    != null ? `${stats.avg_open_rate.toFixed(1)}%` : '—' },
            { label: 'Avg Click Rate',       value: stats.avg_click_rate   != null ? `${stats.avg_click_rate.toFixed(1)}%` : '—' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{s.value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MarketingBillingPage;
