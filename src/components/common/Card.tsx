import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerBorder?: boolean;
  noPadding?: boolean;
}

/**
 * Superfície de conteúdo: borda de 1px e sem sombra no escuro.
 * A separação vem do contorno refinado, no estilo executivo do Metric.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  contentClassName,
  title,
  subtitle,
  action,
  headerBorder = true,
  noPadding = false,
}) => {
  return (
    <div className={cn('bg-superficie rounded-card border border-borda dark:border-transparent transition-colors', className)}>
      {(title || subtitle || action) && (
        <div
          className={cn(
            'flex items-center justify-between gap-4 px-6 py-4',
            headerBorder && 'border-b border-borda dark:border-white/[0.04]',
          )}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-texto tracking-tight">{title}</h3>
            )}
            {subtitle && <p className="text-2xs text-texto-suave mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && 'p-6', contentClassName)}>{children}</div>
    </div>
  );
};
