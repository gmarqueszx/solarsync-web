import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Estava duplicado literalmente em seis módulos, todos com `itensPorPagina = 6`. Aqui o padrão
 * é 8: as linhas ficaram mais baixas na lapidação, e 6 deixava meia tela vazia.
 */
export const ITENS_POR_PAGINA = 8;

export const Paginacao: React.FC<{
  pagina: number;
  totalPaginas: number;
  exibidos: number;
  total: number;
  onMudar: (pagina: number) => void;
  className?: string;
}> = ({ pagina, totalPaginas, exibidos, total, onMudar, className }) => (
  <div
    className={cn(
      'flex items-center justify-between pt-4 mt-2 border-t border-borda text-2xs text-texto-suave',
      className,
    )}
  >
    <div>
      Mostrando <span className="font-medium text-texto">{exibidos}</span> de{' '}
      <span className="font-medium text-texto">{total}</span>{' '}
      {total === 1 ? 'registro' : 'registros'}
    </div>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pagina <= 1}
        onClick={() => onMudar(Math.max(pagina - 1, 1))}
        aria-label="Página anterior"
        className="p-1.5 rounded-lg border border-borda text-texto-suave disabled:opacity-35 disabled:cursor-not-allowed hover:bg-superficie-sutil transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-1 text-texto font-medium">
        {pagina} / {totalPaginas}
      </span>
      <button
        type="button"
        disabled={pagina >= totalPaginas}
        onClick={() => onMudar(Math.min(pagina + 1, totalPaginas))}
        aria-label="Próxima página"
        className="p-1.5 rounded-lg border border-borda text-texto-suave disabled:opacity-35 disabled:cursor-not-allowed hover:bg-superficie-sutil transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);
