import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * ⚠️ Os tempos aqui espelham o `setTimeout` de 4000ms do `AppContext`, que é quem de fato
 * remove o aviso da lista. A animação de saída começa um pouco antes para o elemento já estar
 * transparente quando o contexto o desmonta — senão o aviso some num corte, que é o que
 * acontecia: havia entrada animada e nenhuma saída.
 */
const VIDA = 4000;
const DURACAO_SAIDA = 180;

const ESTILOS = {
  sucesso: {
    caixa: 'bg-emerald-950/95 text-emerald-50 border-emerald-800/60',
    trilho: 'bg-emerald-400/70',
    Icone: CheckCircle2,
    corIcone: 'text-[#1EFC1E]',
  },
  alerta: {
    caixa: 'bg-amber-950/95 text-amber-50 border-amber-800/60',
    trilho: 'bg-amber-400/70',
    Icone: AlertCircle,
    corIcone: 'text-amber-300',
  },
  info: {
    caixa: 'bg-slate-900/95 text-slate-50 border-slate-700/60',
    trilho: 'bg-sky-400/70',
    Icone: Info,
    corIcone: 'text-sky-300',
  },
} as const;

const Aviso: React.FC<{
  tipo: 'sucesso' | 'info' | 'alerta';
  mensagem: string;
  onFechar: () => void;
}> = ({ tipo, mensagem, onFechar }) => {
  const [saindo, setSaindo] = useState(false);
  const estilo = ESTILOS[tipo];
  const { Icone } = estilo;

  useEffect(() => {
    const temporizador = window.setTimeout(() => setSaindo(true), VIDA - DURACAO_SAIDA);
    return () => window.clearTimeout(temporizador);
  }, []);

  const fecharAgora = () => {
    setSaindo(true);
    window.setTimeout(onFechar, DURACAO_SAIDA);
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 pb-4 rounded-xl border shadow-lg',
        estilo.caixa,
        saindo ? 'animate-sair-aviso' : 'animate-entrar-aviso',
      )}
    >
      <div className="shrink-0 mt-0.5">
        <Icone className={cn('w-4 h-4', estilo.corIcone)} />
      </div>
      <p className="text-xs leading-snug flex-1">{mensagem}</p>
      <button
        type="button"
        onClick={fecharAgora}
        aria-label="Dispensar aviso"
        className="shrink-0 text-white/60 hover:text-white p-0.5 rounded transition-colors duration-120 active:scale-90"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* O tempo restante, visível: sem isto o aviso some sem avisar que ia sumir. */}
      <span
        aria-hidden="true"
        className={cn('absolute bottom-0 left-0 h-0.5 origin-left', estilo.trilho)}
        style={{ width: '100%', animation: `crescer-x ${VIDA}ms linear reverse forwards` }}
      />
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removerToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <Aviso
          key={toast.id}
          tipo={toast.tipo}
          mensagem={toast.mensagem}
          onFechar={() => removerToast(toast.id)}
        />
      ))}
    </div>
  );
};
