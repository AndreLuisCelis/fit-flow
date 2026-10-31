import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  language?: 'pt' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language = 'pt' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-50 flex items-center gap-2 bg-[#0F172A] border border-[#FF6B00]/60 rounded-2xl px-3.5 py-2 text-xs font-mono-numbers text-white shadow-glow-blaze animate-in fade-in duration-300">
      <WifiOff className="w-4 h-4 text-[#FF6B00]" />
      <div>
        <span className="font-bold text-[#FF6B00] block text-[11px]">
          {language === 'pt' ? 'MODO OFFLINE ATIVO' : 'OFFLINE MODE ACTIVE'}
        </span>
        <span className="text-[10px] text-slate-300 flex items-center gap-1">
          <Database className="w-3 h-3 text-[#38BDF8]" />
          {language === 'pt' ? 'IndexedDB salvando dados localmente' : 'IndexedDB saving data locally'}
        </span>
      </div>
    </div>
  );
};
