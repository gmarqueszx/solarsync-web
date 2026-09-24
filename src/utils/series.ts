import { dataDeISO, dataISO, formatarDiaMes, formatarMesAno } from './data';

/**
 * Agrupamento de datas em baldes para o gráfico de ritmo do dashboard.
 *
 * ⚠️ Existe porque o gráfico "Ritmo de Aprovações" era **desenhado à mão**: um `path` SVG com
 * coordenadas fixas no código, que nunca mudava de forma por mais que os números mudassem. Os
 * quatro pontos até calculavam um valor a partir dos KPIs, mas o valor não era usado em lugar
 * nenhum — só a bolinha era desenhada, sempre na mesma altura. A linha era decoração com cara
 * de dado, que é a pior espécie de bug num painel gerencial.
 */

export interface Balde {
  /** Começo do intervalo, inclusive. */
  inicio: Date;
  /** Fim do intervalo, inclusive. */
  fim: Date;
  rotulo: string;
}

export type Granularidade = 'SEMANA' | 'MES';

/** Quantos baldes o eixo comporta sem os rótulos se atropelarem. */
const MAX_BALDES = 12;
/** Abaixo disto a linha não tem o que contar; o gráfico mostra o estado vazio. */
const MIN_BALDES = 3;

function meiaNoite(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function somarDias(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

/**
 * Monta os baldes do eixo X entre duas datas.
 *
 * A granularidade é escolhida pelo tamanho do recorte, e não fixa em "semana": com o filtro em
 * "Todos", a carteira inteira pode cobrir um ano, e 52 colunas semanais viram uma serra
 * ilegível. Até ~3 meses agrupa por semana; acima disso, por mês.
 */
export function montarBaldes(inicioISO: string, fimISO: string): {
  baldes: Balde[];
  granularidade: Granularidade;
} {
  const inicio = meiaNoite(dataDeISO(inicioISO) ?? new Date());
  const fim = meiaNoite(dataDeISO(fimISO) ?? new Date());
  const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1);

  if (dias <= MAX_BALDES * 7) {
    // Os baldes são ancorados no **fim** e caminham para trás: o último sempre termina hoje,
    // que é o que a pessoa procura primeiro ao olhar o gráfico.
    const quantidade = Math.min(MAX_BALDES, Math.max(MIN_BALDES, Math.ceil(dias / 7)));
    const baldes: Balde[] = [];
    for (let i = quantidade - 1; i >= 0; i--) {
      const fimBalde = somarDias(fim, -7 * i);
      const inicioBalde = somarDias(fimBalde, -6);
      baldes.push({ inicio: inicioBalde, fim: fimBalde, rotulo: formatarDiaMes(inicioBalde) });
    }
    return { baldes, granularidade: 'SEMANA' };
  }

  const baldes: Balde[] = [];
  const cursor = new Date(fim.getFullYear(), fim.getMonth(), 1);
  const meses = Math.min(
    MAX_BALDES,
    (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1,
  );
  for (let i = meses - 1; i >= 0; i--) {
    const inicioMes = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() - i + 1, 0);
    baldes.push({ inicio: inicioMes, fim: fimMes, rotulo: formatarMesAno(inicioMes) });
  }
  return { baldes, granularidade: 'MES' };
}

/**
 * Conta quantas das datas caem em cada balde. Data ausente ou fora do intervalo é ignorada —
 * não vira zero no primeiro balde, que é o erro clássico de histograma.
 */
export function contarPorBalde(baldes: Balde[], datas: (string | null | undefined)[]): number[] {
  const contagem = new Array(baldes.length).fill(0);
  for (const iso of datas) {
    const data = dataDeISO(iso);
    if (!data) continue;
    const t = meiaNoite(data).getTime();
    for (let i = 0; i < baldes.length; i++) {
      if (t >= baldes[i].inicio.getTime() && t <= baldes[i].fim.getTime()) {
        contagem[i]++;
        break;
      }
    }
  }
  return contagem;
}

/**
 * O intervalo que o gráfico vai desenhar quando o filtro do dashboard não fixa as duas pontas.
 *
 * Com "Todos" selecionado, `de`/`ate` vêm vazios de propósito (é assim que a API entende "todo
 * o histórico"), e não dá para inventar uma janela fixa de oito semanas: os dados da carteira
 * são de meses atrás e o gráfico nasceria vazio, parecendo quebrado. Então a ponta que falta
 * sai das próprias datas — a mais antiga que existe, ou hoje.
 */
export function intervaloDoGrafico(
  datas: (string | null | undefined)[],
  de?: string,
  ate?: string,
): { de: string; ate: string } | null {
  const validas = datas
    .map(d => dataDeISO(d))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (de && ate) return { de, ate };
  if (validas.length === 0) return null;

  const inicio = de ?? dataISO(validas[0]);
  const fim = ate ?? dataISO(new Date(Math.max(validas[validas.length - 1].getTime(), Date.now())));
  return inicio <= fim ? { de: inicio, ate: fim } : { de: fim, ate: inicio };
}
