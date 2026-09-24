import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { textoDiasParado } from '../../utils/data';

/**
 * Há quanto tempo o cliente está parado. A cor é o aviso: é a rampa que faz o financeiro
 * enxergar de longe quem já passou do tolerável, sem precisar ler os números um a um.
 *
 * Os limites (7 e 15 dias) são um ponto de partida da operação; se o financeiro trabalhar com
 * outro corte, é aqui que se muda — num lugar só.
 */
const ATENCAO_A_PARTIR_DE = 8;
const CRITICO_A_PARTIR_DE = 16;

export const BadgeTempo: React.FC<{ dias: number | null | undefined; className?: string }> = ({
  dias,
  className,
}) => {
  // Nulo é "não está parado", não "parado há zero dias" — mesma disciplina das médias.
  if (dias === null || dias === undefined) {
    return <span className="text-texto-apagado">—</span>;
  }

  const tom =
    dias >= CRITICO_A_PARTIR_DE
      ? 'bg-rose-50 text-rose-700 border-rose-200/70 dark:text-rose-400'
      : dias >= ATENCAO_A_PARTIR_DE
        ? 'bg-amber-50 text-amber-700 border-amber-200/70 dark:text-amber-400'
        : 'bg-superficie-sutil text-texto-suave border-borda';

  return (
    <span
      className={cn(
        // `max-w-fit` pela mesma razão do Badge: em contêiner flex-col a pílula estica.
        'inline-flex max-w-fit items-center gap-1 px-2 py-0.5 rounded-full border text-2xs font-medium tabular-nums',
        tom,
        className,
      )}
    >
      <Clock className="w-3 h-3 shrink-0" />
      {textoDiasParado(dias)}
    </span>
  );
};
