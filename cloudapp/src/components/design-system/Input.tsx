import React, { forwardRef } from 'react';
import {
  TextField,
  TextFieldProps,
  InputLabel,
  FormHelperText,
  Box,
  styled,
} from '@mui/material';
import { componentTokens, InputState } from '../../styles/componentTokens';

// Styled input wrapper
const StyledTextField = styled(TextField)<{
  inputState?: InputState;
  fullWidth?: boolean;
}>(({ theme, inputState = 'default', fullWidth }) => {
  const tokens = componentTokens;

  const getStateStyles = () => {
    switch (inputState) {
      case 'hover':
        return {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: tokens.colors.input.hover.border,
            },
          },
        };
      case 'focus':
        return {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: tokens.colors.input.focus.border,
            },
            '&.Mui-focused fieldset': {
              borderColor: tokens.colors.input.focus.border,
              borderWidth: '2px',
            },
          },
        };
      case 'error':
        return {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: tokens.colors.input.error.border,
            },
          },
          '& .MuiFormHelperText-root': {
            color: tokens.colors.input.error.helper,
          },
        };
      case 'disabled':
        return {
          '& .MuiOutlinedInput-root': {
            backgroundColor: tokens.colors.input.disabled.background,
            '& fieldset': {
              borderColor: tokens.colors.input.disabled.border,
            },
          },
          '& .MuiInputLabel-root': {
            color: tokens.colors.input.disabled.label,
          },
          '& .MuiOutlinedInput-input': {
            color: tokens.colors.input.disabled.text,
          },
        };
      default:
        return {
          '& .MuiOutlinedInput-root': {
            fontFamily: tokens.typography.fontFamily,
            fontSize: tokens.typography.fontSize.md,
            fontWeight: tokens.typography.fontWeight.regular,
            lineHeight: tokens.typography.lineHeight.normal,
            height: tokens.components.input.height,
            borderRadius: tokens.components.input.borderRadius,
            backgroundColor: tokens.colors.input.default.background,
            '& fieldset': {
              borderWidth: tokens.components.input.borderWidth,
              borderRadius: tokens.components.input.borderRadius,
              borderColor: tokens.colors.input.default.border,
              transition: 'border-color 0.2s ease-in-out',
            },
            '&:hover fieldset': {
              borderColor: tokens.colors.input.hover.border,
            },
            '&.Mui-focused': {
              '& fieldset': {
                borderColor: tokens.colors.input.focus.border,
                borderWidth: tokens.components.input.focusOutlineWidth,
              },
              boxShadow: `0 0 0 3px ${tokens.colors.input.focus.outline}`,
            },
            '&.Mui-error': {
              '& fieldset': {
                borderColor: tokens.colors.input.error.border,
              },
            },
          },
        };
    }
  };

  return {
    width: fullWidth ? '100%' : 'auto',

    // Label styles
    '& .MuiInputLabel-root': {
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize.sm,
      fontWeight: tokens.typography.fontWeight.medium,
      color: tokens.colors.input.default.label,
      marginBottom: tokens.components.input.labelSpacing,
      '&.Mui-focused': {
        color: tokens.colors.input.focus.border,
      },
      '&.Mui-error': {
        color: tokens.colors.input.error.text,
      },
    },

    '& .MuiOutlinedInput-input': {
      color: tokens.colors.input.default.text,
      padding: `${tokens.components.input.paddingY} ${tokens.components.input.paddingX}`,

      '&::placeholder': {
        color: tokens.colors.input.default.placeholder,
        opacity: 1,
      },
    },

    // Helper text styles
    '& .MuiFormHelperText-root': {
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.regular,
      color: tokens.colors.input.default.helper,
      marginTop: tokens.components.input.helperSpacing,
      marginLeft: 0,
      marginRight: 0,
    },

    // State-specific styles
    ...getStateStyles(),
  };
});

// Input component props
export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  /**
   * The label for the input field
   */
  label?: string;
  /**
   * Helper text displayed below the input
   */
  helperText?: string;
  /**
   * Error message to display
   */
  error?: boolean;
  /**
   * Whether the input should take full width
   * @default false
   */
  fullWidth?: boolean;
  /**
   * The current state of the input (used for styling)
   * @default 'default'
   */
  inputState?: InputState;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the input is required
   * @default false
   */
  required?: boolean;
  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * OrcaCloud Input Component
 *
 * Clean, accessible input field following IBM Carbon design principles.
 * Supports all standard input states with clear visual feedback.
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input
 *   label="Project Name"
 *   placeholder="Enter project name"
 *   helperText="Choose a unique name for your project"
 * />
 *
 * // Input with error state
 * <Input
 *   label="Email Address"
 *   type="email"
 *   error={true}
 *   helperText="Please enter a valid email address"
 * />
 *
 * // Disabled input
 * <Input
 *   label="System Field"
 *   value="Auto-generated"
 *   disabled={true}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error = false,
  fullWidth = false,
  inputState = 'default',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  // Determine the input state based on props
  const computedState: InputState = disabled ? 'disabled' : error ? 'error' : inputState;

  return (
    <StyledTextField
      ref={ref}
      label={label}
      helperText={helperText}
      error={error}
      fullWidth={fullWidth}
      inputState={computedState}
      required={required}
      disabled={disabled}
      variant="outlined"
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
