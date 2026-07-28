import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initializeOpenTelemetry } from './observability/telemetry';

// ─── Suppress benign browser notifications ───────────────────────────────────
// Must run before anything else so CRA's dev-overlay onerror hook never sees
// these messages. Returning true from window.onerror marks the event as handled
// and prevents the red overlay from appearing.
const SUPPRESSED_ERRORS = /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i;

(window as any).onerror = (message: string): boolean => {
  return SUPPRESSED_ERRORS.test(String(message));
};

// Also suppress unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (SUPPRESSED_ERRORS.test(String(event.reason))) {
    event.preventDefault();
  }
});

// Override ResizeObserver to prevent loops
const resizeObserverErrHandler = (err: any) => {
  if (SUPPRESSED_ERRORS.test(err.message)) {
    // Ignore ResizeObserver loop error
    return;
  }
  throw err;
};

const resizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends resizeObserver {
  constructor(callback: ResizeObserverCallback) {
    const wrappedCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => {
      try {
        callback(entries, observer);
      } catch (err) {
        resizeObserverErrHandler(err);
      }
    };
    super(wrappedCallback);
  }
};
// ─────────────────────────────────────────────────────────────────────────────

function ____showBootstrapError(message: string): void {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    return;
  }

  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FFFFFF;padding:24px;">
      <div style="max-width:720px;width:100%;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;padding:20px;font-family:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Frontend failed to render</h2>
        <p style="margin:0;color:#475569;line-height:1.45;">${message}</p>
        <p style="margin:12px 0 0;color:#64748b;font-size:13px;">Open browser DevTools Console for full stack trace.</p>
      </div>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  if (SUPPRESSED_ERRORS.test(event.message ?? '')) return;
  ____showBootstrapError(event.message || 'An unexpected runtime error occurred.');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = (event.reason as any)?.message || String(event.reason || 'Unhandled promise rejection');
  if (SUPPRESSED_ERRORS.test(reason)) return;
  ____showBootstrapError(reason);
});

// Initialize OpenTelemetry before anything else
initializeOpenTelemetry();

try {
  const ____root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  ____root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  const message = (error as Error)?.message || 'Failed to bootstrap the React application.';
  ____showBootstrapError(message);
}

// Signal to the static index.html that the app has mounted so the
// initial loading spinner can be hidden. Also remove the spinner DOM
// node as a fallback for browsers that may not respect the .app-loaded
// class immediately.
document.body.classList.add('app-loaded');
const __loadingSpinner = document.getElementById('loading-spinner');
if (__loadingSpinner && __loadingSpinner.parentNode) {
  __loadingSpinner.parentNode.removeChild(__loadingSpinner);
}

// Service worker disabled (causes load hang when cached filenames change)
// serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
