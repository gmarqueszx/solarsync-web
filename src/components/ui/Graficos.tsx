import React, { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
import { useLargura } from '../../hooks/useLargura';

/**
 * Os dois gráficos do dashboard.
 *
 * ## Por que existe um arquivo só para isto
 *
 * Os dois eram desenhados à mão dentro do `DashboardModule`, e os dois mentiam:
 *
 * - o de ritmo tinha um `path` SVG com coordenadas **fixas no código** — a curva era sempre a
 *   mesma, independente dos números; e o `viewBox` esticado (`preserveAspectRatio="none"`)
 *   achatava os círculos dos pontos em elipses;
 * - o de tipos pintava a maior barra de **branco**, que some no tema claro (fundo branco) e
 *   some no escuro também (o `index.css` reescreve `.bg-white` para a cor da superfície); e
 *   dava 12% de altura mínima a toda barra, então "zero" desenhava um toco igual ao de "1".
 *
 * ## As cores
 *
 * `#149911` (verde da marca) e `#0B7FBF` passam nos seis testes de paleta categórica nos dois
 * temas — banda de luminosidade, piso de croma, separação para daltonismo (ΔE 23,6, bem acima
 * do mínimo de 8) e contraste ≥ 3:1 contra as duas superfícies. São os mesmos valores nos dois
 * temas de propósito: o que muda é o fundo, não a identidade da série.
 *
 * ⚠️ As barras de "Projetos por Tipo" são **de uma cor só**. Categoria nominal não tem ordem,
 * então pintar cada barra de um tom diferente codificaria duas vezes a mesma informação (o
 * tamanho já diz quem é maior) e gastaria o único canal livre do gráfico.
 */

export const COR_SERIE = {
  aprovado: '#149911',
  encaminhado: '#0B7FBF',
} as const;

// ---------------------------------------------------------------------------
// Gráfico de linhas
// ---------------------------------------------------------------------------

export interface SerieTemporal {
  nome: string;
  cor: string;
  valores: number[];
  /** Preenche a área sob a linha com um véu da própria cor. Vale para uma série só. */
  area?: boolean;
}

const MARGEM = { topo: 14, direita: 14, baixo: 24, esquerda: 30 };

/** Arredonda o teto do eixo para 1/2/5 × 10ⁿ, senão os rótulos saem em 3,33 e 6,67. */
function tetoBonito(maximo: number): number {
  if (maximo <= 4) return Math.max(1, Math.ceil(maximo));
  const magnitude = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    const candidato = passo * magnitude;
    if (candidato >= maximo) return candidato;
  }
  return 10 * magnitude;
}

/**
 * Interpolação cúbica monótona (Fritsch–Carlson). Curva suave **sem ultrapassar** os pontos:
 * uma spline comum desceria abaixo de zero entre dois valores baixos, desenhando contagem
 * negativa de projetos.
 */
function caminhoSuave(pontos: { x: number; y: number }[]): string {
  if (pontos.length === 0) return '';
  if (pontos.length === 1) return `M ${pontos[0].x},${pontos[0].y}`;
  if (pontos.length === 2) {
    return `M ${pontos[0].x},${pontos[0].y} L ${pontos[1].x},${pontos[1].y}`;
  }

  const n = pontos.length;
  const dx: number[] = [];
  const declive: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pontos[i + 1].x - pontos[i].x);
    declive.push((pontos[i + 1].y - pontos[i].y) / (pontos[i + 1].x - pontos[i].x));
  }

  const tangente: number[] = new Array(n);
  tangente[0] = declive[0];
  tangente[n - 1] = declive[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (declive[i - 1] * declive[i] <= 0) {
      tangente[i] = 0;
    } else {
      const soma = dx[i - 1] + dx[i];
      tangente[i] =
        (3 * soma)
        / ((soma + dx[i]) / declive[i - 1] + (soma + dx[i - 1]) / declive[i]);
    }
  }

  let d = `M ${pontos[0].x},${pontos[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pontos[i].x + dx[i] / 3;
    const c1y = pontos[i].y + (tangente[i] * dx[i]) / 3;
    const c2x = pontos[i + 1].x - dx[i] / 3;
    const c2y = pontos[i + 1].y - (tangente[i + 1] * dx[i]) / 3;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${pontos[i + 1].x},${pontos[i + 1].y}`;
  }
  return d;
}

export const GraficoLinhas: React.FC<{
  rotulos: string[];
  series: SerieTemporal[];
  altura?: number;
  /** Nome da unidade no tooltip e na tabela ("projetos", "clientes"). */
  unidade?: string;
  vazio?: React.ReactNode;
  className?: string;
}> = ({ rotulos, series, altura = 176, unidade = '', vazio, className }) => {
  const [caixa, largura] = useLargura<HTMLDivElement>();
  const [foco, setFoco] = useState<number | null>(null);

  const temDado = series.some(s => s.valores.some(v => v > 0));
  const n = rotulos.length;

  const geometria = useMemo(() => {
    const l = Math.max(largura, 240);
    const areaX = l - MARGEM.esquerda - MARGEM.direita;
    const areaY = altura - MARGEM.topo - MARGEM.baixo;
    const teto = tetoBonito(Math.max(1, ...series.flatMap(s => s.valores)));
    const x = (i: number) => MARGEM.esquerda + (n <= 1 ? areaX / 2 : (areaX * i) / (n - 1));
    const y = (v: number) => MARGEM.topo + areaY - (areaY * v) / teto;
    return { l, areaX, areaY, teto, x, y };
  }, [largura, altura, series, n]);

  const { l, areaX, areaY, teto, x, y } = geometria;

  // 0 / metade / teto. Três linhas bastam para situar a escala sem virar papel milimetrado.
  const marcas = [0, teto / 2, teto];

  const indiceDoPonteiro = (clienteX: number, alvo: DOMRect) => {
    const relativo = clienteX - alvo.left - MARGEM.esquerda;
    if (n <= 1) return 0;
    const passo = areaX / (n - 1);
    return Math.min(n - 1, Math.max(0, Math.round(relativo / passo)));
  };

  if (!temDado) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-borda text-center px-6',
          className,
        )}
        style={{ height: altura }}
      >
        {vazio ?? (
          <p className="text-2xs text-texto-apagado">Sem movimentação registrada no período.</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Legenda: obrigatória com duas séries — a identidade nunca pode depender só da cor. */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
        <div className="flex items-center gap-4">
          {series.map(serie => (
            <span
              key={serie.nome}
              className="inline-flex items-center gap-1.5 text-2xs text-texto-suave"
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: serie.cor }}
              />
              {serie.nome}
            </span>
          ))}
        </div>
      </div>

      <div ref={caixa} className="relative select-none" style={{ height: altura }}>
        <svg
          width="100%"
          height={altura}
          viewBox={`0 0 ${l} ${altura}`}
          role="img"
          aria-label={`Gráfico de linhas: ${series.map(s => s.nome).join(' e ')}`}
          className="overflow-visible text-texto-apagado"
          tabIndex={0}
          onFocus={() => setFoco(f => f ?? n - 1)}
          onBlur={() => setFoco(null)}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') {
              setFoco(f => Math.min(n - 1, (f ?? -1) + 1));
              e.preventDefault();
            }
            if (e.key === 'ArrowLeft') {
              setFoco(f => Math.max(0, (f ?? n) - 1));
              e.preventDefault();
            }
          }}
          onMouseMove={e =>
            setFoco(indiceDoPonteiro(e.clientX, e.currentTarget.getBoundingClientRect()))
          }
          onMouseLeave={() => setFoco(null)}
        >
          <defs>
            {series.map(serie => (
              <linearGradient key={serie.nome} id={`veu-${serie.nome.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={serie.cor} stopOpacity="0.16" />
                <stop offset="100%" stopColor={serie.cor} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grade: fio de 1px, sólido. Tracejado lê como projeção ou meta, e isto é só escala. */}
          {marcas.map(marca => (
            <g key={marca}>
              <line
                x1={MARGEM.esquerda}
                y1={y(marca)}
                x2={l - MARGEM.direita}
                y2={y(marca)}
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="1"
              />
              <text
                x={MARGEM.esquerda - 8}
                y={y(marca) + 3}
                textAnchor="end"
                className="fill-current text-[9px] tabular-nums"
                opacity="0.9"
              >
                {marca % 1 === 0 ? marca : marca.toFixed(1)}
              </text>
            </g>
          ))}

          {series.map(serie => {
            const pontos = serie.valores.map((v, i) => ({ x: x(i), y: y(v) }));
            const d = caminhoSuave(pontos);
            const chave = serie.nome.replace(/\W/g, '');
            return (
              <g key={serie.nome}>
                {serie.area && (
                  <path
                    d={`${d} L ${pontos[pontos.length - 1].x},${MARGEM.topo + areaY} L ${pontos[0].x},${MARGEM.topo + areaY} Z`}
                    fill={`url(#veu-${chave})`}
                    className="animate-esmaecer"
                  />
                )}
                <path
                  key={`${chave}-${serie.valores.join(',')}`}
                  d={d}
                  fill="none"
                  stroke={serie.cor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className="animate-desenhar"
                />
                {/* Ponta da série: o único marcador permanente. Um ponto em cada valor viraria
                    confete — o resto aparece no foco e na tabela. */}
                <circle
                  cx={pontos[pontos.length - 1].x}
                  cy={pontos[pontos.length - 1].y}
                  r="4"
                  fill={serie.cor}
                  stroke="var(--superficie)"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {foco !== null && (
            <g pointerEvents="none">
              <line
                x1={x(foco)}
                y1={MARGEM.topo}
                x2={x(foco)}
                y2={MARGEM.topo + areaY}
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              {series.map(serie => (
                <circle
                  key={serie.nome}
                  cx={x(foco)}
                  cy={y(serie.valores[foco] ?? 0)}
                  r="4.5"
                  fill={serie.cor}
                  stroke="var(--superficie)"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}

          {/* Rótulos do eixo X: primeiro, meio e último. Todos colidiriam em doze baldes. */}
          {rotulos.map((rotulo, i) => {
            const mostrar = i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2);
            if (!mostrar) return null;
            return (
              <text
                key={rotulo + i}
                x={x(i)}
                y={altura - 6}
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                className="fill-current text-[9px]"
              >
                {rotulo}
              </text>
            );
          })}
        </svg>

        {foco !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-borda bg-superficie-elevada px-2.5 py-1.5 shadow-card-hover animate-esmaecer"
            style={{
              left: Math.min(Math.max(x(foco), 70), Math.max(l - 70, 70)),
              top: 0,
            }}
          >
            <div className="text-[10px] font-medium text-texto whitespace-nowrap">
              {rotulos[foco]}
            </div>
            {series.map(serie => (
              <div
                key={serie.nome}
                className="flex items-center gap-1.5 text-[10px] text-texto-suave whitespace-nowrap"
              >
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: serie.cor }}
                />
                <span className="tabular-nums font-medium text-texto">
                  {serie.valores[foco] ?? 0}
                </span>
                <span>{serie.nome.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* O gêmeo em tabela: nenhum valor fica trancado atrás do ponteiro do mouse. */}
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-2xs text-texto-apagado hover:text-texto-suave transition-colors inline-flex items-center gap-1">
          <span className="transition-transform group-open:rotate-90">›</span>
          Ver números {unidade && `(${unidade})`}
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-2xs tabular-nums">
            <thead>
              <tr className="text-texto-apagado">
                <th className="py-1 pr-3 font-medium">Período</th>
                {series.map(s => (
                  <th key={s.nome} className="py-1 pr-3 font-medium text-right">
                    {s.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda text-texto-suave">
              {rotulos.map((rotulo, i) => (
                <tr key={rotulo + i}>
                  <td className="py-1 pr-3">{rotulo}</td>
                  {series.map(s => (
                    <td key={s.nome} className="py-1 pr-3 text-right text-texto">
                      {s.valores[i] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Barras horizontais
// ---------------------------------------------------------------------------

export interface ItemBarra {
  rotulo: string;
  valor: number;
  dica?: string;
}

/**
 * Barras deitadas, e não colunas em pé: os nomes das categorias aqui são longos ("Ampliação de
 * Projeto Existente"). Em coluna eles não cabem embaixo da barra e acabam cortados — foi o que
 * acontecia. Deitado, o rótulo tem a largura do card inteiro.
 */
export const GraficoBarrasHorizontais: React.FC<{
  itens: ItemBarra[];
  cor?: string;
  /** Mostra a fatia de cada item sobre o total, ao lado do valor absoluto. */
  comPercentual?: boolean;
  className?: string;
}> = ({ itens, cor = COR_SERIE.aprovado, comPercentual = true, className }) => {
  const total = itens.reduce((soma, item) => soma + item.valor, 0);
  const maximo = Math.max(...itens.map(i => i.valor), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {itens.map(item => {
        // Zero é zero: nenhuma altura mínima. A barra de 12% que existia antes fazia "nenhum
        // projeto deste tipo" parecer "alguns".
        const proporcao = item.valor === 0 ? 0 : (item.valor / maximo) * 100;
        const fatia = total === 0 ? 0 : Math.round((item.valor / total) * 100);

        return (
          <div key={item.rotulo} title={item.dica}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-[11px] font-medium text-texto truncate">{item.rotulo}</span>
              <span className="text-[11px] text-texto-suave tabular-nums shrink-0">
                <strong className="font-semibold text-texto">{item.valor}</strong>
                {comPercentual && total > 0 && (
                  <span className="text-texto-apagado"> · {fatia}%</span>
                )}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-superficie-sutil dark:bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full origin-left animate-crescer-x"
                style={{ width: `${proporcao}%`, backgroundColor: cor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Medidor de progresso
// ---------------------------------------------------------------------------

/**
 * Quanto da carga já está aprovada. Uma cor sobre trilho neutro, e **não** verde contra âmbar
 * como era antes: esse par tem ΔE 3,1 em deuteranopia — as duas metades da barra viram um bloco
 * só para cerca de 5% dos homens, que é boa parte de uma equipe de campo. O restante é o
 * trilho; os números embaixo dizem quantos são.
 */
export const Medidor: React.FC<{
  percentual: number;
  cor?: string;
  rotulo?: string;
  className?: string;
}> = ({ percentual, cor = COR_SERIE.aprovado, rotulo, className }) => (
  <div
    role="progressbar"
    aria-valuenow={Math.round(percentual)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={rotulo}
    className={cn(
      'h-2 w-full overflow-hidden rounded-full bg-superficie-sutil dark:bg-white/[0.06]',
      className,
    )}
  >
    <div
      className="h-full rounded-full transition-[width] duration-700 ease-suave"
      style={{ width: `${Math.min(100, Math.max(0, percentual))}%`, backgroundColor: cor }}
    />
  </div>
);
