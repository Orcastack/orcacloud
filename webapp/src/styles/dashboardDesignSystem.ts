export const dashboardTokens = {
  colors: {
    background: 'var(--dashboard-background)',
    surface: 'var(--dashboard-surface)',
    surfaceSubtle: 'var(--dashboard-surface-subtle)',
    surfaceHover: 'var(--dashboard-surface-hover)',
    border: 'var(--dashboard-border)',
    borderStrong: 'var(--dashboard-border-strong)',
    // IBM Carbon-aligned text tokens (resolved at runtime via CSS vars per theme)
    textPrimary: 'var(--dashboard-text-primary)',     // #161616 light / #f4f4f4 dark
    textSecondary: 'var(--dashboard-text-secondary)', // #525252 light / #c6c6c6 dark
    textTertiary: 'var(--dashboard-text-tertiary)',   // #A8A8A8 light / #8d8d8d dark
    textPlaceholder: 'var(--dashboard-text-placeholder)', // #A8A8A8 light / #8d8d8d dark
    brandPrimary: '#153d75',
    brandPrimaryHover: '#0f2d5a',
    white: '#FFFFFF',
  },
  radius: {
    sm: 1,
    md: 1,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
} as const;

export const dashboardSemanticColors = {
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#153d75',
  infoAlt: '#0f2d5a',
  purple: '#8B5CF6',
  orange: '#F97316',
  cyan: '#153d75',
  teal: '#00C8E5',
  pink: '#EC4899',
  critical: '#DC2626',
} as const;

export const dashboardStatusColors = {
  invoice: {
    draft: dashboardSemanticColors.purple,
    open: dashboardSemanticColors.warning,
    paid: dashboardSemanticColors.success,
    void: '#6B7280',
    uncollectable: dashboardSemanticColors.danger,
  },
  domain: {
    active: dashboardSemanticColors.success,
    pending: dashboardSemanticColors.warning,
    expired: dashboardSemanticColors.danger,
    suspended: dashboardSemanticColors.danger,
    transferring: dashboardSemanticColors.info,
    deleting: '#6B7280',
    error: dashboardSemanticColors.danger,
  },
  ssl: {
    active: dashboardSemanticColors.success,
    pending: dashboardSemanticColors.warning,
    expired: dashboardSemanticColors.danger,
    revoked: '#6B7280',
    error: dashboardSemanticColors.danger,
  },
  monitoringService: {
    operational: dashboardSemanticColors.success,
    degraded: dashboardSemanticColors.warning,
    partial_outage: dashboardSemanticColors.orange,
    major_outage: dashboardSemanticColors.danger,
    maintenance: dashboardSemanticColors.purple,
  },
  incidentSeverity: {
    sev1: dashboardSemanticColors.danger,
    sev2: dashboardSemanticColors.orange,
    sev3: dashboardSemanticColors.warning,
    sev4: dashboardSemanticColors.info,
  },
  incidentStatus: {
    open: dashboardSemanticColors.danger,
    investigating: dashboardSemanticColors.orange,
    identified: dashboardSemanticColors.warning,
    monitoring: dashboardSemanticColors.info,
    resolved: dashboardSemanticColors.success,
    postmortem: dashboardSemanticColors.purple,
  },
  alertState: {
    firing: dashboardSemanticColors.danger,
    resolved: dashboardSemanticColors.success,
    silenced: dashboardSemanticColors.purple,
  },
  logLevel: {
    INFO: dashboardSemanticColors.info,
    WARNING: dashboardSemanticColors.warning,
    ERROR: dashboardSemanticColors.danger,
    DEBUG: dashboardSemanticColors.purple,
    CRITICAL: dashboardSemanticColors.critical,
  },
  plan: {
    free: '#6B7280',
    starter: dashboardSemanticColors.info,
    professional: dashboardSemanticColors.purple,
    enterprise: dashboardSemanticColors.warning,
  },
  service: {
    compute: dashboardSemanticColors.info,
    storage: dashboardSemanticColors.success,
    database: dashboardSemanticColors.purple,
    networking: dashboardSemanticColors.warning,
    containers: dashboardSemanticColors.orange,
    email: dashboardSemanticColors.cyan,
    dns: dashboardSemanticColors.pink,
    api: dashboardSemanticColors.teal,
  },
} as const;

export const computeCatalogPalette = {
  logos: {
    debian: '#A80030',
    ubuntu: '#E95420',
    linuxMint: '#87CF3E',
    kali: '#268BEE',
    mxLinux: '#4A90D9',
    deepin: '#0098D8',
    zorin: '#15A6F0',
    elementary: '#64BAFF',
    popos: '#48B9C7',
    antix: '#6B7280',
    pureos: '#5B3A8E',
    parrot: '#05A6E3',
    bodhi: '#4CAF50',
    peppermint: '#E44426',
    centos: '#9B0000',
    windows: '#0078D4',
  },
  badges: {
    recommended: '#10B981',
    latest: '#10B981',
    stable: '#10B981',
    new: '#153d75', // OrcaCloud brand color
    security: '#153d75', // OrcaCloud brand color
    enterprise: '#6B7280',
    eol: '#EF4444',
    eolSoon: '#F59E0B',
    flavorBadge: '#153d75', // OrcaCloud brand color
  },
} as const;

export const computeUiTokens = {
  accentStrong: '#153d75',
  accentSoftLight: 'rgba(21,61,117,.08)',
  accentSoftDark: 'rgba(21,61,117,.18)',
  darkPanel: '#161616', // Carbon Gray 100 - Elevated surfaces
  successStrong: '#10B981',
  successHover: '#059669',
  successSoft: 'rgba(16,185,129,.12)',
  violetSoft: 'rgba(21,61,117,.12)',
  neutralStrong: '#262626', // Carbon Gray 90 - Primary background
  neutralBody: '#c6c6c6', // Carbon Gray 30
  neutralMuted: '#a8a8a8', // Carbon Gray 40
  surfaceSubtle: '#393939', // Carbon Gray 80 - Secondary background
  borderHover: '#737373', // Carbon Gray 60
} as const;

// ── IBM Carbon text tokens ─────────────────────────────────────────────────
// Matches IBM Carbon Design System neutral-gray text hierarchy.
// Rule: never use #000000 or #FFFFFF for text — always use these tokens.
export const carbonTextTokens = {
  light: {
    primary:     '#161616', // Gray 100 — body text, labels, table cells
    secondary:   '#525252', // Gray 70  — captions, helper text
    placeholder: '#A8A8A8', // Gray 40  — input placeholders
    disabled:    '#C6C6C6', // Gray 30  — disabled state text
    onColor:     '#FFFFFF', // White    — text on filled colored backgrounds
  },
  dark: {
    primary:     '#f4f4f4', // Gray 10  — body text, labels, table cells
    secondary:   '#c6c6c6', // Gray 30  — captions, helper text
    placeholder: '#8d8d8d', // Gray 50  — input placeholders
    disabled:    '#6f6f6f', // Gray 60  — disabled state text
    onColor:     '#161616', // Gray 100 — text on light colored backgrounds
  },
} as const;

export const orcacloudBrandTokens = {
  colorPrimary: '#262626', // Carbon Gray 90 - Primary background
  colorPrimaryContrast: '#f4f4f4', // Carbon Gray 10 - Text on dark
  colorAccent: '#153d75',
  colorAccentHover: '#0f2d5a',
  colorTextPrimary: '#f4f4f4', // Carbon Gray 10
  colorTextSecondary: '#c6c6c6', // Carbon Gray 30
  colorBorder: '#525252', // Carbon Gray 70 - Borders/separators
  colorSurface: '#161616', // Carbon Gray 100 - Elevated surfaces
  radiusSmall: '2px',
  radiusNone: '0px',
} as const;

export const dashboardPageSx = {
  bgcolor: dashboardTokens.colors.background,
} as const;

export const dashboardCardSx = {
  border: `1px solid ${dashboardTokens.colors.border}`,
  boxShadow: 'none',
  borderRadius: dashboardTokens.radius.md,
  bgcolor: dashboardTokens.colors.surface,
} as const;

export const dashboardPrimaryButtonSx = {
  bgcolor: dashboardTokens.colors.brandPrimary,
  textTransform: 'none',
  fontWeight: 500,
  '&:hover': {
    bgcolor: dashboardTokens.colors.brandPrimaryHover,
  },
} as const;

export const dashboardSecondaryButtonSx = {
  borderColor: dashboardTokens.colors.borderStrong,
  color: dashboardTokens.colors.textPrimary,
  textTransform: 'none',
} as const;

/**
 * OrcaCloud Tokens — IBM Carbon White theme-aligned
 *
 * Use these `var(--ac-*)` references in MUI `sx` props wherever you need
 * canonical background, layer, or text colours that track the Carbon spec.
 * The CSS custom properties themselves are defined in:
 *   - `styles/professional.css`  (standalone CSS fallback)
 *   - `contexts/ThemeContext.tsx` (injected via MuiCssBaseline for both themes)
 */
export const acCloudTokens = {
  // Backgrounds
  bgPrimary:     'var(--ac-bg-primary)',    // Carbon White 0  / Gray 100 dark
  bgSecondary:   'var(--ac-bg-secondary)',  // Carbon Gray 10  / Gray 90  dark
  bgTertiary:    'var(--ac-bg-tertiary)',   // Carbon Gray 20  / Gray 80  dark

  // Layers
  layer01:       'var(--ac-layer-01)',
  layer02:       'var(--ac-layer-02)',
  layer03:       'var(--ac-layer-03)',

  // Text
  textPrimary:   'var(--ac-text-primary)',   // Carbon Gray 100 / Gray 10  dark
  textSecondary: 'var(--ac-text-secondary)', // Carbon Gray 70  / Gray 40  dark
  textInverse:   'var(--ac-text-inverse)',   // text on dark/light surfaces
} as const;
