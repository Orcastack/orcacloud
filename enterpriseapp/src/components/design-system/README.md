# OrcaCloud Component Library

A complete component library for Buttons, Inputs, and Cards that works best when each piece is defined at three layers: **Design tokens** (the source of truth), **Component rules** (how each behaves), and **Implementation patterns** (how developers use them consistently).

The sections below give you all three layers in a unified, enterprise‑grade structure that matches the IBM Carbon feel you prefer while staying branded for OrcaCloud.

## Table of Contents

- [Design Tokens](#design-tokens)
- [Buttons](#buttons)
- [Inputs](#inputs)
- [Cards](#cards)
- [Installation & Usage](#installation--usage)
- [Contributing](#contributing)

## Design Tokens

All components are built on a foundation of design tokens that ensure consistency across the platform. These tokens are defined in CSS custom properties and TypeScript constants.

### Color Tokens

```css
/* Primary Brand Colors */
--ac-button-primary-bg: #153d75;
--ac-input-focus-border: #153d75;

/* Neutral Grays */
--ac-gray-10: #f4f4f4;
--ac-gray-20: #e0e0e0;
--ac-gray-30: #c6c6c6;
--ac-gray-40: #a8a8a8;
--ac-gray-100: #161616;

/* Semantic Colors */
--ac-color-success: #22c55e;
--ac-color-warning: #f59e0b;
--ac-color-error: #dc2626;
--ac-color-info: #153d75;
```

### Spacing Scale

```css
--ac-space-xs: 4px;
--ac-space-sm: 8px;
--ac-space-md: 16px;
--ac-space-lg: 24px;
--ac-space-xl: 32px;
--ac-space-xxl: 48px;
```

### Typography Scale

```css
--ac-font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--ac-font-size-xs: 12px;
--ac-font-size-sm: 14px;
--ac-font-size-md: 16px;
--ac-font-size-lg: 18px;
--ac-font-size-xl: 20px;
--ac-font-size-xxl: 24px;
```

## Buttons

### Visual Rules

Buttons follow a strict hierarchy so users always know which action is primary. The primary button uses your brand blue, while secondary and ghost buttons remain neutral to avoid competing for attention. All buttons share the same height, radius, and typography to maintain consistency across the platform.

### Types

- **Primary**: Uses a solid brand color for the main action
- **Secondary**: Uses a neutral border for supportive actions
- **Ghost**: Removes borders and backgrounds for low‑priority actions
- **Danger**: Uses red for destructive actions

### Behavior

Primary and danger buttons use color transitions on hover and active states to reinforce interactivity. Disabled buttons use a muted gray and remove hover effects to signal inactivity. All buttons maintain a 48px height for accessibility and visual balance.

### Implementation

```tsx
import { Button } from '@orcacloud/design-system';

// Primary button for main actions
<Button variant="primary" onClick={handleSubmit}>
  Create Project
</Button>

// Secondary button for supportive actions
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Ghost button for low-priority actions
<Button variant="ghost" onClick={handleLearnMore}>
  Learn More
</Button>

// Danger button for destructive actions
<Button variant="danger" onClick={handleDelete}>
  Delete Project
</Button>

// Full-width button
<Button variant="primary" fullWidth>
  Sign Up
</Button>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | The button style variant |
| `fullWidth` | `boolean` | `false` | Whether the button should take full width |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `children` | `ReactNode` | - | The button content |

## Inputs

### Visual Rules

Inputs use a clean, neutral style with a light border and clear label hierarchy. Labels remain visible at all times to avoid ambiguity. The focus state uses a blue outline to match your brand and reinforce accessibility.

### States

- **Default**: Light gray border and white background
- **Hover**: Slightly darkens the border to show interactivity
- **Focus**: Blue border and soft outline for clarity
- **Error**: Red border and helper text
- **Disabled**: Muted background and text color

### Structure

Each input includes a label, the field itself, and optional helper text. Spacing between these elements follows the 4–16px scale to maintain rhythm across forms.

### Implementation

```tsx
import { Input } from '@orcacloud/design-system';

// Basic input
<Input
  label="Project Name"
  placeholder="Enter project name"
  helperText="Choose a unique name for your project"
/>

// Input with error state
<Input
  label="Email Address"
  type="email"
  error={true}
  helperText="Please enter a valid email address"
/>

// Disabled input
<Input
  label="System Field"
  value="Auto-generated"
  disabled={true}
/>

// Full-width input
<Input
  label="Description"
  multiline
  rows={4}
  fullWidth
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | The label for the input field |
| `helperText` | `string` | - | Helper text displayed below the input |
| `error` | `boolean` | `false` | Whether to show error state |
| `fullWidth` | `boolean` | `false` | Whether the input should take full width |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `required` | `boolean` | `false` | Whether the input is required |
| `placeholder` | `string` | - | Placeholder text |

## Cards

### Visual Rules

Cards use a white surface, subtle border, and light shadow to create separation without heavy decoration. The 32px padding gives breathing room for content, and the 4px radius keeps the look modern and enterprise-friendly.

### Structure

A card typically includes a header, body, and optional footer. The header contains a title and optional subtitle, the body holds form fields or content, and the footer contains actions. Spacing follows the 8px grid to maintain alignment with the rest of the system.

### Variants

- **Form cards**: For signup, onboarding, and settings
- **Dashboard cards**: For metrics and quick actions
- **Content cards**: For text, lists, or descriptions

### Implementation

```tsx
import { Card, Button } from '@orcacloud/design-system';

// Form card for user input
<Card
  variant="form"
  title="Create New Project"
  subtitle="Fill out the details below"
>
  <form>
    <Input label="Project Name" />
    <Input label="Description" multiline />
  </form>
  <CardActions>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Create</Button>
  </CardActions>
</Card>

// Dashboard card for metrics
<Card
  variant="dashboard"
  title="Active Projects"
  subtitle="42 projects currently running"
>
  <Typography variant="h3">42</Typography>
</Card>

// Content card for text and lists
<Card
  variant="content"
  title="Getting Started"
>
  <Typography>
    Welcome to OrcaCloud platform. Get started by creating your first project.
  </Typography>
  <ul>
    <li>Create a new project</li>
    <li>Invite team members</li>
    <li>Deploy your first application</li>
  </ul>
</Card>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'form' \| 'dashboard' \| 'content'` | `'content'` | The card style variant |
| `fullWidth` | `boolean` | `false` | Whether the card should take full width |
| `title` | `string` | - | Card title |
| `subtitle` | `string` | - | Card subtitle |
| `children` | `ReactNode` | - | Card content |
| `actions` | `ReactNode` | - | Card footer actions |

## Installation & Usage

### Installation

```bash
# Install the design system package
npm install @orcacloud/design-system

# Or with yarn
yarn add @orcacloud/design-system
```

### Basic Setup

```tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { orcaComputeTheme } from '@orcacloud/design-system';
import { Button, Input, Card } from '@orcacloud/design-system';

function App() {
  return (
    <ThemeProvider theme={orcaComputeTheme}>
      <div>
        <Button variant="primary">Click me</Button>
        <Input label="Name" />
        <Card title="Welcome">
          <p>Hello, world!</p>
        </Card>
      </div>
    </ThemeProvider>
  );
}
```

### Advanced Usage

```tsx
import { componentTokens } from '@orcacloud/design-system';

// Access design tokens directly
const customStyle = {
  padding: componentTokens.spacing.md,
  color: componentTokens.colors.button.primary.text,
};
```

## Design Principles

### 1. Consistency
All components follow the same design tokens and spacing scale to ensure a cohesive experience.

### 2. Accessibility
Components include proper focus states, ARIA labels, and keyboard navigation support.

### 3. Performance
Components are built with performance in mind, using CSS-in-JS and optimized rendering.

### 4. Flexibility
Components can be composed and extended while maintaining design consistency.

### 5. Brand Alignment
All components reflect OrcaCloud's brand identity while following IBM Carbon principles.

## Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/orcacloud/design-system.git
cd design-system

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Component Development Guidelines

1. **Always use design tokens** instead of hardcoded values
2. **Include TypeScript types** for all props
3. **Add comprehensive documentation** with examples
4. **Test accessibility** with screen readers and keyboard navigation
5. **Follow the established patterns** for consistency

### Adding New Components

1. Create the component file in `src/components/`
2. Add design tokens to `src/styles/componentTokens.ts`
3. Update CSS custom properties in `src/styles/orcacloud-carbon.css`
4. Add the component to `src/components/index.ts`
5. Update this README with documentation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Copyright © 2024 OrcaCloud. All rights reserved.

## Changelog

### v1.0.0 (2024-03-03)
- Initial release with Button, Input, and Card components
- Complete design token system
- IBM Carbon-inspired design principles
- Full TypeScript support
- Comprehensive documentation
