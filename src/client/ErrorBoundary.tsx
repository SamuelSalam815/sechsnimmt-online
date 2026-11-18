import { Component, type ErrorInfo, type ReactNode } from 'react';

// A class component, because React has no hook that catches render errors.
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(error, errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <section>
        <h2>Something went wrong</h2>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </section>
    );
  }
}
