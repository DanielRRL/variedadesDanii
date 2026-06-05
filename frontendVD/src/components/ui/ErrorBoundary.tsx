import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center font-body">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle size={28} className="text-orange-500" />
          </div>
          <h2 className="font-heading text-xl font-bold text-[#212121]">Algo salió mal</h2>
          <p className="text-sm text-[#757575]">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 rounded-full bg-[#D81B60] px-6 py-3 font-heading text-sm font-semibold text-white hover:bg-[#D81B60]/90 transition-colors"
          >
            <RefreshCw size={14} />
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
