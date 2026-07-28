# ORCACLOUD CLOUD — DASHBOARD DESIGN SYSTEM

Version 1.0 — Founder Specification (Samuel Realm)

Single source of truth for dashboard UI/UX implementation.

## 1. Introduction
OrcaCloud dashboard must deliver a GitHub/GitLab-level experience: clean, predictable, premium, and developer-centric.

## 2. Design Principles
- **Clarity:** every UI element has a purpose.
- **Predictability:** consistent patterns and behavior platform-wide.
- **Neutral First:** neutral palette for most surfaces; brand color only for emphasis.
- **Calm UI:** no heavy shadows or visual noise.
- **Developer Trust:** stable, precise, enterprise-grade interaction quality.

## 3. Layout System
### 3.1 Global Shell
- **Left Sidebar (fixed):** width `240–260px`, background `#FFFFFF` / `#F9FAFB`, right border `#E5E7EB`, icon `20–22px`.
- **Active nav item:** bold text, background `#F3F4F6`, left accent bar `3px` in brand color.

- **Top Bar (fixed):** height `56–64px`, background `#FFFFFF`, bottom border `#E5E7EB`.
- **Contains:** search, notifications, avatar, quick actions.

- **Main Content:** max width `1440px`, padding `32px`, responsive 12-column grid.
- **Vertical spacing:** `32px` between sections.

## 4. Color System
### 4.1 IBM Carbon Dark Theme (Primary)
Following IBM Carbon Design System for enterprise-grade dark theme:

**Primary Background:** `#262626` (Gray 90)
- Used for main pages, dashboards, and full-screen backgrounds

**Elevated Surfaces:** `#161616` (Gray 100)
- Used for cards, modals, drawers, and any raised surface

**Secondary Background:** `#393939` (Gray 80)
- Used for sidebars, secondary sections, and grouped content

**Borders/Separators:** `#525252` (Gray 70)
- Used for dividers, outlines, and subtle UI structure

**Text on Dark:** `#f4f4f4` (Gray 10)
- Used for all primary text on dark backgrounds

### 4.2 Neutral Palette (Dark Theme)
- Background: `#262626` (Gray 90)
- Subtle Background: `#393939` (Gray 80)
- Borders: `#525252` (Gray 70)
- Text Primary: `#f4f4f4` (Gray 10)
- Text Secondary: `#c6c6c6` (Gray 30)
- Text Muted: `#a8a8a8` (Gray 40)
- Icons: `#a8a8a8` (Gray 40)

### 4.3 Brand Color
Primary brand color for interactive emphasis:
- Recommended: `#153d75` (OrcaCloud Blue)

Use brand color for:
- Primary buttons
- Active states
- Focus rings
- Links

Do **not** use brand color for:
- Body text
- Large card backgrounds
- Default icons

## 5. Typography
### 5.1 Font Family
- Inter (recommended)
- Mona Sans
- SF Pro
- Roboto (fallback)

### 5.2 Type Scale
- Page Title: `24–28px`, `700`
- Section Title: `18–20px`, `600`
- Card Title: `16px`, `600`
- Body: `14–15px`, `400`
- Metadata: `12–13px`, `300`

### 5.3 Line Heights
- Titles: `1.2`
- Body: `1.5`
- Metadata: `1.4`

## 6. Spacing
### 6.1 4-Point Grid
`4, 8, 12, 16, 20, 24, 32, 40, 48`

### 6.2 Vertical Rhythm
- Section spacing: `32px`
- Card internal spacing: `20–24px`
- Text block spacing: `8px`

## 7. Components
### 7.1 Buttons
- **Primary:** height `40px`, radius `6px`, brand background, white text, weight `500`.
- **Secondary:** height `40px`, radius `6px`, border `#D1D5DB`, white background, text `#111827`.
- **Destructive:** background `#DC2626`, hover `#B91C1C`.

### 7.2 Inputs
- Height `40px`, padding `0 12px`, border `#D1D5DB`, radius `6px`, white background.
- Focus ring `2px` brand color.
- Placeholder `#9CA3AF`.

### 7.3 Cards
- Border `#E5E7EB`
- Radius `8px`
- Padding `20–24px`
- White background
- No heavy shadow

### 7.4 Tables
- Header background `#F9FAFB`
- Row hover `#F3F4F6`
- Border `#E5E7EB`
- Text `14px`, metadata `12px`

### 7.5 Tabs
- Height `40px`
- Inactive `#6B7280`
- Active 2px underline in brand color
- `24px` spacing between tabs

### 7.6 Modals
- Width `480–640px`
- Padding `32px`
- Radius `12px`
- Subtle shadow

### 7.7 Toasts
- Position top-right
- White background, border `#E5E7EB`
- Subtle shadow
- Padding `16px`, radius `8px`

## 8. Interaction
- Hover: subtle shift only.
- Focus: always visible 2px brand ring.
- Micro-animations: `120–180ms` (`fade`, `slide`, tab underline).

## 9. Empty States
Structure:
1. Optional icon/illustration
2. Title
3. Description
4. Primary action

Example:
> No deployments yet
> Deploy your first container to see logs, metrics, and status here.

## 10. Skeleton Loading
Use skeleton placeholders over spinners.
- Background `#E5E7EB`
- Pulse animation
- Radius `4px`

## 11. Status Colors
- Success: `#16A34A`
- Warning: `#F59E0B`
- Error: `#DC2626`
- Idle: `#9CA3AF`

## 12. Navigation Structure
Sidebar items:
- Dashboard
- Deployments
- Pipelines
- Containers
- Kubernetes
- Monitoring
- Logs
- API Keys
- Storage
- Domains
- Billing
- Settings

## 13. Page Blueprints
### 13.1 Overview Page
- Page title
- Summary cards row (4 cards)
- Tabs: Overview / History / Settings
- Content sections (table/cards)
- Activity timeline

### 13.2 Deployments Page
- Summary cards: total, active, status, avg build time
- Tabs: Overview / History / Environments / Settings
- Sections: recent deployments table + timeline

## 14. Accessibility
- Keyboard navigation required
- Focus rings mandatory
- Minimum contrast ratio: `4.5:1`
- Screen reader labels for icon-only controls

## 15. Branding Guidelines
- Use brand color sparingly
- Avoid gradients
- Avoid heavy shadows
- Keep visuals clean, modern, enterprise-grade

## 17. IBM Carbon Structural Styles

### 17.1 Overview
OrcaCloud implements IBM Carbon Design System structural styles for consistent, enterprise-grade UI components. These styles provide a foundation for cards, panels, tables, navigation, and form elements.

### 17.2 CSS Implementation
All structural styles are defined in `src/styles/orcacloud-carbon.css`. Import this file in your component or globally:

```css
@import './styles/orcacloud-carbon.css';
```

### 17.3 Color Tokens
```css
/* IBM Carbon Neutral Palette */
--ac-gray-10: #f4f4f4;   /* Light backgrounds, text on dark */
--ac-gray-20: #e0e0e0;   /* Subtle borders, dividers */
--ac-gray-30: #c6c6c6;   /* Input borders, subtle UI */
--ac-gray-40: #a8a8a8;   /* Panel borders, secondary text */
--ac-gray-100: #161616;  /* Primary text, strong accents */

/* Semantic Backgrounds */
--ac-bg-primary: #ffffff;     /* Main background */
--ac-bg-secondary: #f4f4f4;   /* Secondary surfaces */
--ac-bg-tertiary: #e0e0e0;    /* Tertiary surfaces */

/* Text Colors */
--ac-text-primary: #161616;   /* Primary text */
--ac-text-secondary: #525252; /* Secondary text */
```

### 17.4 Spacing Scale
IBM 2× grid system for consistent spacing:
```css
--ac-space-2: 2px;   /* Minimal gaps */
--ac-space-4: 4px;   /* Icon spacing */
--ac-space-8: 8px;   /* Small padding */
--ac-space-12: 12px; /* Input padding, table cells */
--ac-space-16: 16px; /* Card padding */
--ac-space-24: 24px; /* Panel padding, section spacing */
--ac-space-32: 32px; /* Large sections */
--ac-space-48: 48px; /* Page margins */
--ac-space-64: 64px; /* Hero sections */
```

### 17.5 Component Classes

#### Cards (Layer-01)
```html
<div class="ac-card">
  <!-- Card content -->
</div>
```
- **Background:** Primary white
- **Border:** 1px Gray 30
- **Border Radius:** 2px
- **Padding:** 16px

#### Panels (Secondary Surfaces)
```html
<div class="ac-panel">
  <!-- Panel content for monitoring, compute, storage sections -->
</div>
```
- **Background:** Gray 10
- **Border:** 1px Gray 40
- **Border Radius:** 0px (sharp corners)
- **Padding:** 24px

#### Section Dividers
```html
<hr class="ac-section-divider">
```
- **Border:** 1px solid Gray 20
- **Margin:** 24px 0

#### Navigation Sidebar
```html
<nav class="ac-sidebar">
  <div class="ac-sidebar-item">Dashboard</div>
  <div class="ac-sidebar-item active">Deployments</div>
</nav>
```
- **Width:** 260px
- **Background:** Gray 10
- **Border Right:** 1px Gray 20
- **Active State:** Left border Gray 100, background Gray 20

#### Tables (Data Table Style)
```html
<table class="ac-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Service A</td>
      <td>Running</td>
    </tr>
  </tbody>
</table>
```
- **Border:** 1px Gray 40
- **Header Background:** Gray 10
- **Row Border:** 1px Gray 20

#### Form Inputs
```html
<input type="text" class="ac-input" placeholder="Enter value">
```
- **Border:** 1px Gray 30
- **Border Radius:** 2px
- **Padding:** 12px
- **Focus:** 2px IBM Blue outline

#### Hover Elevation
```html
<div class="ac-hover-elevate">
  <!-- Content that elevates on hover -->
</div>
```
- **Hover Shadow:** Subtle 2px elevation

### 17.6 Chart Grid Lines
```css
.ac-chart-grid line {
  stroke: var(--ac-gray-20);
  stroke-width: 1px;
}
```

### 17.7 Usage Guidelines

#### When to Use Each Component:
- **`.ac-card`**: Primary content containers, data displays, action items
- **`.ac-panel`**: Secondary sections, monitoring panels, grouped controls
- **`.ac-sidebar`**: Main navigation, secondary navigation
- **`.ac-table`**: Data tables, configuration tables
- **`.ac-input`**: Form inputs, search fields

#### Implementation Notes:
- All components use CSS custom properties for theming
- Spacing follows IBM 2× grid system
- Colors align with IBM Carbon neutral palette
- Border radius is minimal (2px) for enterprise feel
- No heavy shadows - subtle elevation only on interaction

#### Accessibility:
- Focus states use IBM Blue (#0f62fe) for visibility
- Color contrast meets WCAG AA standards
- Keyboard navigation supported
- Screen reader friendly class names

### 17.8 Migration Guide
When updating existing components to use Carbon styles:

1. **Replace custom backgrounds** with `--ac-bg-*` variables
2. **Update spacing** to use `--ac-space-*` values
3. **Apply component classes** instead of inline styles
4. **Use semantic color tokens** from the Carbon palette
5. **Test focus states** for accessibility compliance

### 17.9 Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Custom Properties support required
- Fallbacks provided for older browsers

---

## 18. Development Checklist (Updated)
- [ ] Typography installed (IBM Plex Sans)
- [ ] Color system applied (Carbon tokens)
- [ ] Spacing system enforced (2× grid)
- [ ] Layout shell implemented
- [ ] **Carbon structural styles imported**
- [ ] **Component classes applied consistently**
- [ ] **Accessibility focus states verified**

This design system is versioned and must be updated whenever new components/patterns are introduced.
