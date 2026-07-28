import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Stack, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { marketingSuiteApi } from '../services/cloudApi';
import type { MarketingOverviewResponse } from '../types/marketing';
import { dashboardCardSx, dashboardPrimaryButtonSx, dashboardTokens } from '../styles/dashboardDesignSystem';

const MarketingOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MarketingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await marketingSuiteApi.overview();
        setData((res as any).data || null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (!data) {
    return <Box sx={{ p: 3 }}><Typography color="text.secondary">No marketing overview data available.</Typography></Box>;
  }

  const m = data.top_metrics;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: dashboardTokens.colors.background }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: dashboardTokens.colors.textPrimary }}>Marketing Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enterprise view across campaigns, audience, SEO, experiments, content, and spend.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Total Campaigns</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.total_campaigns}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Active Campaigns</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.active_campaigns}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Audience Size</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.audience_size.toLocaleString()}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Monthly Spend</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>${m.monthly_spend.toLocaleString()}</Typography></CardContent></Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 1.5, mb: 2 }}>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Overall ROI</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.overall_roi}x</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">SEO Score</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.seo_score}</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Deliverability</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{m.deliverability_score}%</Typography></CardContent></Card>
        <Card sx={dashboardCardSx}><CardContent><Typography variant="caption" color="text.secondary">Avg Engagement</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{(m.avg_engagement_rate * 100).toFixed(1)}%</Typography></CardContent></Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 1.5, mb: 2 }}>
        <Card sx={dashboardCardSx}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Live Activity</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Running Campaigns</Typography>
            <Stack gap={0.5} mb={1.5}>
              {data.live_activity.running_campaigns.length === 0 ? <Typography variant="body2">No running campaigns</Typography> : data.live_activity.running_campaigns.map((item) => (
                <Typography key={item.id} variant="body2">{item.name} · {item.channel}</Typography>
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Active Experiments</Typography>
            <Stack gap={0.5}>
              {data.live_activity.active_experiments.length === 0 ? <Typography variant="body2">No active experiments</Typography> : data.live_activity.active_experiments.map((item) => (
                <Typography key={item.id} variant="body2">{item.name}</Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={dashboardCardSx}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Insights</Typography>
            <Typography variant="body2"><strong>Best channel:</strong> {data.insights.best_channel}</Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}><strong>Best segment:</strong> {data.insights.best_segment}</Typography>
            <Typography variant="body2" color="text.secondary">SEO Opportunities</Typography>
            <Stack gap={0.5} mb={1.5}>
              {data.insights.seo_opportunities.map((item, index) => <Typography key={index} variant="body2">• {item}</Typography>)}
            </Stack>
            <Typography variant="body2" color="text.secondary">AI Recommendations</Typography>
            <Stack gap={0.5}>
              {data.insights.ai_recommendations.map((item, index) => <Typography key={index} variant="body2">• {item}</Typography>)}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card sx={dashboardCardSx}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Quick Actions</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {data.quick_actions.map((action) => (
              <Button key={action.label} variant="contained" size="small" onClick={() => navigate(action.route)} sx={dashboardPrimaryButtonSx}>
                {action.label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketingOverviewPage;
