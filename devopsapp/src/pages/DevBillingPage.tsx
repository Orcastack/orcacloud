import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { billingApi } from '../services/cloudApi';
import type { BillingOverview } from '../types/billing';

const DevBillingPage: React.FC = () => {
  const [data,    setData]    = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingApi.overview()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Pick compute/kubernetes/CI-CD from breakdown, fall back to generic top-3
  const breakdown = data?.usage_breakdown ?? [];
  const findSpend = (kw: string) =>
    breakdown.find(i => i.service?.toLowerCase().includes(kw))?.cost ?? 0;

  const computeSpend = findSpend('compute') || findSpend('instance') || findSpend('server');
  const k8sSpend     = findSpend('kubernetes') || findSpend('k8s');
  const cicdSpend    = findSpend('pipeline') || findSpend('ci') || findSpend('build');

  const cards = loading
    ? [{ label: 'Compute Spend', value: '…' }, { label: 'Kubernetes Spend', value: '…' }, { label: 'CI/CD Spend', value: '…' }]
    : [
        { label: 'Compute Spend',    value: computeSpend ? fmt(computeSpend) : fmt(data?.current_spend ?? 0) },
        { label: 'Kubernetes Spend', value: k8sSpend ? fmt(k8sSpend) : '$0.00' },
        { label: 'CI/CD Spend',      value: cicdSpend  ? fmt(cicdSpend)  : '$0.00' },
      ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Developer Billing</Typography>
        {loading && <CircularProgress size={18} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cost and usage for engineering resources, clusters, and build workloads.
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

      {data && data.usage_breakdown.length > 0 && (
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Spend by Service</Typography>
            {data.usage_breakdown.slice(0, 8).map(item => (
              <Box key={item.service} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{item.service}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmt(item.cost)}</Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Total this period</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt(data.current_spend)}</Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DevBillingPage;
