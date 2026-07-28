import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLocation } from 'react-router-dom';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ___ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(___ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme configuration
const ___lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#153d75',
      dark: '#0f2d5a',
      light: '#33a0a0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0A0F1F',
      dark: '#060A16',
      light: '#1A2038',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      // IBM Carbon Gray 100 / Gray 70 — enterprise text hierarchy
      primary: '#161616',   // Carbon Gray 100
      secondary: '#525252', // Carbon Gray 70
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#111827',
    },
    success: {
      main: '#10b981',
      dark: '#059669',
      light: '#34d399',
    },
    warning: {
      main: '#f59e0b',
      dark: '#d97706',
      light: '#fbbf24',
    },
    error: {
      main: '#ef4444',
      dark: '#dc2626',
      light: '#f87171',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '3.5rem',
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2.75rem',
      lineHeight: 1.12,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '2.25rem',
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.42,
      letterSpacing: '-0.003em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      letterSpacing: '-0.002em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
  },
  shape: {
    borderRadius: 2,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.05)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],
  components: {
      MuiTypography: {
        styleOverrides: {
          root: {
            // Default typography color should use the theme's primary text color
            color: '#161616',   // aligned to Carbon Gray 100
          },
        },
      },
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--color-primary': '#111827',
          '--color-primary-contrast': '#FFFFFF',
          '--color-accent': '#153d75',
          '--color-accent-hover': '#0f2d5a',
          '--color-text-primary': '#FFFFFF',
          '--color-text-secondary': '#A0A8B5',
          '--color-border': '#1F2937',
          '--color-surface': '#111827',
          '--dashboard-background': '#FFFFFF',
          '--dashboard-surface': '#FFFFFF',
          '--dashboard-surface-subtle': '#F4F4F4',   // aligned to Carbon Gray 10
          '--dashboard-surface-hover': '#F0F0F0',
          '--dashboard-border': '#E5E7EB',
          '--dashboard-text-primary': '#161616',   /* IBM Carbon Gray 100 */
          '--dashboard-text-secondary': '#525252',  /* IBM Carbon Gray 70  */
          '--dashboard-text-tertiary': '#A8A8A8',   /* IBM Carbon Gray 40  */
          '--dashboard-text-placeholder': '#A8A8A8',/* IBM Carbon Gray 40  */
          '--radius-small': '2px',
          '--radius-none': '0px',
          // OrcaCloud Tokens — IBM Carbon White theme
          '--ac-bg-primary':   '#FFFFFF',
          '--ac-bg-secondary': '#F4F4F4',
          '--ac-bg-tertiary':  '#E0E0E0',
          '--ac-layer-01': '#FFFFFF',
          '--ac-layer-02': '#F4F4F4',
          '--ac-layer-03': '#E0E0E0',
          '--ac-text-primary':   '#161616',
          '--ac-text-secondary': '#525252',
          '--ac-text-inverse':   '#F4F4F4',
        },
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: '#FFFFFF',
          color: '#161616', /* IBM Carbon Gray 100 */
          fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontFeatureSettings: '"cv11", "ss01"',
          fontVariationSettings: '"opsz" 32',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        'input, button, textarea, select': {
          fontFamily: 'inherit',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.95rem',
          lineHeight: 1.2,
          padding: '10px 22px',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        /* ── Contained: solid fill with a subtle directional gradient ── */
        contained: {
          background: 'linear-gradient(135deg, #1e4d8c 0%, #153d75 60%, #0f2d5a 100%)',
          color: '#ffffff',
          boxShadow: '0 1px 3px rgba(21,61,117,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
          '&:hover': {
            background: 'linear-gradient(135deg, #245699 0%, #1a4788 60%, #153d75 100%)',
            boxShadow: '0 4px 12px rgba(21,61,117,0.45)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 3px rgba(21,61,117,0.35)',
          },
        },
        /* ── Outlined: 2px accent border, transparent fill ── */
        outlined: {
          border: '2px solid #153d75',
          color: '#153d75',
          backgroundColor: 'transparent',
          letterSpacing: '0.01em',
          '&:hover': {
            border: '2px solid #0f2d5a',
            color: '#0f2d5a',
            backgroundColor: 'rgba(21,61,117,0.06)',
            boxShadow: 'none',
          },
        },
        /* ── Text: no border, colour-sweep underline on hover ── */
        text: {
          color: '#153d75',
          padding: '10px 14px',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 6,
            left: 14,
            right: 14,
            height: '2px',
            borderRadius: '1px',
            backgroundColor: '#153d75',
            transform: 'scaleX(0)',
            transition: 'transform 0.15s cubic-bezier(0.4,0,0.2,1)',
          },
          '&:hover': {
            backgroundColor: 'rgba(21,61,117,0.05)',
            color: '#0f2d5a',
          },
          '&:hover::after': {
            transform: 'scaleX(1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
          transition: 'border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: '#cbd5e1',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #e2e8f0',
        },
        elevation1: {
          boxShadow: 'none',
        },
        elevation2: {
          boxShadow: 'none',
        },
        elevation3: {
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #e2e8f0',
          color: '#111827',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
          transition: 'background-color 0.12s cubic-bezier(0.4, 0, 0.2, 1), color 0.12s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          transition: 'background-color 0.12s cubic-bezier(0.4, 0, 0.2, 1), color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(0, 224, 255, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            transition: 'border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            '&.Mui-focused': {
              boxShadow: 'none',
            },
          },
        },
      },
    },
  },
});

// Dark theme configuration
const ___darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#525252', // Carbon Gray 70 - for buttons/links in dark mode
      dark: '#393939', // Carbon Gray 80
      light: '#6b6b6b', // Carbon Gray 60
      contrastText: '#f4f4f4', // Carbon Gray 10
    },
    secondary: {
      main: '#0f1419',
      dark: '#060A16',
      light: '#1A2038',
      contrastText: '#ffffff',
    },
    background: {
      // IBM Carbon Dark Theme Colors
      default: '#262626', // Gray 90 - Primary background
      paper:   '#161616', // Gray 100 - Elevated surfaces/cards/panels
    },
    text: {
      // IBM Carbon Gray 10 / Gray 30 — enterprise dark text hierarchy
      primary:   '#f4f4f4', // Carbon Gray 10
      secondary: '#c6c6c6', // Carbon Gray 30
    },
    grey: {
      // IBM Carbon Gray Scale for Dark Theme
      50: '#f4f4f4',   // Gray 10
      100: '#e0e0e0',  // Gray 20
      200: '#c6c6c6',  // Gray 30
      300: '#a8a8a8',  // Gray 40
      400: '#8d8d8d',  // Gray 50
      500: '#737373',  // Gray 60
      600: '#525252',  // Gray 70 - Borders/separators
      700: '#393939',  // Gray 80 - Secondary background
      800: '#262626',  // Gray 90 - Primary background
      900: '#161616',  // Gray 100 - Elevated surfaces
    },
    success: {
      main: '#34d399',
      dark: '#10b981',
      light: '#6ee7b7',
    },
    warning: {
      main: '#fbbf24',
      dark: '#f59e0b',
      light: '#fcd34d',
    },
    error: {
      main: '#f87171',
      dark: '#ef4444',
      light: '#fca5a5',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '3.5rem',
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2.75rem',
      lineHeight: 1.12,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '2.25rem',
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.42,
      letterSpacing: '-0.003em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
      letterSpacing: '-0.002em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '-0.005em',
    },
  },
  shape: {
    borderRadius: 2,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.3)',
    '0px 4px 6px -1px rgba(0, 0, 0, 0.4), 0px 2px 4px -1px rgba(0, 0, 0, 0.3)',
    '0px 10px 15px -3px rgba(0, 0, 0, 0.4), 0px 4px 6px -2px rgba(0, 0, 0, 0.3)',
    '0px 20px 25px -5px rgba(0, 0, 0, 0.4), 0px 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
    '0px 25px 50px -12px rgba(0, 0, 0, 0.5)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--color-primary': '#262626', // Carbon Gray 90 - Primary background
          '--color-primary-contrast': '#f4f4f4', // Carbon Gray 10 - Text on dark
          '--color-accent': '#153d75',
          '--color-accent-hover': '#0f2d5a',
          '--color-text-primary': '#f4f4f4', // Carbon Gray 10
          '--color-text-secondary': '#c6c6c6', // Carbon Gray 30
          '--color-border': '#525252', // Carbon Gray 70 - Borders/separators
          '--color-surface': '#161616', // Carbon Gray 100 - Elevated surfaces
          '--dashboard-background': '#262626', // Carbon Gray 90 - Primary background
          '--dashboard-surface': '#161616', // Carbon Gray 100 - Elevated surfaces
          '--dashboard-surface-subtle': '#393939', // Carbon Gray 80 - Secondary background
          '--dashboard-surface-hover': '#525252', // Carbon Gray 70
          '--dashboard-border': '#525252', // Carbon Gray 70 - Borders/separators
          '--dashboard-border-strong': '#737373', // Carbon Gray 60
          '--dashboard-text-primary': '#f4f4f4',   // IBM Carbon Gray 10
          '--dashboard-text-secondary': '#c6c6c6',  // IBM Carbon Gray 30
          '--dashboard-text-tertiary': '#a8a8a8',   // IBM Carbon Gray 40
          '--dashboard-text-placeholder': '#8d8d8d', // IBM Carbon Gray 50
          '--radius-small': '2px',
          '--radius-none': '0px',
          // OrcaCloud Tokens — IBM Carbon Dark Theme
          '--ac-bg-primary':   '#262626',   // Carbon Gray 90 - Primary background
          '--ac-bg-secondary': '#393939',   // Carbon Gray 80 - Secondary background
          '--ac-bg-tertiary':  '#525252',   // Carbon Gray 70 - Borders/separators
          '--ac-bg-elevated':  '#161616',   // Carbon Gray 100 - Elevated surfaces
          '--ac-layer-01': '#161616', // Carbon Gray 100 - Elevated surfaces
          '--ac-layer-02': '#262626', // Carbon Gray 90 - Primary background
          '--ac-layer-03': '#393939', // Carbon Gray 80 - Secondary background
          '--ac-text-primary':   '#f4f4f4', // Carbon Gray 10 - Text on dark
          '--ac-text-secondary': '#c6c6c6', // Carbon Gray 30
          '--ac-text-tertiary':  '#a8a8a8', // Carbon Gray 40
          '--ac-text-inverse':   '#161616', // Carbon Gray 100
          '--ac-border':         '#525252', // Carbon Gray 70 - Borders/separators
          '--ac-border-subtle': '#737373', // Carbon Gray 60
        },
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          scrollBehavior: 'smooth',
        },
        body: {
          backgroundColor: '#262626', // Carbon Gray 90 - Primary background
          fontFeatureSettings: '"cv11", "ss01"',
          fontVariationSettings: '"opsz" 32',
        },
      },
    },
      MuiTypography: {
        styleOverrides: {
          root: {
            // IBM Carbon Gray 10 — dark theme body text
            color: '#f4f4f4',
          },
        },
      },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.95rem',
          lineHeight: 1.2,
          padding: '10px 22px',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        /* ── Contained: glowing fill with gradient ── */
        contained: {
          background: 'linear-gradient(135deg, #1e4d8c 0%, #153d75 60%, #0f2d5a 100%)',
          color: '#ffffff',
          boxShadow: '0 1px 3px rgba(21,61,117,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          '&:hover': {
            background: 'linear-gradient(135deg, #245699 0%, #1a4788 60%, #153d75 100%)',
            boxShadow: '0 4px 16px rgba(21,61,117,0.6)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 1px 3px rgba(21,61,117,0.5)',
          },
        },
        /* ── Outlined: glowing border in dark ── */
        outlined: {
          border: '2px solid rgba(21,61,117,0.7)',
          color: '#93b4e8',
          backgroundColor: 'transparent',
          letterSpacing: '0.01em',
          '&:hover': {
            border: '2px solid #153d75',
            color: '#bfd3f5',
            backgroundColor: 'rgba(21,61,117,0.15)',
            boxShadow: '0 0 0 3px rgba(21,61,117,0.2)',
          },
        },
        /* ── Text: no border, sweep underline ── */
        text: {
          color: '#93b4e8',
          padding: '10px 14px',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 6,
            left: 14,
            right: 14,
            height: '2px',
            borderRadius: '1px',
            backgroundColor: '#93b4e8',
            transform: 'scaleX(0)',
            transition: 'transform 0.15s cubic-bezier(0.4,0,0.2,1)',
          },
          '&:hover': {
            backgroundColor: 'rgba(21,61,117,0.1)',
            color: '#bfd3f5',
          },
          '&:hover::after': {
            transform: 'scaleX(1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #334155',
          backgroundColor: '#ffffff',
          boxShadow: 'none',
          transition: 'border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: '#475569',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: '1px solid #525252', // Carbon Gray 70 - Borders/separators
          backgroundColor: '#161616', // Carbon Gray 100 - Elevated surfaces
        },
        elevation1: {
          boxShadow: 'none',
        },
        elevation2: {
          boxShadow: 'none',
        },
        elevation3: {
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#161616', // Carbon Gray 100 - Elevated surfaces
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #525252', // Carbon Gray 70 - Borders/separators
          color: '#f4f4f4', // Carbon Gray 10 - Text on dark
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
          transition: 'background-color 0.12s cubic-bezier(0.4, 0, 0.2, 1), color 0.12s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          transition: 'background-color 0.12s cubic-bezier(0.4, 0, 0.2, 1), color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(0, 224, 255, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            transition: 'border-color 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            '&.Mui-focused': {
              boxShadow: 'none',
            },
          },
        },
      },
    },
  },
});

interface CustomThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({ children }) => {
  const location = useLocation();
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage for saved theme preference
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    // Check system preference if no saved preference
    if (!savedMode) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return savedMode || 'light';
  });

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no manual preference is saved
      if (!localStorage.getItem('themeMode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDashboardRoute =
    location.pathname.startsWith('/cloud') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/products/Dashboard') ||
    location.pathname.startsWith('/sections/Dashboard') ||
    location.pathname.startsWith('/domains/Dashboard') ||
    location.pathname.startsWith('/billing/Dashboard') ||
    location.pathname.startsWith('/teams/Dashboard') ||
    location.pathname.startsWith('/observability/Dashboard') ||
    location.pathname.startsWith('/compliance/Dashboard') ||
    location.pathname.startsWith('/support/Dashboard') ||
    location.pathname.startsWith('/developer/Dashboard') ||
    location.pathname.startsWith('/marketing-dashboard') ||
    location.pathname.startsWith('/domains/dashboard') ||
    location.pathname.startsWith('/monitor-dashboard') ||
    location.pathname.startsWith('/groups') ||
    location.pathname.startsWith('/billing') ||
    location.pathname.startsWith('/enterprise') ||
    location.pathname.startsWith('/docs') ||
    location.pathname.startsWith('/audit-logs');

  const effectiveMode: ThemeMode = isDashboardRoute ? mode : 'light';

  // Set data-color-scheme on <html> so professional.css and other plain CSS
  // files key their dark-mode blocks to this attribute rather than the OS
  // media query. This guarantees the landing page is always light — the
  // attribute is only present on dashboard/app routes when dark mode is on.
  useEffect(() => {
    if (effectiveMode === 'dark') {
      document.documentElement.setAttribute('data-color-scheme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-color-scheme');
    }
  }, [effectiveMode]);

  const theme = effectiveMode === 'dark' ? ___darkTheme : ___lightTheme;

  return (
    <___ThemeContext.Provider value={{ mode: effectiveMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </___ThemeContext.Provider>
  );
};
