/**
 * Simplified observability configuration for React frontend
 * This provides basic telemetry without OpenTelemetry dependencies
 */

// Benign browser messages that should never be treated as errors
const IGNORED_ERROR_PATTERNS: RegExp[] = [
  /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i,
  /Non-Error promise rejection captured/i,
  /Loading chunk \d+ failed/i,        // handled by chunk-retry logic
  /NetworkError when attempting to fetch resource/i,
  /The operation was aborted/i,         // AbortController cancellations
];

// Configuration
const ____config = {
  serviceName: process.env.REACT_APP_OTEL_SERVICE_NAME || 'orcacloud-frontend',
  serviceVersion: process.env.REACT_APP_OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  enabled: process.env.REACT_APP_OTEL_ENABLED !== 'false',
  enableConsole: process.env.REACT_APP_OTEL_ENABLE_CONSOLE === 'true',
};

// Simple telemetry interface
interface TelemetryEvent {
  timestamp: number;
  type: string;
  data: Record<string, any>;
  sessionId: string;
}

class SimpleTelemetry {
  private events: TelemetryEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObserver();
    this.setupErrorTracking();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  private setupPerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackEvent('performance', {
              name: entry.name,
              duration: entry.duration,
              type: entry.entryType,
              startTime: entry.startTime,
            });
          }
        });

        observer.observe({ entryTypes: ['navigation', 'paint', 'measure'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  private setupErrorTracking() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Suppress benign browser notifications that are not real errors
        if (IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(event.message))) {
          return;
        }
        this.trackEvent('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const msg = typeof event.reason === 'string' ? event.reason : event.reason?.message ?? '';
        if (IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(msg))) {
          return;
        }
        this.trackEvent('unhandled-rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  trackEvent(type: string, data: Record<string, any>) {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      type,
      data: {
        ...data,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      },
      sessionId: this.sessionId,
    };

    this.events.push(event);

    if (____config.enableConsole) {
      console.log('[Telemetry]', event);
    }

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Send to backend (implement as needed)
    this.sendToBackend(event);
  }

  private async sendToBackend(event: TelemetryEvent) {
    if (!____config.enabled) return;

    try {
      await fetch('/api/telemetry/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Silently fail - don't disrupt user experience
      if (____config.enableConsole) {
        console.warn('Failed to send telemetry:', error);
      }
    }
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }
}

// Global telemetry instance
let ____telemetryInstance: SimpleTelemetry | null = null;

export function initializeOpenTelemetry(): void {
  if (!____config.enabled) {
    console.log('Telemetry is disabled');
    return;
  }

  try {
    ____telemetryInstance = new SimpleTelemetry();
    console.log('Simple telemetry initialized successfully');

    // Track page load
    ____telemetryInstance.trackEvent('page-load', {
      path: window.location.pathname,
      search: window.location.search,
      title: document.title,
    });
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
  }
}

export function shutdownOpenTelemetry(): Promise<void> {
  if (____telemetryInstance) {
    ____telemetryInstance.clearEvents();
    ____telemetryInstance = null;
  }
  return Promise.resolve();
}

export function trackEvent(type: string, data: Record<string, any> = {}): void {
  if (____telemetryInstance) {
    ____telemetryInstance.trackEvent(type, data);
  }
}

export function trackPageView(pageName: string, path: string): void {
  trackEvent('page-view', {
    pageName,
    path,
    timestamp: Date.now(),
  });
}

export function trackUserInteraction(action: string, target: string, data: Record<string, any> = {}): void {
  trackEvent('user-interaction', {
    action,
    target,
    ...data,
  });
}

export function trackApiCall(method: string, url: string, status: number, duration: number): void {
  trackEvent('api-call', {
    method,
    url,
    status,
    duration,
  });
}

export function trackError(error: Error, context: string = 'unknown'): void {
  trackEvent('application-error', {
    message: error.message,
    stack: error.stack,
    context,
  });
}

// Export configuration for use in other modules
export { ____config };
