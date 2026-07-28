import React from 'react';
import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Box,
  styled,
} from '@mui/material';
import { componentTokens, CardVariant } from '../../styles/componentTokens';

// Styled card component
const StyledCard = styled(MuiCard)<{
  cardVariant: CardVariant;
  isFullWidth?: boolean;
}>(({ theme, cardVariant, isFullWidth }) => {
  const tokens = componentTokens;

  const getVariantStyles = () => {
    switch (cardVariant) {
      case 'form':
        return {
          // Form cards have more structured padding and focus on input areas
          padding: tokens.components.card.padding,
        };
      case 'dashboard':
        return {
          // Dashboard cards are more compact for metrics and quick actions
          padding: tokens.spacing.md,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: tokens.shadow.lg,
          },
        };
      case 'content':
        return {
          // Content cards have generous padding for text and lists
          padding: tokens.components.card.padding,
        };
      default:
        return {};
    }
  };

  return {
    backgroundColor: tokens.colors.card.background,
    border: `${tokens.components.card.borderWidth} solid ${tokens.colors.card.border}`,
    borderRadius: tokens.components.card.borderRadius,
    boxShadow: tokens.shadow.sm,
    width: isFullWidth ? '100%' : 'auto',
    transition: 'box-shadow 0.2s ease-in-out',

    '&:hover': {
      boxShadow: tokens.shadow.md,
    },

    // Variant-specific styles
    ...getVariantStyles(),
  };
});

// Styled card header
const StyledCardHeader = styled(CardHeader)(({ theme }) => {
  const tokens = componentTokens;

  return {
    backgroundColor: tokens.colors.card.header.background,
    padding: tokens.components.card.headerPadding,
    margin: `0 -${tokens.components.card.padding} ${tokens.spacing.md} -${tokens.components.card.padding}`,

    '& .MuiCardHeader-title': {
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize.lg,
      fontWeight: tokens.typography.fontWeight.semibold,
      color: tokens.colors.card.header.text,
      marginBottom: tokens.spacing.xs,
    },

    '& .MuiCardHeader-subheader': {
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize.sm,
      fontWeight: tokens.typography.fontWeight.regular,
      color: tokens.colors.card.header.subtitle,
      margin: 0,
    },
  };
});

// Styled card content
const StyledCardContent = styled(CardContent)(({ theme }) => {
  const tokens = componentTokens;

  return {
    backgroundColor: tokens.colors.card.body.background,
    color: tokens.colors.card.body.text,
    fontFamily: tokens.typography.fontFamily,
    padding: 0,

    '&:last-child': {
      paddingBottom: 0,
    },
  };
});

// Styled card actions/footer
const StyledCardActions = styled(CardActions)(({ theme }) => {
  const tokens = componentTokens;

  return {
    backgroundColor: tokens.colors.card.footer.background,
    borderTop: `${tokens.components.card.footerBorderWidth} solid ${tokens.colors.card.footer.border}`,
    padding: tokens.components.card.footerPadding,
    margin: `${tokens.spacing.md} -${tokens.components.card.padding} 0 -${tokens.components.card.padding}`,
    color: tokens.colors.card.footer.text,

    '& .MuiButton-root': {
      fontFamily: tokens.typography.fontFamily,
    },
  };
});

// Card component props
export interface CardProps extends Omit<MuiCardProps, 'variant'> {
  /**
   * The variant of the card
   * @default 'content'
   */
  variant?: CardVariant;
  /**
   * Whether the card should take full width
   * @default false
   */
  fullWidth?: boolean;
  /**
   * Card title
   */
  title?: string;
  /**
   * Card subtitle
   */
  subtitle?: string;
  /**
   * Card content
   */
  children: React.ReactNode;
  /**
   * Card actions/footer content
   */
  actions?: React.ReactNode;
}

/**
 * OrcaCloud Card Component
 *
 * Versatile container component following IBM Carbon design principles.
 * Supports form, dashboard, and content variants for different use cases.
 *
 * @example
 * ```tsx
 * // Form card for user input
 * <Card
 *   variant="form"
 *   title="Create New Project"
 *   subtitle="Fill out the details below"
 * >
 *   <form>
 *     <Input label="Project Name" />
 *     <Input label="Description" multiline />
 *   </form>
 *   <CardActions>
 *     <Button variant="secondary">Cancel</Button>
 *     <Button variant="primary">Create</Button>
 *   </CardActions>
 * </Card>
 *
 * // Dashboard card for metrics
 * <Card
 *   variant="dashboard"
 *   title="Active Projects"
 *   subtitle="42 projects currently running"
 * >
 *   <Typography variant="h3">42</Typography>
 * </Card>
 *
 * // Content card for text and lists
 * <Card
 *   variant="content"
 *   title="Getting Started"
 * >
 *   <Typography>
 *     Welcome to OrcaCloud platform...
 *   </Typography>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  variant = 'content',
  fullWidth = false,
  title,
  subtitle,
  children,
  actions,
  ...props
}) => {
  const hasHeader = title || subtitle;

  return (
    <StyledCard cardVariant={variant} isFullWidth={fullWidth} {...props}>
      {hasHeader && (
        <StyledCardHeader
          title={title}
          subheader={subtitle}
        />
      )}
      <StyledCardContent>
        {children}
      </StyledCardContent>
      {actions && (
        <StyledCardActions>
          {actions}
        </StyledCardActions>
      )}
    </StyledCard>
  );
};

// Export individual components for advanced usage
export { StyledCard as BaseCard, StyledCardHeader as CardHeader, StyledCardContent as CardContent, StyledCardActions as CardActions };

export default Card;
