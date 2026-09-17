import React from 'react';
import { cn } from '../../utils/cn';

const BASE =
  'w-full bg-superficie border border-borda rounded-xl px-3 py-2 text-xs text-texto '
  + 'placeholder:text-texto-apagado transition-colors '
  + 'focus:outline-none focus:ring-1 focus:ring-solar-primary focus:border-solar-primary '
  + 'disabled:opacity-50 disabled:cursor-not-allowed';

export const Entrada = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(BASE, className)} {...props} />
  ),
);
Entrada.displayName = 'Entrada';

export const Selecao = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(BASE, 'cursor-pointer', className)} {...props} />
));
Selecao.displayName = 'Selecao';

export const AreaDeTexto = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(BASE, 'resize-y', className)} {...props} />
));
AreaDeTexto.displayName = 'AreaDeTexto';

/** Rótulo + campo + ajuda, com o asterisco de obrigatório num lugar só. */
export const Campo: React.FC<{
  rotulo: string;
  htmlFor?: string;
  obrigatorio?: boolean;
  ajuda?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ rotulo, htmlFor, obrigatorio, ajuda, className, children }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block mb-1 text-xs font-medium text-texto">
      {rotulo}
      {obrigatorio && <span className="text-rose-600 ml-0.5">*</span>}
    </label>
    {children}
    {ajuda && <p className="mt-1 text-2xs text-texto-suave">{ajuda}</p>}
  </div>
);
