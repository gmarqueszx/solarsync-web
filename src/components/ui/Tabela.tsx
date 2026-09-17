import React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PropsDoCabecalho } from '../../hooks/useOrdenacao';

/**
 * A tabela de listagem, no formato do painel de referência: cabeçalho apagado, sem zebra,
 * divisores de 1px e altura de linha contida. O peso visual vem do dado, não do contorno.
 *
 * Os seis módulos escreviam essas mesmas classes à mão, e já haviam divergido entre si no
 * padding das células.
 */

export const Tabela: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  // -mx-6 -my-6 desfaz o padding do Card: a tabela encosta na borda, como painel de dados.
  <div className={cn('overflow-x-auto -mx-6 -my-6', className)}>
    <table className="w-full text-left border-collapse text-xs">{children}</table>
  </div>
);

export const Cabecalho: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>
    <tr className="border-b border-borda bg-superficie-sutil dark:bg-white/[0.02] text-texto-suave">{children}</tr>
  </thead>
);

export const Th: React.FC<{
  children?: React.ReactNode;
  className?: string;
  alinhamento?: 'esquerda' | 'direita';
}> = ({ children, className, alinhamento = 'esquerda' }) => (
  <th
    className={cn(
      'py-2.5 px-4 font-medium text-2xs uppercase tracking-wider text-texto-apagado dark:text-texto-suave',
      alinhamento === 'direita' && 'text-right',
      className,
    )}
  >
    {children}
  </th>
);

/**
 * Rótulo clicável de coluna ordenável. Vai **dentro** do `<th>` — o do primitivo `Th` ou o
 * `<th>` cru dos módulos que ainda não migraram —, então serve as duas tabelas sem que elas
 * precisem concordar no estilo do cabeçalho.
 *
 * A seta só aparece colorida na coluna ativa; nas outras fica um `ChevronsUpDown` apagado, que
 * some quando o ponteiro sai. Sem essa pista, ninguém descobre que a coluna é clicável.
 *
 * Use com `cabecalho(campo)` de `useOrdenacao`: `<Ordenavel {...cabecalho('cliente')}>`.
 */
export const Ordenavel: React.FC<
  PropsDoCabecalho & { children: React.ReactNode; alinhamento?: 'esquerda' | 'direita' }
> = ({ ativo, direcao, onClick, children, alinhamento = 'esquerda' }) => {
  const Seta = !ativo ? ChevronsUpDown : direcao === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        ativo
          ? `Ordenado ${direcao === 'asc' ? 'do menor para o maior' : 'do maior para o menor'} — clique para inverter`
          : 'Ordenar por esta coluna'
      }
      className={cn(
        'group inline-flex items-center gap-1 uppercase tracking-wider font-medium',
        // Sem quebra: com o rótulo em duas linhas, a seta fica ao lado do bloco inteiro e
        // parece solta no meio do cabeçalho. Rótulo de coluna é curto — a tabela tem largura.
        'whitespace-nowrap',
        'hover:text-texto transition-colors',
        alinhamento === 'direita' && 'flex-row-reverse',
        ativo && 'text-texto',
      )}
    >
      <span>{children}</span>
      <Seta
        className={cn(
          'w-3 h-3 shrink-0 transition-opacity',
          ativo
            ? 'opacity-100 text-solar-primary dark:text-emerald-400'
            : 'opacity-0 group-hover:opacity-60',
        )}
      />
    </button>
  );
};

export const Corpo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-borda text-texto">{children}</tbody>
);

export const Linha: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <tr className={cn('hover:bg-superficie-sutil dark:hover:bg-white/[0.03] transition-colors', className)}>{children}</tr>
);

export const Td: React.FC<{
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  alinhamento?: 'esquerda' | 'direita';
}> = ({ children, className, colSpan, alinhamento = 'esquerda' }) => (
  <td
    colSpan={colSpan}
    className={cn('py-3 px-4 align-middle', alinhamento === 'direita' && 'text-right', className)}
  >
    {children}
  </td>
);

/** Linha única ocupando a tabela inteira, para "nada aqui". */
export const LinhaVazia: React.FC<{ colunas: number; children: React.ReactNode }> = ({
  colunas,
  children,
}) => (
  <tr>
    <td colSpan={colunas} className="py-10 text-center text-texto-apagado text-xs">
      {children}
    </td>
  </tr>
);
