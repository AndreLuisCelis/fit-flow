import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FitFlow] Intercepted runtime error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col items-center justify-center p-6 text-center select-none font-body">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-400 mb-5 shadow-lg">
            <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
          </div>
          <span className="text-xs font-mono-numbers uppercase tracking-widest text-[#CCFF00] font-bold mb-1">
            FITFLOW PWA
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">
            Instabilidade Interceptada
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Ocorreu uma instabilidade pontual na interface. Seus treinos, histórico e dados no dispositivo continuam salvos com segurança.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#CCFF00] text-[#0A0F1D] font-bold text-xs uppercase tracking-wider font-mono-numbers shadow-glow-volt hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Recarregar & Voltar ao Início</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
