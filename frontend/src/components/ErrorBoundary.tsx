/**
 * Error Boundary Component
 * 
 * React error boundary for catching and gracefully handling runtime errors.
 * Prevents the entire application from crashing due to component errors.
 * 
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Displays fallback UI instead of crashed component tree
 * - Logs errors for debugging
 * - Optional error reporting
 * 
 * @module components/ErrorBoundary
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to display on error */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional scope name for better error identification */
  scope?: string;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary class component
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method to derive state from error
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}] Caught error:`, error);
    console.error("Component stack:", errorInfo.componentStack);

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (could integrate with Sentry, etc.)
    this.reportError(error, errorInfo);
  }

  /**
   * Reports error to monitoring service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // In production, this could send to error tracking service
    if (typeof window !== "undefined" && import.meta.env.PROD) {
      // Example: Send to backend error endpoint
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        scope: this.props.scope,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      // Fire and forget error report
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    }
  }

  /**
   * Resets the error boundary state
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // If fallback is a function, call it with error and reset
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // If fallback is provided as JSX, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          scope={this.props.scope}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Props for the default error fallback component
 */
interface DefaultErrorFallbackProps {
  error: Error;
  onReset: () => void;
  scope?: string;
}

/**
 * Default error fallback UI
 */
const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  onReset,
  scope,
}) => {
  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="error-boundary">
      <div className="error-boundary__content">
        <div className="error-boundary__icon" aria-hidden="true">
          ⚠️
        </div>
        <h2 className="error-boundary__title">Something went wrong</h2>
        <p className="error-boundary__message">
          We're sorry, but something unexpected happened.
          {scope && <span className="error-boundary__scope"> ({scope})</span>}
        </p>
        
        {isDevelopment && (
          <details className="error-boundary__details">
            <summary>Error Details</summary>
            <pre className="error-boundary__stack">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="error-boundary__actions">
          <button
            type="button"
            className="ui-button primary"
            onClick={onReset}
          >
            Try Again
          </button>
          <button
            type="button"
            className="ui-button secondary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
