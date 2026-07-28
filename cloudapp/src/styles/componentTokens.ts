// OrcaCloud Component Library Design Tokens
// Following IBM Carbon structure with OrcaCloud branding

export const componentTokens = {
  // Color tokens
  colors: {
    // Button colors
    button: {
      primary: {
        background: 'var(--ac-button-primary-bg)',
        backgroundHover: 'var(--ac-button-primary-bg-hover)',
        backgroundActive: 'var(--ac-button-primary-bg-active)',
        text: 'var(--ac-button-primary-text)',
        border: 'var(--ac-button-primary-border)',
      },
      secondary: {
        background: 'var(--ac-button-secondary-bg)',
        backgroundHover: 'var(--ac-button-secondary-bg-hover)',
        backgroundActive: 'var(--ac-button-secondary-bg-active)',
        text: 'var(--ac-button-secondary-text)',
        border: 'var(--ac-button-secondary-border)',
      },
      ghost: {
        background: 'var(--ac-button-ghost-bg)',
        backgroundHover: 'var(--ac-button-ghost-bg-hover)',
        backgroundActive: 'var(--ac-button-ghost-bg-active)',
        text: 'var(--ac-button-ghost-text)',
        border: 'var(--ac-button-ghost-border)',
      },
      danger: {
        background: 'var(--ac-button-danger-bg)',
        backgroundHover: 'var(--ac-button-danger-bg-hover)',
        backgroundActive: 'var(--ac-button-danger-bg-active)',
        text: 'var(--ac-button-danger-text)',
        border: 'var(--ac-button-danger-border)',
      },
      disabled: {
        background: 'var(--ac-button-disabled-bg)',
        text: 'var(--ac-button-disabled-text)',
        border: 'var(--ac-button-disabled-border)',
      },
    },

    // Input colors
    input: {
      default: {
        background: 'var(--ac-input-default-bg)',
        border: 'var(--ac-input-default-border)',
        text: 'var(--ac-input-default-text)',
        placeholder: 'var(--ac-input-placeholder-text)',
        label: 'var(--ac-input-label-text)',
        helper: 'var(--ac-input-helper-text)',
      },
      hover: {
        border: 'var(--ac-input-hover-border)',
      },
      focus: {
        border: 'var(--ac-input-focus-border)',
        outline: 'var(--ac-input-focus-outline)',
      },
      error: {
        border: 'var(--ac-input-error-border)',
        text: 'var(--ac-input-error-text)',
        helper: 'var(--ac-input-error-helper-text)',
      },
      disabled: {
        background: 'var(--ac-input-disabled-bg)',
        border: 'var(--ac-input-disabled-border)',
        text: 'var(--ac-input-disabled-text)',
        label: 'var(--ac-input-disabled-label-text)',
      },
    },

    // Card colors
    card: {
      background: 'var(--ac-card-bg)',
      border: 'var(--ac-card-border)',
      shadow: 'var(--ac-card-shadow)',
      header: {
        background: 'var(--ac-card-header-bg)',
        text: 'var(--ac-card-header-text)',
        subtitle: 'var(--ac-card-subtitle-text)',
      },
      body: {
        background: 'var(--ac-card-body-bg)',
        text: 'var(--ac-card-body-text)',
      },
      footer: {
        background: 'var(--ac-card-footer-bg)',
        border: 'var(--ac-card-footer-border)',
        text: 'var(--ac-card-footer-text)',
      },
    },
  },

  // Spacing tokens
  spacing: {
    xs: 'var(--ac-space-xs)', // 4px
    sm: 'var(--ac-space-sm)', // 8px
    md: 'var(--ac-space-md)', // 16px
    lg: 'var(--ac-space-lg)', // 24px
    xl: 'var(--ac-space-xl)', // 32px
    xxl: 'var(--ac-space-xxl)', // 48px
  },

  // Typography tokens
  typography: {
    fontFamily: 'var(--ac-font-family)',
    fontSize: {
      xs: 'var(--ac-font-size-xs)', // 12px
      sm: 'var(--ac-font-size-sm)', // 14px
      md: 'var(--ac-font-size-md)', // 16px
      lg: 'var(--ac-font-size-lg)', // 18px
      xl: 'var(--ac-font-size-xl)', // 20px
      xxl: 'var(--ac-font-size-xxl)', // 24px
    },
    fontWeight: {
      regular: 'var(--ac-font-weight-regular)', // 400
      medium: 'var(--ac-font-weight-medium)', // 500
      semibold: 'var(--ac-font-weight-semibold)', // 600
      bold: 'var(--ac-font-weight-bold)', // 700
    },
    lineHeight: {
      tight: 'var(--ac-line-height-tight)', // 1.25
      normal: 'var(--ac-line-height-normal)', // 1.5
      relaxed: 'var(--ac-line-height-relaxed)', // 1.75
    },
  },

  // Border radius tokens
  radius: {
    none: 'var(--ac-radius-none)', // 0px
    sm: 'var(--ac-radius-sm)', // 2px
    md: 'var(--ac-radius-md)', // 4px
    lg: 'var(--ac-radius-lg)', // 8px
    xl: 'var(--ac-radius-xl)', // 12px
    full: 'var(--ac-radius-full)', // 9999px
  },

  // Shadow tokens
  shadow: {
    none: 'var(--ac-shadow-none)',
    sm: 'var(--ac-shadow-sm)',
    md: 'var(--ac-shadow-md)',
    lg: 'var(--ac-shadow-lg)',
    xl: 'var(--ac-shadow-xl)',
  },

  // Component-specific tokens
  components: {
    button: {
      height: 'var(--ac-button-height)', // 48px
      paddingX: 'var(--ac-button-padding-x)', // 16px
      borderWidth: 'var(--ac-button-border-width)', // 1px
      transition: 'var(--ac-button-transition)', // all 0.2s ease-in-out
    },
    input: {
      height: 'var(--ac-input-height)', // 48px
      paddingX: 'var(--ac-input-padding-x)', // 12px
      paddingY: 'var(--ac-input-padding-y)', // 12px
      borderWidth: 'var(--ac-input-border-width)', // 1px
      borderRadius: 'var(--ac-input-border-radius)', // 4px
      focusOutlineWidth: 'var(--ac-input-focus-outline-width)', // 2px
      labelSpacing: 'var(--ac-input-label-spacing)', // 8px
      helperSpacing: 'var(--ac-input-helper-spacing)', // 4px
    },
    card: {
      padding: 'var(--ac-card-padding)', // 32px
      borderWidth: 'var(--ac-card-border-width)', // 1px
      borderRadius: 'var(--ac-card-border-radius)', // 4px
      headerPadding: 'var(--ac-card-header-padding)', // 0 0 16px 0
      footerPadding: 'var(--ac-card-footer-padding)', // 16px 0 0 0
      footerBorderWidth: 'var(--ac-card-footer-border-width)', // 1px
    },
  },
} as const;

// Semantic color mappings for component states
export const componentSemanticColors = {
  success: 'var(--ac-color-success)',
  warning: 'var(--ac-color-warning)',
  error: 'var(--ac-color-error)',
  info: 'var(--ac-color-info)',
} as const;

// Component variant types
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type InputState = 'default' | 'hover' | 'focus' | 'error' | 'disabled';
export type CardVariant = 'form' | 'dashboard' | 'content';
