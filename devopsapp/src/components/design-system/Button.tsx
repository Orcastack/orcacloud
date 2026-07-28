import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';
import { componentTokens, ButtonVariant } from '../../styles/componentTokens';

// Button variants following IBM Carbon hierarchy
const StyledButton = styled(MuiButton)<{
  buttonVariant: ButtonVariant;
  isFullWidth?: boolean;
}>(({ theme, buttonVariant, isFullWidth }) => {
  const tokens = componentTokens;

  const getVariantStyles = () => {
    switch (buttonVariant) {
      case 'primary':
        return {
          backgroundColor: tokens.colors.button.primary.background,
          color: tokens.colors.button.primary.text,
          border: `${tokens.components.button.borderWidth} solid ${tokens.colors.button.primary.border}`,
          '&:hover': {
            backgroundColor: tokens.colors.button.primary.backgroundHover,
          },
          '&:active': {
            backgroundColor: tokens.colors.button.primary.backgroundActive,
          },
        };
      case 'secondary':
        return {
          backgroundColor: tokens.colors.button.secondary.background,
          color: tokens.colors.button.secondary.text,
          border: `${tokens.components.button.borderWidth} solid ${tokens.colors.button.secondary.border}`,
          '&:hover': {
            backgroundColor: tokens.colors.button.secondary.backgroundHover,
          },
          '&:active': {
            backgroundColor: tokens.colors.button.secondary.backgroundActive,
          },
        };
      case 'ghost':
        return {
          backgroundColor: tokens.colors.button.ghost.background,
          color: tokens.colors.button.ghost.text,
          border: `${tokens.components.button.borderWidth} solid ${tokens.colors.button.ghost.border}`,
          '&:hover': {
            backgroundColor: tokens.colors.button.ghost.backgroundHover,
          },
          '&:active': {
            backgroundColor: tokens.colors.button.ghost.backgroundActive,
          },
        };
      case 'danger':
        return {
          backgroundColor: tokens.colors.button.danger.background,
          color: tokens.colors.button.danger.text,
          border: `${tokens.components.button.borderWidth} solid ${tokens.colors.button.danger.border}`,
          '&:hover': {
            backgroundColor: tokens.colors.button.danger.backgroundHover,
          },
          '&:active': {
            backgroundColor: tokens.colors.button.danger.backgroundActive,
          },
        };
      default:
        return {};
    }
  };

  return {
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.lineHeight.normal,
    height: tokens.components.button.height,
    padding: `0 ${tokens.components.button.paddingX}`,
    borderRadius: tokens.radius.md,
    textTransform: 'none' as const,
    transition: tokens.components.button.transition,
    width: isFullWidth ? '100%' : 'auto',
    minWidth: isFullWidth ? 'auto' : '120px',

    // Disabled state
    '&.Mui-disabled': {
      backgroundColor: tokens.colors.button.disabled.background,
      color: tokens.colors.button.disabled.text,
      borderColor: tokens.colors.button.disabled.border,
      opacity: 0.6,
      cursor: 'not-allowed',
      '&:hover': {
        backgroundColor: tokens.colors.button.disabled.background,
        color: tokens.colors.button.disabled.text,
        borderColor: tokens.colors.button.disabled.border,
      },
    },

    // Variant-specific styles
    ...getVariantStyles(),

    // Focus styles for accessibility
    '&.Mui-focusVisible': {
      outline: `2px solid ${componentTokens.colors.input.focus.outline}`,
      outlineOffset: '2px',
    },
  };
});

// Button component props
export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  /**
   * The variant of the button following the design system hierarchy
   * @default 'primary'
   */
  variant?: ButtonVariant;
  /**
   * Whether the button should take full width
   * @default false
   */
  fullWidth?: boolean;
}

/**
 * OrcaCloud Button Component
 *
 * Follows IBM Carbon design principles with OrcaCloud branding.
 * Supports primary, secondary, ghost, and danger variants for clear action hierarchy.
 *
 * @example
 * ```tsx
 * // Primary button for main actions
 * <Button variant="primary" onClick={handleSubmit}>
 *   Create Project
 * </Button>
 *
 * // Secondary button for supportive actions
 * <Button variant="secondary" onClick={handleCancel}>
 *   Cancel
 * </Button>
 *
 * // Ghost button for low-priority actions
 * <Button variant="ghost" onClick={handleLearnMore}>
 *   Learn More
 * </Button>
 *
 * // Danger button for destructive actions
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete Project
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  ...props
}) => {
  return (
    <StyledButton
      buttonVariant={variant}
      isFullWidth={fullWidth}
      disableElevation
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button;
