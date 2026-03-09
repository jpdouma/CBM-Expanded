import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="bg-gray-800 border border-red-500/50 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-500/20 p-3 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            </div>
            
            <div className="bg-black/40 rounded-xl p-4 mb-6 overflow-auto max-h-96">
              <p className="text-red-400 font-mono text-sm mb-2 font-bold">
                {this.state.error && this.state.error.toString()}
              </p>
              <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                Clear Local Storage & Reload
              </button>
            </div>
            <p className="mt-6 text-sm text-gray-500 italic">
              Note: Clearing local storage might help if the crash is caused by corrupted cached data.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
