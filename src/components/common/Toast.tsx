import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removerToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        const isSucesso = toast.tipo === 'sucesso';
        const isAlerta = toast.tipo === 'alerta';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-surgir ${
              isSucesso
                ? 'bg-emerald-900/90 text-emerald-50 border-emerald-700/60'
                : isAlerta
                ? 'bg-amber-900/90 text-amber-50 border-amber-700/60'
                : 'bg-slate-900/90 text-slate-50 border-slate-700/60'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSucesso && <CheckCircle2 className="w-4 h-4 text-[#1EFC1E]" />}
              {isAlerta && <AlertCircle className="w-4 h-4 text-amber-300" />}
              {toast.tipo === 'info' && <Info className="w-4 h-4 text-sky-300" />}
            </div>
            <p className="text-xs leading-snug flex-1">{toast.mensagem}</p>
            <button
              onClick={() => removerToast(toast.id)}
              className="shrink-0 text-white/60 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
