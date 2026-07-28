import { dashboardTokens } from './dashboardDesignSystem';

export const dashboardPageHeaderSx = {
  bgcolor: dashboardTokens.colors.surface,
  borderBottom: `1px solid ${dashboardTokens.colors.border}`,
  px: { xs: 2, md: 4 },
  pt: 2.5,
  pb: 2,
} as const;

export const dashboardSectionHeadingSx = {
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: dashboardTokens.colors.textSecondary,
  mb: 1.5,
} as const;

export const dashboardSummaryGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
  gap: 1.5,
} as const;

export const dashboardSummaryCardSx = {
  border: `1px solid ${dashboardTokens.colors.border}`,
  borderRadius: '8px',
  bgcolor: dashboardTokens.colors.surface,
  p: 2,
} as const;
