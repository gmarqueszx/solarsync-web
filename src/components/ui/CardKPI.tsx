import React from 'react';
import { cn } from '../../utils/cn';

export type TomKPI = 'neutro' | 'positivo' | 'atencao' | 'critico' | 'info';

const TONS: Record<TomKPI, string> = {
  neutro: 'text-texto',
  positivo: 'text-emerald-600 dark:text-emerald-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  critico: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400',
};

const BADGE_TONS: Record<TomKPI, string> = {
  neutro: 'bg-slate-100 dark:bg-white/[0.06] text-texto-suave',
  positivo: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  atencao: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400',
  critico: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
  info: 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-400',
};

/**
 * Card de métrica no estilo Metric:
 * Superfície escura aveludada sem bordas brancas, número grande em branco puro
 * e micro-pílula translúcida integrada.
 */
export const CardKPI: React.FC<{
  rotulo: string;
  valor: React.ReactNode;
  sufixo?: string;
  legenda?: string;
  icone?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTom?: TomKPI;
  tom?: TomKPI;
  onClick?: () => void;
  ativo?: boolean;
  className?: string;
}> = ({
  rotulo,
  valor,
  sufixo,
  legenda,
  icone,
  badge,
  badgeTom = 'positivo',
  tom = 'neutro',
  onClick,
  ativo,
  className,
}) => {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xs font-medium text-texto-suave uppercase tracking-wider leading-tight">
          {rotulo}
        </span>
        {icone && <span className="text-texto-apagado shrink-0">{icone}</span>}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
        {/*
          Sem `tabular-nums` no número grande: dígitos de largura fixa fazem "121" parecer
          espaçado em corpo display. Alinhamento tabular é para coluna de tabela, e as colunas
          continuam com ele.
        */}
        <span className={cn('text-2xl sm:text-3xl font-semibold tracking-tight text-texto', TONS[tom])}>
          {valor}
        </span>
        {sufixo && <span className="text-xs text-texto-suave font-normal">{sufixo}</span>}
        {badge && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium leading-none',
              BADGE_TONS[badgeTom],
            )}
          >
            {badge}
          </span>
        )}
      </div>
      {legenda && <p className="mt-1.5 text-2xs text-texto-apagado leading-snug">{legenda}</p>}
    </>
  );

  const classes = cn(
    'bg-superficie rounded-card px-4 py-3.5 text-left border border-borda dark:border-transparent',
    'elevar-no-hover hover:border-borda-forte dark:hover:border-white/[0.08]',
    ativo
      ? 'border-solar-primary dark:border-emerald-500 ring-1 ring-solar-primary/30 dark:ring-emerald-500/30'
      : '',
    onClick && 'hover:bg-superficie-elevada cursor-pointer active:scale-[0.99]',
    className,
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={classes} aria-pressed={ativo}>
      {conteudo}
    </button>
  ) : (
    <div className={classes}>{conteudo}</div>
  );
};
