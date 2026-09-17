import { useCallback, useState } from 'react';

/**
 * Ordenação crescente/decrescente por coluna, no cliente.
 *
 * É no cliente de propósito: o `AppContext` já carrega as listas inteiras (dezenas a centenas
 * de linhas), então ordenar aqui é instantâneo e não gasta uma ida ao servidor a cada clique no
 * cabeçalho. Se o volume crescer a ponto de a lista ser paginada no servidor, esta é a peça que
 * precisa passar a mandar `sort` na requisição.
 */

export type Direcao = 'asc' | 'desc';

export interface Ordenacao<C extends string> {
  campo: C;
  direcao: Direcao;
}

/** O que sabemos comparar. `null`/`undefined` significam "não tem", não "é o menor". */
export type ValorOrdenavel = string | number | boolean | null | undefined;

export interface PropsDoCabecalho {
  ativo: boolean;
  direcao: Direcao;
  onClick: () => void;
  'aria-sort': 'ascending' | 'descending' | 'none';
}

/**
 * Compara dois valores do mesmo tipo.
 *
 * ⚠️ Texto passa por `localeCompare('pt-BR')`, e não por `<`: sem isso "Ângela" cairia depois
 * de "Zilda", porque a comparação bruta é por code point. `sensitivity: 'base'` faz caixa e
 * acento não separarem nomes que a pessoa lê como iguais.
 *
 * Datas ISO (`YYYY-MM-DD` e ISO-8601) são texto e ordenam certo como texto — é a razão de o
 * formato existir. Não converta para `Date` aqui: data pura vira meia-noite UTC e muda de dia
 * em `America/Sao_Paulo` (a mesma armadilha de `utils/data.ts`).
 */
function comparar(a: ValorOrdenavel, b: ValorOrdenavel): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  return Number(a) - Number(b);
}

/**
 * @param valores como extrair de cada linha o valor de cada coluna ordenável
 * @param inicial coluna e direção de abertura da tela — normalmente a mais útil da fila,
 *                não a primeira da tabela
 */
export function useOrdenacao<T, C extends string>(
  valores: Record<C, (item: T) => ValorOrdenavel>,
  inicial: Ordenacao<C>,
) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao<C>>(inicial);

  /**
   * Clicar na coluna já ativa inverte a direção; clicar em outra começa crescente. É o
   * comportamento que todo mundo já espera de planilha e de tabela de sistema.
   */
  const alternar = useCallback((campo: C) => {
    setOrdenacao(atual =>
      atual.campo === campo
        ? { campo, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo, direcao: 'asc' },
    );
  }, []);

  const cabecalho = useCallback(
    (campo: C): PropsDoCabecalho => ({
      ativo: ordenacao.campo === campo,
      direcao: ordenacao.campo === campo ? ordenacao.direcao : 'asc',
      onClick: () => alternar(campo),
      'aria-sort':
        ordenacao.campo !== campo
          ? 'none'
          : ordenacao.direcao === 'asc'
            ? 'ascending'
            : 'descending',
    }),
    [ordenacao, alternar],
  );

  /**
   * Devolve uma cópia ordenada — nunca mexe na lista recebida, que costuma vir de um `useMemo`
   * de filtro e é reusada por contagens e KPIs na mesma tela.
   *
   * Linha sem valor vai para o fim **nas duas direções**: inverter a ordem não deveria encher o
   * topo da tela de "—". Quem procura o que está faltando usa o filtro, não a ordenação.
   */
  const ordenar = (lista: T[]): T[] => {
    const extrair = valores[ordenacao.campo];
    if (!extrair) return lista;

    const sinal = ordenacao.direcao === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      const valorA = extrair(a);
      const valorB = extrair(b);
      const vazioA = valorA === null || valorA === undefined || valorA === '';
      const vazioB = valorB === null || valorB === undefined || valorB === '';
      if (vazioA && vazioB) return 0;
      if (vazioA) return 1;
      if (vazioB) return -1;
      return sinal * comparar(valorA, valorB);
    });
  };

  // `ordenar` é função simples, não memoizada: `valores` é um literal recriado a cada render, e
  // memoizar sobre ele daria uma identidade nova sempre — ou, ignorando-o, um closure velho.
  // Quem chama envolve em `useMemo` com `ordenacao` na lista de dependências.
  return { ordenacao, alternar, ordenar, cabecalho };
}
