import React from 'react';
import { cn } from '../../utils/cn';

type Variante = 'primario' | 'secundario' | 'contorno' | 'fantasma' | 'perigo';
type Tamanho = 'sm' | 'md' | 'icone';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-solar-primary text-white hover:bg-solar-primary-hover shadow-card',
  secundario:
    'bg-superficie-elevada text-texto border border-borda hover:border-borda-forte',
  contorno: 'border border-borda text-texto-suave hover:bg-superficie-sutil hover:text-texto',
  fantasma: 'text-texto-suave hover:bg-superficie-sutil hover:text-texto',
  perigo: 'bg-rose-600 text-white hover:bg-rose-700',
};

const TAMANHOS: Record<Tamanho, string> = {
  sm: 'px-2.5 py-1 text-2xs gap-1',
  md: 'px-3.5 py-2 text-xs gap-1.5',
  icone: 'p-1.5',
};

export interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

/**
 * O botão que os seis módulos escreviam à mão, cada um com a mesma string de ~90 caracteres
 * copiada. Centralizar não é só higiene: era por isso que a paleta divergia entre telas.
 */
export const Botao: React.FC<BotaoProps> = ({
  variante = 'secundario',
  tamanho = 'md',
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center rounded-xl font-medium transition-colors',
      'disabled:opacity-45 disabled:cursor-not-allowed',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solar-primary/40',
      VARIANTES[variante],
      TAMANHOS[tamanho],
      className,
    )}
    {...props}
  />
);
