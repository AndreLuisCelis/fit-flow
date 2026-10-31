import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  language?: 'pt' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language = 'pt' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed as standalone PWA, hide button
  if (isInstalled) {
    return null;
  }

  // Android / Desktop Chrome PWA prompt flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E293B] hover:bg-slate-700 text-xs font-mono-numbers text-[#CCFF00] border border-[#CCFF00]/40 shadow-glow-volt transition-all whitespace-nowrap"
        title="Instalar FitFlow no celular/desktop"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="font-bold">{language === 'pt' ? 'Instalar App' : 'Install PWA'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E293B] hover:bg-slate-700 text-xs font-mono-numbers text-slate-300 border border-slate-700 transition-all whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>{language === 'pt' ? 'Instalar iOS' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-sm bg-[#0F172A] border border-slate-700 rounded-3xl p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#38BDF8]" />
                  <h3 className="text-base font-bold font-display">
                    {language === 'pt' ? 'Instalar no iPhone / iPad' : 'Install on iPhone / iPad'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-5">
                <div className="flex items-start gap-2.5 bg-[#1E293B] p-3 rounded-2xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-[#CCFF00] text-[#0A0F1D] flex items-center justify-center font-bold font-mono-numbers shrink-0">
                    1
                  </span>
                  <span>
                    {language === 'pt'
                      ? 'Abra o Safari e toque no botão Compartilhar (ícone com quadrado e seta para cima).'
                      : 'Open Safari and tap the Share button (square with arrow up icon).'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 bg-[#1E293B] p-3 rounded-2xl border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-[#CCFF00] text-[#0A0F1D] flex items-center justify-center font-bold font-mono-numbers shrink-0">
                    2
                  </span>
                  <span>
                    {language === 'pt'
                      ? 'Role para baixo e selecione "Adicionar à Tela de Início".'
                      : 'Scroll down and select "Add to Home Screen".'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-full bg-[#CCFF00] text-[#0A0F1D] font-bold text-xs uppercase tracking-wider font-mono-numbers shadow-glow-volt"
              >
                {language === 'pt' ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
