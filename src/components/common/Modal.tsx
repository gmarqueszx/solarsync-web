import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/** Tem de bater com a duração de `animate-sair-dialogo` no tailwind.config.js. */
const DURACAO_SAIDA = 150;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  /**
   * O diálogo continua montado durante a animação de saída.
   *
   * Antes ele sumia no mesmo quadro em que `isOpen` virava falso — havia animação de entrada e
   * nenhuma de saída, então salvar um formulário fazia a janela piscar para fora. O estado
   * `fechando` é o que dá ao CSS os 150ms de que ele precisa antes de a árvore ser desmontada.
   */
  const [montado, setMontado] = useState(isOpen);
  const [fechando, setFechando] = useState(false);
  const dialogo = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<Element | null>(null);

  /**
   * `fechar` só avisa o pai; quem decide desmontar é o efeito abaixo, olhando para `isOpen`.
   * Assim a animação de saída vale também quando o módulo fecha o diálogo por conta própria —
   * depois de salvar, por exemplo —, e não só quando se clica no X.
   */
  const fechar = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (isOpen) {
      setMontado(true);
      setFechando(false);
      return;
    }
    if (!montado) return;

    setFechando(true);
    const temporizador = window.setTimeout(() => {
      setMontado(false);
      setFechando(false);
    }, DURACAO_SAIDA);
    return () => window.clearTimeout(temporizador);
  }, [isOpen, montado]);

  useEffect(() => {
    if (!montado) return;

    focoAnterior.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    // Foco no diálogo: sem isto o teclado continua na página atrás, e Tab passeia por trás do
    // backdrop em vez de andar pelo formulário.
    dialogo.current?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    window.addEventListener('keydown', aoTeclar);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', aoTeclar);
      (focoAnterior.current as HTMLElement | null)?.focus?.();
    };
  }, [montado, fechar]);

  if (!montado) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm',
          fechando ? 'animate-sair-esmaecer' : 'animate-esmaecer',
        )}
        onClick={fechar}
        aria-hidden="true"
      />

      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          // Tokens de interface no lugar de `bg-white` / `border-slate-100`: o diálogo era a
          // última superfície do sistema ainda escrita em cor fixa de tema claro, e só não
          // aparecia quebrada no escuro por causa dos overrides `!important` do index.css.
          'relative w-full rounded-2xl border border-borda dark:border-white/[0.06] bg-superficie',
          'shadow-xl dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]',
          'overflow-hidden z-10 flex flex-col max-h-[90vh] focus:outline-none',
          widthClass,
          fechando ? 'animate-sair-dialogo' : 'animate-entrar-dialogo',
        )}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-borda dark:border-white/[0.04] bg-superficie-sutil">
          <div className="min-w-0">
            <h3 className="text-base font-medium text-texto tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-xs text-texto-suave mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="p-1.5 shrink-0 text-texto-apagado hover:text-texto hover:bg-superficie-elevada rounded-lg transition-colors duration-120 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-texto-suave">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-borda dark:border-white/[0.04] bg-superficie-sutil">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
