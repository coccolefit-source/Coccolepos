import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: (
    state:
      | ErrorBoundaryState
      | Partial<ErrorBoundaryState>
      | ((prevState: Readonly<ErrorBoundaryState>) => Partial<ErrorBoundaryState> | null)
  ) => void;

  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Ocurrió un error inesperado al cargar la vista.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.moduleName ? ` - ${this.props.moduleName}` : ''}]`, error, errorInfo);
  }

  handleResetModule = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleReloadApp = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { moduleName, compact } = this.props;
      return (
        <div
          className={`w-full flex items-center justify-center ${
            compact ? 'py-10 px-4' : 'min-h-[60vh] p-6 bg-[#FFFDF6]'
          }`}
        >
          <div className="bg-white border-2 border-[#AED6F1] rounded-2xl shadow-lg max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-[#2C3E50]">
                Algo salió mal{moduleName ? ` en ${moduleName}` : ''}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se produjo un problema temporal al mostrar este módulo. Tus datos guardados en la nube siguen seguros.
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleResetModule}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4B9CD3] hover:bg-[#3A82B4] text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recargar módulo</span>
              </button>
              <button
                type="button"
                onClick={this.handleReloadApp}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
