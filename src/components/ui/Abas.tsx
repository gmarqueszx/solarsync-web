import { cn } from '../../utils/cn';

export interface Aba<T extends string> {
  valor: T;
  rotulo: string;
  contagem?: number;
}

/**
 * Abas segmentadas — recortes de uma mesma lista, não navegação. A contagem entra na própria
 * aba porque, na tela de Débitos, "quantos estão travando cada etapa" é a informação, não um
 * detalhe da aba.
 */
export function AbasSegmentadas<T extends string>({
  abas,
  valor,
  onMudar,
  className,
}: {
  abas: Aba<T>[];
  valor: T;
  onMudar: (valor: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-xl bg-superficie-sutil border border-borda dark:border-transparent',
        className,
      )}
    >
      {abas.map((aba) => {
        const ativa = aba.valor === valor;
        return (
          <button
            key={aba.valor}
            role="tab"
            aria-selected={ativa}
            type="button"
            onClick={() => onMudar(aba.valor)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
              ativa
                ? 'bg-superficie dark:bg-white/10 text-texto dark:text-white shadow-card dark:shadow-none'
                : 'text-texto-suave hover:text-texto dark:hover:text-white',
            )}
          >
            {aba.rotulo}
            {aba.contagem !== undefined && (
              <span
                className={cn(
                  'ml-1.5 tabular-nums',
                  ativa ? 'text-solar-primary dark:text-emerald-400 font-semibold' : 'text-texto-apagado',
                )}
              >
                {aba.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
