import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in InscribeSoul UI:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-stone-900 border border-red-900/60 rounded-2xl p-6 space-y-4">
            <h2 className="font-serif text-xl text-red-400 font-bold uppercase tracking-wider">
              Application Error
            </h2>
            <p className="font-mono text-xs text-stone-300 bg-stone-950 p-3 rounded-xl border border-stone-800 break-all">
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 text-amber-200 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
