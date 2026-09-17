import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant =
  | 'success' // Verde suave (Aprovado, Quitado, Resolvido)
  | 'warning' // Âmbar (Pendente, Em Andamento, Aguardando)
  | 'danger'  // Rose (Reprovado, Débito Ativo)
  | 'info'    // Azul (Encaminhado, Reencaminhado, Solicitada)
  | 'neutral' // Cinza
  | 'accent'; // Destaque #1EFC1E pontual (ex: NOVO)

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

/**
 * Pílula de status. As cores semânticas (âmbar, rose, sky) valem nos dois temas porque o
 * `index.css` reescreve o tom 50 como tint translúcido no escuro — no claro elas são fundo
 * sólido, no escuro um véu sobre a superfície.
 */
const ESTILOS: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-500/15 text-[#1b6b17] dark:text-emerald-400 border-emerald-200/70 dark:border-transparent',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-200/70 dark:border-transparent',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    container: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200/70 dark:border-transparent',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  info: {
    container: 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-400 border-sky-200/70 dark:border-transparent',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  accent: {
    container: 'bg-solar-dark dark:bg-emerald-950/60 text-white dark:text-emerald-300 border-solar-dark dark:border-transparent',
    dot: 'bg-solar-accent dark:bg-emerald-400 animate-pulse',
  },
  neutral: {
    container: 'bg-superficie-sutil dark:bg-white/[0.04] text-texto-suave dark:text-texto-suave border-borda dark:border-transparent',
    dot: 'bg-texto-apagado dark:bg-texto-apagado',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = true,
  className,
}) => {
  const estilo = ESTILOS[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-2xs font-medium tracking-tight whitespace-nowrap',
        estilo.container,
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', estilo.dot)} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
};
