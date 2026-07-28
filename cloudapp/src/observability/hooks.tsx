/**
 * React hooks for telemetry and observability
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { trackEvent, trackPageView, trackUserInteraction, trackApiCall, trackError } from './telemetry';

/**
 * Hook to track page views automatically
 */
export function usePageTracking(pageName?: string) {
  const pathname = window.location.pathname;

  useEffect(() => {
    const finalPageName = pageName || document.title || pathname;
    trackPageView(finalPageName, pathname);
  }, [pathname, pageName]);
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking() {
  const trackClick = useCallback((target: string, data?: Record<string, any>) => {
    trackUserInteraction('click', target, data);
  }, []);

  const trackSubmit = useCallback((target: string, data?: Record<string, any>) => {
    trackUserInteraction('submit', target, data);
  }, []);

  const trackCustom = useCallback((action: string, target: string, data?: Record<string, any>) => {
    trackUserInteraction(action, target, data);
  }, []);

  return { trackClick, trackSubmit, trackCustom };
}

/**
 * Hook to track API calls with performance metrics
 */
export function useApiTracking() {
  const trackApi = useCallback((promise: Promise<any>, method: string, url: string) => {
    const startTime = Date.now();

    return promise
      .then((result) => {
        const duration = Date.now() - startTime;
        trackApiCall(method, url, 200, duration);
        return result;
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        const status = error?.response?.status || 500;
        trackApiCall(method, url, status, duration);
        throw error;
      });
  }, []);

  return { trackApi };
}

/**
 * Hook to track component performance
 */
export function usePerformanceTracking(componentName: string) {
  const renderStartTime = useRef<number>(Date.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    // Track mount time
    mountTime.current = Date.now();
    const mountDuration = mountTime.current - renderStartTime.current;

    trackEvent('component-mount', {
      componentName,
      mountDuration,
      timestamp: mountTime.current,
    });

    // Track unmount
    return () => {
      if (mountTime.current) {
        const unmountTime = Date.now();
        const totalLifetime = unmountTime - mountTime.current;

        trackEvent('component-unmount', {
          componentName,
          totalLifetime,
          timestamp: unmountTime,
        });
      }
    };
  }, [componentName]);

  const trackRender = useCallback((renderData?: Record<string, any>) => {
    const renderTime = Date.now();
    const renderDuration = renderTime - renderStartTime.current;

    trackEvent('component-render', {
      componentName,
      renderDuration,
      timestamp: renderTime,
      ...renderData,
    });

    renderStartTime.current = renderTime;
  }, [componentName]);

  return { trackRender };
}

/**
 * Hook to track errors with context
 */
export function useErrorTracking() {
  const trackComponentError = useCallback((error: Error, componentName: string, props?: Record<string, any>) => {
    trackError(error, `component-${componentName}`);
    trackEvent('component-error', {
      componentName,
      errorMessage: error.message,
      errorStack: error.stack,
      props: props ? JSON.stringify(props) : undefined,
    });
  }, []);

  const trackAsyncError = useCallback((error: Error, operation: string, context?: Record<string, any>) => {
    trackError(error, `async-${operation}`);
    trackEvent('async-error', {
      operation,
      errorMessage: error.message,
      errorStack: error.stack,
      context: context ? JSON.stringify(context) : undefined,
    });
  }, []);

  const trackUserError = useCallback((error: string, action: string, context?: Record<string, any>) => {
    trackEvent('user-error', {
      error,
      action,
      context: context ? JSON.stringify(context) : undefined,
    });
  }, []);

  return { trackComponentError, trackAsyncError, trackUserError };
}

/**
 * Higher-order component to add automatic tracking to components
 */
export function withTelemetry<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const TelemetryWrappedComponent: React.FC<P> = (props) => {
    const { trackRender } = usePerformanceTracking(displayName);
    const { trackComponentError } = useErrorTracking();

    useEffect(() => {
      trackRender();
    });

    // Error boundary effect
    useEffect(() => {
      const handleError = (event: ErrorEvent) => {        // Ignore benign browser notifications (e.g. ResizeObserver loop)
        const IGNORED = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i;
        if (IGNORED.test(event.message ?? '')) return;        if (event.filename?.includes(displayName)) {
          trackComponentError(event.error, displayName, props as any);
        }
      };

      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, [props, trackComponentError]);

    return React.createElement(WrappedComponent, props);
  };

  TelemetryWrappedComponent.displayName = `withTelemetry(${displayName})`;

  return TelemetryWrappedComponent;
}

/**
 * React Error Boundary with telemetry
 */
interface TelemetryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface TelemetryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo }>;
  componentName?: string;
}

export class TelemetryErrorBoundary extends React.Component<
  TelemetryErrorBoundaryProps,
  TelemetryErrorBoundaryState
> {
  constructor(props: TelemetryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TelemetryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'ErrorBoundary';

    trackError(error, `error-boundary-${componentName}`);
    trackEvent('error-boundary-catch', {
      componentName,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return React.createElement(FallbackComponent, {
          error: this.state.error,
          errorInfo: this.state.errorInfo,
        });
      }

      return (
        <div style={{ padding: '20px', border: '1px solid #red', borderRadius: '4px' }}>
          <h2>Something went wrong</h2>
          <p>An error occurred in this component. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '10px' }}>
              <summary>Error details (development only)</summary>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
