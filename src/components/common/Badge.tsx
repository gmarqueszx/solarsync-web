import React from 'react';

type BadgeVariant = 
  | 'success' // Verde suave (Aprovado, Quitado, Resolvido)
  | 'warning' // Âmbar/Amarelo suave (Pendente, Em Andamento, Aguardando)
  | 'danger'  // Vermelho/Rose suave (Reprovado, Débito Ativo)
  | 'info'    // Azul/Ciano suave (Encaminhado, Reencaminhado, Solicitada)
  | 'neutral' // Cinza/Neutro (Padrão, etc.)
  | 'accent'; // Destaque #1EFC1E pontual (ex: NOVO)

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = true,
  className = '',
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return {
          container: 'bg-emerald-50 text-[#1b6b17] border border-emerald-200/70',
          dot: 'bg-[#149911]',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 text-amber-800 border border-amber-200/70',
          dot: 'bg-amber-500',
        };
      case 'danger':
        return {
          container: 'bg-rose-50 text-rose-700 border border-rose-200/70',
          dot: 'bg-rose-500',
        };
      case 'info':
        return {
          container: 'bg-sky-50 text-sky-800 border border-sky-200/70',
          dot: 'bg-sky-500',
        };
      case 'accent':
        return {
          container: 'bg-[#244F26] text-white border border-[#244F26]',
          dot: 'bg-[#1EFC1E] animate-pulse',
        };
      case 'neutral':
      default:
        return {
          container: 'bg-slate-100 text-slate-700 border border-slate-200/80',
          dot: 'bg-slate-400',
        };
    }
  };

  const styles = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight ${styles.container} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
