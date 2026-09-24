/**
 * Formatação de datas para leitura humana, em português e no horário de Brasília.
 *
 * A API devolve duas coisas diferentes com a mesma cara de string:
 * - **data pura** (`2026-08-20`) — `dataPagamento`, `dataEncaminhado`, `dataAprovacao`, ...
 * - **instante** (`2026-09-09T03:12:07.916513Z`) — `solicitadoEm`, `ultimaConsultaEm`, ...
 *
 * ⚠️ **Data pura não pode passar por `new Date()`.** `new Date('2026-08-20')` é interpretado como
 * meia-noite **UTC**, que em `America/Sao_Paulo` (UTC-3) é 21h do dia 19 — a tela mostraria
 * 19/08. Por isso {@link formatarData} quebra a string em vez de construir um `Date`. Só os
 * instantes, que carregam fuso, passam pelo `Intl`.
 */

const PLACEHOLDER = '—';

const FUSO = 'America/Sao_Paulo';

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const SO_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
});

/** `2026-08-20` → `20/08/2026`. Nulo, vazio ou formato inesperado viram travessão. */
export function formatarData(iso?: string | null): string {
  if (!iso) return PLACEHOLDER;

  // Aceita o instante também: se vier com hora, usa só a parte da data — mas aí converte de
  // verdade, porque 03:12Z ainda é do dia anterior em Brasília.
  if (iso.includes('T')) {
    const instante = new Date(iso);
    return Number.isNaN(instante.getTime())
      ? PLACEHOLDER
      : DATA_HORA.format(instante).split(', ')[0];
  }

  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return PLACEHOLDER;
  return `${dia}/${mes}/${ano}`;
}

/** `2026-09-09T03:12:07.916513Z` → `09/09/2026 00:12` (Brasília). */
export function formatarDataHora(iso?: string | null): string {
  if (!iso) return PLACEHOLDER;
  if (!iso.includes('T')) return formatarData(iso);

  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return PLACEHOLDER;

  // O Intl separa data e hora por vírgula; a tela lê melhor sem ela.
  return DATA_HORA.format(instante).replace(',', '');
}

/** Só a hora, para linhas onde a data já aparece ao lado. */
export function formatarHora(iso?: string | null): string {
  if (!iso || !iso.includes('T')) return PLACEHOLDER;
  const instante = new Date(iso);
  return Number.isNaN(instante.getTime()) ? PLACEHOLDER : SO_HORA.format(instante);
}

/**
 * Dias inteiros decorridos desde a data/instante informado. Negativo se for no futuro.
 * Devolve `null` para entrada ausente — quem chama decide o que mostrar, porque "zero dias" e
 * "não se aplica" são coisas diferentes.
 */
export function diasDesde(iso?: string | null): number | null {
  if (!iso) return null;
  const referencia = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`);
  if (Number.isNaN(referencia.getTime())) return null;
  return Math.floor((Date.now() - referencia.getTime()) / 86_400_000);
}

/**
 * Data de hoje como `YYYY-MM-DD`, para mandar à API e para preencher `<input type="date">`.
 *
 * ⚠️ **Não use `new Date().toISOString().split('T')[0]`** — é a mesma armadilha do topo do
 * arquivo pelo avesso: depois das 21h em Brasília o `toISOString` já está no dia seguinte em
 * UTC, e o filtro "hoje" traria o dia errado. Aqui os componentes saem do relógio local.
 */
export function hojeISO(): string {
  return dataISO(new Date());
}

/** `-30` devolve a data de 30 dias atrás, no formato `YYYY-MM-DD`. */
export function somarDiasISO(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return dataISO(data);
}

export function dataISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * `2026-08-20` → um `Date` local ao **meio-dia**, e não à meia-noite UTC.
 *
 * É a mesma armadilha descrita no topo do arquivo, agora do lado de quem precisa calcular em
 * vez de formatar: os gráficos do dashboard agrupam por semana, e um dia deslocado joga a data
 * para o balde anterior. Meio-dia é o único horário que sobrevive a qualquer fuso do Brasil.
 *
 * Aceita instante também (`...T03:12Z`), que já carrega fuso e passa direto.
 */
export function dataDeISO(iso?: string | null): Date | null {
  if (!iso) return null;
  const data = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

const DIA_MES = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const SO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

/** `20/08` — rótulo curto de eixo. */
export function formatarDiaMes(data: Date): string {
  return DIA_MES.format(data);
}

/**
 * `ago/26` — rótulo curto de eixo quando o recorte passa de alguns meses.
 *
 * O mês e o ano são formatados separadamente porque o `Intl` em pt-BR junta os dois como
 * "ago. de 26", que num eixo com doze colunas ocupa o dobro do espaço disponível.
 */
export function formatarMesAno(data: Date): string {
  const mes = SO_MES.format(data).replace('.', '');
  return `${mes}/${String(data.getFullYear()).slice(-2)}`;
}

/** `0` → "hoje", `1` → "há 1 dia", `12` → "há 12 dias". */
export function textoDiasParado(dias?: number | null): string {
  if (dias === null || dias === undefined) return PLACEHOLDER;
  if (dias <= 0) return 'hoje';
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}
