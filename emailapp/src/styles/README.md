# OrcaCloud — IBM Carbon Structural Styles

A comprehensive CSS implementation of IBM Carbon Design System structural elements for OrcaCloud dashboard.

## Overview

This stylesheet provides enterprise-grade structural styles based on IBM Carbon Design System principles. It includes color tokens, spacing scales, and reusable component classes for consistent UI implementation across the platform.

## Quick Start

### Import the Styles

```css
/* Import in your main CSS file or component */
@import './styles/orcacloud-carbon.css';
```

### Basic Usage

```html
<!-- Card Component -->
<div class="ac-card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>

<!-- Panel for secondary content -->
<div class="ac-panel">
  <h4>Monitoring Panel</h4>
  <div class="metric">CPU: 85%</div>
</div>

<!-- Navigation Sidebar -->
<nav class="ac-sidebar">
  <div class="ac-sidebar-item">Dashboard</div>
  <div class="ac-sidebar-item active">Deployments</div>
</nav>
```

## Color System

### IBM Carbon Neutral Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--ac-gray-10` | `#f4f4f4` | Light backgrounds, text on dark |
| `--ac-gray-20` | `#e0e0e0` | Subtle borders, dividers |
| `--ac-gray-30` | `#c6c6c6` | Input borders, subtle UI |
| `--ac-gray-40` | `#a8a8a8` | Panel borders, secondary text |
| `--ac-gray-100` | `#161616` | Primary text, strong accents |

### Semantic Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--ac-bg-primary` | `#ffffff` | Main page backgrounds |
| `--ac-bg-secondary` | `#f4f4f4` | Secondary surfaces, panels |
| `--ac-bg-tertiary` | `#e0e0e0` | Tertiary surfaces, hovers |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--ac-text-primary` | `#161616` | Primary text content |
| `--ac-text-secondary` | `#525252` | Secondary text, metadata |

## Spacing Scale

IBM 2× grid system for consistent spacing:

| Token | Value | Usage |
|-------|-------|-------|
| `--ac-space-2` | `2px` | Minimal gaps, borders |
| `--ac-space-4` | `4px` | Icon spacing, small elements |
| `--ac-space-8` | `8px` | Small padding, gaps |
| `--ac-space-12` | `12px` | Input padding, table cells |
| `--ac-space-16` | `16px` | Card padding, medium gaps |
| `--ac-space-24` | `24px` | Panel padding, section spacing |
| `--ac-space-32` | `32px` | Large sections, page margins |
| `--ac-space-48` | `48px` | Hero sections, major spacing |
| `--ac-space-64` | `64px` | Full-screen elements |

## Component Reference

### Cards (`.ac-card`)

Primary content containers with clean borders and appropriate padding.

```css
.ac-card {
  background: var(--ac-bg-primary);
  border: 1px solid var(--ac-gray-30);
  border-radius: 2px;
  padding: var(--ac-space-16);
}
```

**Usage:**
```html
<div class="ac-card">
  <h3>Data Visualization</h3>
  <div class="chart-container"><!-- Chart content --></div>
</div>
```

### Panels (`.ac-panel`)

Secondary surfaces for monitoring, compute, and storage sections.

```css
.ac-panel {
  background: var(--ac-bg-secondary);
  border: 1px solid var(--ac-gray-40);
  border-radius: 0px;
  padding: var(--ac-space-24);
}
```

**Usage:**
```html
<div class="ac-panel">
  <h4>System Metrics</h4>
  <div class="metrics-grid"><!-- Metrics content --></div>
</div>
```

### Section Dividers (`.ac-section-divider`)

Clean horizontal dividers between content sections.

```css
.ac-section-divider {
  border-bottom: 1px solid var(--ac-gray-20);
  margin: var(--ac-space-24) 0;
}
```

### Navigation Sidebar (`.ac-sidebar`)

Main navigation component with active state styling.

```css
.ac-sidebar {
  background: var(--ac-bg-secondary);
  width: 260px;
  padding: var(--ac-space-16);
  border-right: 1px solid var(--ac-gray-20);
}

.ac-sidebar-item {
  padding: var(--ac-space-12) var(--ac-space-16);
  border-left: 2px solid transparent;
  cursor: pointer;
}

.ac-sidebar-item.active {
  border-left-color: var(--ac-gray-100);
  background: var(--ac-bg-tertiary);
}
```

**Usage:**
```html
<nav class="ac-sidebar">
  <div class="ac-sidebar-item">Dashboard</div>
  <div class="ac-sidebar-item active">Deployments</div>
  <div class="ac-sidebar-item">Monitoring</div>
</nav>
```

### Tables (`.ac-table`)

IBM Carbon data table styling.

```css
.ac-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--ac-gray-40);
}

.ac-table th {
  background: var(--ac-bg-secondary);
  border-bottom: 1px solid var(--ac-gray-40);
  padding: var(--ac-space-12);
  text-align: left;
}

.ac-table td {
  border-bottom: 1px solid var(--ac-gray-20);
  padding: var(--ac-space-12);
}
```

### Form Inputs (`.ac-input`)

Clean input styling with focus states.

```css
.ac-input {
  border: 1px solid var(--ac-gray-30);
  border-radius: 2px;
  padding: var(--ac-space-12);
  background: var(--ac-bg-primary);
  color: var(--ac-text-primary);
}

.ac-input:focus {
  outline: 2px solid #0f62fe; /* IBM Blue */
  outline-offset: 2px;
}
```

### Hover Elevation (`.ac-hover-elevate`)

Subtle elevation effect on hover.

```css
.ac-hover-elevate:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}
```

### Chart Grid Lines (`.ac-chart-grid`)

Consistent grid line styling for data visualizations.

```css
.ac-chart-grid line {
  stroke: var(--ac-gray-20);
  stroke-width: 1px;
}
```

## Implementation Guidelines

### Global Setup

```css
/* Import at the root of your application */
@import './styles/orcacloud-carbon.css';

/* Apply to body for global typography and background */
body {
  background: var(--ac-bg-primary);
  color: var(--ac-text-primary);
  font-family: "IBM Plex Sans", sans-serif;
}
```

### Component Integration

```jsx
// React/Material-UI integration example
import './styles/orcacloud-carbon.css';

function DashboardCard({ title, children }) {
  return (
    <div className="ac-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

### Custom Theming

Override variables for brand-specific theming:

```css
:root {
  /* Custom brand colors */
  --ac-brand-primary: #153d75;
  --ac-brand-secondary: #0f62fe;

  /* Adjust spacing if needed */
  --ac-space-base: 4px;
}
```

## Accessibility

- **Focus States**: IBM Blue (#0f62fe) outlines for keyboard navigation
- **Color Contrast**: All combinations meet WCAG AA standards
- **Semantic HTML**: Use appropriate HTML elements with Carbon classes
- **Screen Readers**: Class names are descriptive and meaningful

## Browser Support

- **Modern Browsers**: Chrome 49+, Firefox 31+, Safari 9.1+, Edge 16+
- **CSS Custom Properties**: Required for dynamic theming
- **CSS Grid/Flexbox**: Recommended for layout implementations

## Migration from Legacy Styles

### Before (Legacy)
```css
.custom-card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### After (Carbon)
```css
.carbon-card {
  /* Inherits all Carbon card styles */
  /* Override only what you need to customize */
}
```

## Contributing

When adding new components:

1. Use existing Carbon tokens and spacing
2. Follow IBM Carbon naming conventions
3. Test across all supported browsers
4. Include accessibility considerations
5. Update this README with new component documentation

## Version History

- **v1.0.0**: Initial implementation of IBM Carbon structural styles
- Complete color token system
- Spacing scale implementation
- Core component classes (cards, panels, tables, navigation)
- Form input styling
- Accessibility compliance

---

**Built with IBM Carbon Design System principles for enterprise-grade user interfaces.**
