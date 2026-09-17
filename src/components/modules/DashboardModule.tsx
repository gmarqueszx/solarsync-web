import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CardKPI } from '../ui/CardKPI';
import {
  ROTULO_STATUS_PROJETO,
  ROTULO_TIPO_PROJETO,
  StatusProjeto,
  TipoProjeto,
} from '../../types';
import { formatarData, hojeISO, somarDiasISO } from '../../utils/data';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileCheck2,
  TrendingUp,
  Wrench,
  Flame,
  Calendar,
  Layers,
  UserRound,
} from 'lucide-react';

type PeriodoFiltro = 'HOJE' | '7D' | '30D' | '3M' | '12M' | 'TODOS' | 'PERSONALIZADO';

const ROTULO_PERIODO: Record<PeriodoFiltro, string> = {
  HOJE: 'Hoje',
  '7D': '7d',
  '30D': '30d',
  '3M': '3m',
  '12M': '12m',
  TODOS: 'Todos',
  PERSONALIZADO: 'Personalizado',
};

/**
 * Traduz o atalho em datas. `TODOS` devolve as duas pontas vazias, que é como a API entende
 * "todo o histórico" — e não uma data mínima arbitrária, que mentiria no rótulo.
 */
function intervaloDoAtalho(atalho: PeriodoFiltro): { de?: string; ate?: string } {
  if (atalho === 'TODOS' || atalho === 'PERSONALIZADO') return {};
  const dias: Record<Exclude<PeriodoFiltro, 'TODOS' | 'PERSONALIZADO'>, number> = {
    HOJE: 0,
    '7D': -6,
    '30D': -29,
    '3M': -89,
    '12M': -364,
  };
  // O intervalo inclui hoje, então "7d" é hoje mais os seis anteriores.
  return { de: somarDiasISO(dias[atalho]), ate: hojeISO() };
}

export const DashboardModule: React.FC = () => {
  const { kpis, projetos, pendencias, usuarios, periodoDashboard, setPeriodoDashboard } =
    useApp();

  /**
   * O atalho escolhido é estado local só para pintar a pílula ativa; a verdade do recorte é o
   * `periodoDashboard` do contexto, que é o que vai para a API. Antes estas pílulas não
   * filtravam nada — eram enfeite, e o painel mostrava sempre o histórico inteiro.
   */
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('TODOS');

  const aplicarAtalho = (atalho: PeriodoFiltro) => {
    setPeriodo(atalho);
    if (atalho === 'PERSONALIZADO') return; // as datas vêm dos dois inputs
    setPeriodoDashboard({ ...intervaloDoAtalho(atalho), analistaId: periodoDashboard.analistaId });
  };

  const mudarData = (ponta: 'de' | 'ate', valor: string) => {
    setPeriodo('PERSONALIZADO');
    setPeriodoDashboard({ ...periodoDashboard, [ponta]: valor || undefined });
  };

  const mudarAnalista = (valor: string) => {
    setPeriodoDashboard({
      ...periodoDashboard,
      analistaId: valor === '' ? undefined : Number(valor),
    });
  };

  if (!kpis) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-10 h-10 rounded-xl bg-superficie-sutil border border-borda flex items-center justify-center mx-auto text-texto-apagado">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-texto">Indicadores indisponíveis</h3>
          <p className="text-xs text-texto-suave">
            Não foi possível carregar as métricas. Recarregue a página; se persistir, verifique
            se a API está no ar.
          </p>
        </div>
      </Card>
    );
  }

  /**
   * ⚠️ Nem tudo nesta tela vem do `kpis`: alguns cards e gráficos são derivados das listas que o
   * contexto já carregou (carga por analista, projetos por tipo, projetos recentes). Eles
   * **precisam** aplicar o mesmo recorte de pessoa, senão o painel mostra metade dos números
   * filtrados e metade não — foi o que apareceu na conferência de 16/09/2026: com o filtro
   * ligado, tudo zerava e "Pendências na Fila" continuava em 5.
   *
   * O recorte de **período** continua não valendo para estas listas, e é uma limitação
   * conhecida: cada métrica tem a sua data de referência, e replicar essa lógica aqui
   * duplicaria no cliente o que o `DashboardRepository` já faz. O que vem do `kpis` respeita o
   * período; o que é derivado é sempre a situação de agora.
   */
  const analistaFiltrado = kpis.analistaId;
  const projetosNoRecorte = analistaFiltrado
    ? projetos.filter(p => p.analistaResponsavel?.id === analistaFiltrado)
    : projetos;
  const pendenciasNoRecorte = analistaFiltrado
    ? pendencias.filter(p => p.responsavel?.id === analistaFiltrado)
    : pendencias;

  const taxaAprovacao = Math.round(
    (kpis.projetosAprovados / (projetosNoRecorte.length || 1)) * 100,
  );

  const pendenciasAtivas = pendenciasNoRecorte.filter(
    p => p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO',
  ).length;

  // SLA de tempos médios
  const metricasTempo = [
    {
      titulo: 'Tempo s/ Interação',
      subtitulo: 'Pagamento → 1ª Ação',
      dias: kpis.tempoMedioSemMexerDias,
      meta: 'Meta ≤ 2d',
      icone: Clock,
      tom: (kpis.tempoMedioSemMexerDias ?? 0) <= 2 ? 'positivo' : 'atencao',
      descricao: 'Intervalo entre o sinal comercial e a primeira triagem na Coelba.',
    },
    {
      titulo: 'Resolução de Pendência',
      subtitulo: 'Solicitado → Concluído',
      dias: kpis.tempoMedioResolucaoPendenciaDias,
      meta: 'Meta ≤ 5d',
      icone: AlertTriangle,
      tom: (kpis.tempoMedioResolucaoPendenciaDias ?? 0) <= 5 ? 'positivo' : 'atencao',
      descricao: 'Prazo médio para sanar titularidade, padrão ou extensão na concessionária.',
    },
    {
      titulo: 'Recebimento → Envio',
      subtitulo: 'Elaboração e ART',
      dias: kpis.tempoMedioRecebimentoEnvioDias,
      meta: 'Meta ≤ 3d',
      icone: Send,
      tom: (kpis.tempoMedioRecebimentoEnvioDias ?? 0) <= 3 ? 'positivo' : 'atencao',
      descricao: 'Confecção técnica do projeto, emissão de ART e protocolo inicial.',
    },
    {
      titulo: 'Prazo Coelba Aprovação',
      subtitulo: 'Envio → Parecer emitido',
      dias: kpis.tempoMedioParaAprovacaoDias,
      meta: 'Prazo Legal: 15d',
      icone: FileCheck2,
      tom: (kpis.tempoMedioParaAprovacaoDias ?? 0) <= 15 ? 'positivo' : 'critico',
      descricao: 'Tempo regulatório que a distribuidora leva para emitir o parecer de acesso.',
    },
    {
      titulo: 'Parado por Débito',
      subtitulo: 'Detecção → Quitação',
      dias: kpis.tempoMedioParadoDebitoDias,
      meta: 'Gargalo comercial',
      icone: Flame,
      tom: 'critico',
      descricao: 'Dias travados aguardando quitação de faturas pendentes pelo cliente.',
    },
    {
      titulo: 'Instalação → Vistoria',
      subtitulo: 'Usina pronta → Solicitação',
      dias: kpis.tempoMedioInstalacaoVistoriaDias,
      meta: 'Meta ≤ 7d',
      icone: Wrench,
      tom: (kpis.tempoMedioInstalacaoVistoriaDias ?? 0) <= 7 ? 'positivo' : 'atencao',
      descricao: 'Intervalo em que a usina já está no telhado aguardando pedido de vistoria.',
    },
  ] as const;

  // Analistas
  const analistas = Array.from(
    new Set(projetosNoRecorte.map(p => p.analistaResponsavel?.nome ?? 'Sem analista atribuído')),
  );
  const cargaAnalistas = analistas.map(analista => {
    const doAnalista = projetosNoRecorte.filter(
      p => (p.analistaResponsavel?.nome ?? 'Sem analista atribuído') === analista,
    );
    const aprovados = doAnalista.filter(p => p.status === 'APROVADO').length;
    return {
      analista,
      total: doAnalista.length,
      aprovados,
      emAndamento: doAnalista.length - aprovados,
    };
  });

  // Tipos de Projeto
  const contagemTipos = (Object.keys(ROTULO_TIPO_PROJETO) as TipoProjeto[]).map(tipo => ({
    tipo,
    label: ROTULO_TIPO_PROJETO[tipo],
    quantidade: projetosNoRecorte.filter(p => p.tipoProjeto === tipo).length,
  }));
  const maxQtdTipo = Math.max(...contagemTipos.map(t => t.quantidade), 1);

  // Projetos mais recentes para a tabela executiva (estilo "Recent activity" do Metric)
  const projetosRecentes = [...projetosNoRecorte].slice(0, 6);

  const getStatusBadge = (status: StatusProjeto) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="success">{ROTULO_STATUS_PROJETO.APROVADO}</Badge>;
      case 'REPROVADO':
        return <Badge variant="danger">{ROTULO_STATUS_PROJETO.REPROVADO}</Badge>;
      case 'ENCAMINHADO':
        return <Badge variant="info">{ROTULO_STATUS_PROJETO.ENCAMINHADO}</Badge>;
      case 'REENCAMINHADO':
        return <Badge variant="info">{ROTULO_STATUS_PROJETO.REENCAMINHADO}</Badge>;
      case 'AGUARDANDO_ENVIO':
        return <Badge variant="warning">{ROTULO_STATUS_PROJETO.AGUARDANDO_ENVIO}</Badge>;
      case 'RECEBIDO':
      default:
        return <Badge variant="neutral">{ROTULO_STATUS_PROJETO.RECEBIDO}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Page Header & Controls (Estilo Metric) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xs text-texto-apagado font-medium uppercase tracking-wider mb-1">
            <span>Boards</span>
            <span>/</span>
            <span>ConectSol</span>
            <span>/</span>
            <span className="text-texto-suave">Visão Geral de Homologação</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-texto">
            Visão Geral de Homologação
          </h1>
          <p className="text-xs text-texto-suave mt-0.5">
            {kpis.analistaNome
              ? `Recorte de ${kpis.analistaNome} — cada número conta só o que passou pelas mãos dela(e).`
              : 'Acompanhe indicadores de ciclo de vida, aprovações e gargalos em tempo real.'}
          </p>
        </div>

        {/* Filtros em Pílula Segmentada (Metric Style Capsule Tabs) */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-superficie border border-borda dark:border-transparent">
            <span className="px-2 text-texto-apagado">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            {(
              ['HOJE', '7D', '30D', '3M', '12M', 'TODOS', 'PERSONALIZADO'] as PeriodoFiltro[]
            ).map(p => {
              const ativo = periodo === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => aplicarAtalho(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    ativo
                      ? 'bg-white/10 text-texto font-semibold shadow-none'
                      : 'text-texto-suave hover:text-texto hover:bg-white/[0.04]'
                  }`}
                >
                  {ROTULO_PERIODO[p]}
                </button>
              );
            })}
          </div>

          {/*
            Aparece só no modo personalizado para não competir com os atalhos, que resolvem a
            maioria das perguntas. Ponta vazia é "sem limite daquele lado" — dá para pedir
            "tudo até 31/08" sem inventar uma data inicial.
          */}
          {periodo === 'PERSONALIZADO' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-superficie border border-borda dark:border-transparent">
              <label className="text-2xs text-texto-apagado" htmlFor="dashboard-de">
                De
              </label>
              <input
                id="dashboard-de"
                type="date"
                value={periodoDashboard.de ?? ''}
                max={periodoDashboard.ate ?? undefined}
                onChange={e => mudarData('de', e.target.value)}
                className="bg-transparent text-xs text-texto focus:outline-none"
              />
              <label className="text-2xs text-texto-apagado pl-1" htmlFor="dashboard-ate">
                até
              </label>
              <input
                id="dashboard-ate"
                type="date"
                value={periodoDashboard.ate ?? ''}
                min={periodoDashboard.de ?? undefined}
                onChange={e => mudarData('ate', e.target.value)}
                className="bg-transparent text-xs text-texto focus:outline-none"
              />
            </div>
          )}

          {/*
            Recorte por pessoa. A API aplica sobre o responsável de cada etapa — que é uma
            coluna diferente em cada uma —, e linha sem responsável fica de fora do recorte.
          */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-superficie border border-borda dark:border-transparent">
            <UserRound className="w-3.5 h-3.5 text-texto-apagado" />
            <select
              aria-label="Filtrar por analista"
              value={periodoDashboard.analistaId ?? ''}
              onChange={e => mudarAnalista(e.target.value)}
              className="bg-transparent text-xs text-texto focus:outline-none cursor-pointer"
            >
              <option value="">Equipe inteira</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row de 5 Cards de KPI (Estilo Metric) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <CardKPI
          rotulo="Projetos Aprovados"
          valor={kpis.projetosAprovados}
          badge={`+${taxaAprovacao}%`}
          badgeTom="positivo"
          legenda="Parecer de acesso emitido"
          icone={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        />
        <CardKPI
          rotulo="Em Análise Coelba"
          valor={kpis.projetosEncaminhados + kpis.projetosReencaminhados}
          badge="15d prazo"
          badgeTom="info"
          legenda="Aguardando distribuidora"
          icone={<Send className="w-4 h-4 text-sky-400" />}
        />
        <CardKPI
          rotulo="Pendências na Fila"
          valor={pendenciasAtivas}
          badge={`${kpis.pendenciasResolvidas} resolvidas`}
          badgeTom="atencao"
          legenda="Troca titularidade e rede"
          icone={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        />
        <CardKPI
          rotulo="Travados por Débito"
          valor={kpis.clientesComDebitoParado}
          badge={`${kpis.clientesTravadosNaHomologacao} homologação`}
          badgeTom="critico"
          tom="critico"
          legenda="Clientes com fatura atrasada"
          icone={<Flame className="w-4 h-4 text-rose-400" />}
        />
        <CardKPI
          rotulo="Ciclo Médio Total"
          valor={kpis.tempoMedioCicloCompletoDias ?? '—'}
          sufixo={kpis.tempoMedioCicloCompletoDias ? 'd' : undefined}
          badge="Meta ≤ 35d"
          badgeTom="positivo"
          legenda="Entrada → Parecer aprovado"
          icone={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />
      </div>

      {/* Seção Gráfica: Area Chart & Bar Chart (Metric Visual Homage) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Ritmo de Pareceres e Homologações (Area Line Chart) */}
        <Card
          className="lg:col-span-2"
          title="Ritmo de Aprovações & Trâmite Coelba"
          subtitle="Cadência semanal de pareceres emitidos e projetos protocolados no período"
          headerBorder={true}
        >
          <div className="space-y-4">
            {/* Legend & Meta */}
            <div className="flex items-center justify-between text-2xs text-texto-suave pb-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Pareceres Aprovados
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-texto-apagado" />
                  Meta Contratual
                </span>
              </div>
              <span className="text-texto font-medium">
                {kpis.projetosAprovados} aprovados / {projetosNoRecorte.length} total
              </span>
            </div>

            {/* Minimalist SVG Chart (Linha iluminada com degradê sutil no escuro) */}
            <div className="relative h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Linhas de grade horizontais minimalistas */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

                {/* Área preenchida */}
                <path
                  d="M 0,140 Q 60,110 120,95 T 240,115 T 360,50 T 500,25 L 500,160 L 0,160 Z"
                  fill="url(#metricGradient)"
                />

                {/* Linha nítida principal (branca no escuro com brilho esmeralda) */}
                <path
                  d="M 0,140 Q 60,110 120,95 T 240,115 T 360,50 T 500,25"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Pontos de dados */}
                {[
                  { cx: 120, cy: 95, val: Math.round(kpis.projetosAprovados * 0.25) },
                  { cx: 240, cy: 115, val: Math.round(kpis.projetosAprovados * 0.45) },
                  { cx: 360, cy: 50, val: Math.round(kpis.projetosAprovados * 0.75) },
                  { cx: 500, cy: 25, val: kpis.projetosAprovados },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.cx} cy={pt.cy} r="4" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
                  </g>
                ))}
              </svg>
            </div>

            {/* X-Axis labels */}
            <div className="flex items-center justify-between text-2xs text-texto-apagado pt-1 border-t border-borda dark:border-white/[0.04]">
              <span>Semana 1</span>
              <span>Semana 2</span>
              <span>Semana 3</span>
              <span>Semana 4</span>
              <span className="text-texto font-medium">Ciclo Atual</span>
            </div>
          </div>
        </Card>

        {/* Gráfico 2: Usuários / Tipos de Projeto (Bar Chart Vertical Minimalista) */}
        <Card
          className="lg:col-span-1"
          title="Projetos por Tipo"
          subtitle="Volume consolidado no funil"
          headerBorder={true}
        >
          <div className="space-y-4">
            <div className="h-44 flex items-end justify-around gap-4 pt-4 pb-2 px-2">
              {contagemTipos.map((item, idx) => {
                const perc = Math.round((item.quantidade / maxQtdTipo) * 100);
                const alturaMin = Math.max(perc, 12);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-semibold text-texto tabular-nums">
                      {item.quantidade}
                    </span>
                    <div className="w-full max-w-[42px] bg-superficie-sutil rounded-t-md overflow-hidden flex items-end h-full">
                      <div
                        className={`w-full rounded-t-md transition-all duration-700 ${
                          idx === 0
                            ? 'bg-white dark:bg-zinc-100'
                            : idx === 1
                            ? 'bg-emerald-500'
                            : 'bg-zinc-400 dark:bg-zinc-600'
                        }`}
                        style={{ height: `${alturaMin}%` }}
                        title={`${item.label}: ${item.quantidade}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-borda dark:border-white/[0.04] text-center">
              {contagemTipos.map((item, idx) => (
                <div key={idx} className="truncate">
                  <div className="text-[11px] font-medium text-texto truncate">{item.label}</div>
                  <div className="text-[10px] text-texto-apagado">{item.quantidade} un.</div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-lg bg-superficie-sutil border border-borda dark:border-transparent text-2xs text-texto-suave flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Os três subtipos compartilham o mesmo ciclo de vida.</span>
            </div>
          </div>
        </Card>
      </div>

      {/* SLAs e Tempos Médios por Etapa */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-texto tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Tempos Médios de Ciclo de Vida (SLA por Etapa)
            </h3>
            <p className="text-2xs text-texto-suave">
              Calculados a partir do histórico de transição de status (auditoria de eventos)
            </p>
          </div>
          <span className="text-2xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {metricasTempo.map((item, index) => {
            const Icone = item.icone;
            return (
              <Card key={index} className="p-4" noPadding={true}>
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-superficie-sutil border border-borda dark:border-transparent flex items-center justify-center text-texto-suave">
                    <Icone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-medium text-texto-suave bg-superficie-sutil border border-borda dark:border-transparent px-2 py-0.5 rounded-md">
                    {item.meta}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-texto">{item.titulo}</div>
                  <div className="text-2xs text-texto-suave">{item.subtitulo}</div>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-texto tracking-tight">
                    {item.dias ?? '—'}
                  </span>
                  <span className="text-2xs text-texto-apagado">
                    {item.dias === null ? 'sem casos no período' : 'dias úteis (média)'}
                  </span>
                </div>

                <p className="text-2xs text-texto-apagado mt-2.5 line-clamp-2 leading-relaxed border-t border-borda dark:border-white/[0.04] pt-2">
                  {item.descricao}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seção Inferior: Atividades Recentes & Carga por Analista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Atividades Recentes (Estilo Recent Activity do Metric) */}
        <Card
          className="lg:col-span-2"
          title="Fila de Homologação em Acompanhamento"
          subtitle="Últimos projetos em movimentação na concessionária"
          headerBorder={true}
        >
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borda dark:border-white/[0.04] bg-superficie-sutil text-texto-apagado">
                  <th className="py-2.5 px-6 font-medium text-2xs uppercase tracking-wider">Cliente & UC</th>
                  <th className="py-2.5 px-4 font-medium text-2xs uppercase tracking-wider">Tipo</th>
                  <th className="py-2.5 px-4 font-medium text-2xs uppercase tracking-wider">Analista</th>
                  <th className="py-2.5 px-4 font-medium text-2xs uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-6 font-medium text-2xs uppercase tracking-wider text-right">Entrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda dark:divide-white/[0.04] text-texto">
                {projetosRecentes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-texto-apagado">
                      Nenhum projeto em andamento no momento.
                    </td>
                  </tr>
                ) : (
                  projetosRecentes.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-medium text-texto">{p.cliente.nome}</div>
                        <div className="text-2xs text-texto-apagado">
                          {p.cliente.ucCoelba ? `UC ${p.cliente.ucCoelba}` : 'UC não informada'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-texto-suave">
                        {ROTULO_TIPO_PROJETO[p.tipoProjeto]}
                      </td>
                      <td className="py-3 px-4 text-texto-suave">
                        {p.analistaResponsavel?.nome ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="py-3 px-6 text-right text-texto-apagado tabular-nums">
                        {p.dataRecebimento ? formatarData(p.dataRecebimento) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Produtividade e Carga por Analista */}
        <Card
          className="lg:col-span-1"
          title="Carga por Analista"
          subtitle="Projetos em andamento por responsável"
          headerBorder={true}
        >
          <div className="space-y-3.5">
            {cargaAnalistas.map((item, idx) => {
              const percAprov = Math.round((item.aprovados / (item.total || 1)) * 100);
              return (
                <div key={idx} className="p-3 rounded-xl bg-superficie-sutil border border-borda dark:border-transparent space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-950/80 text-emerald-300 flex items-center justify-center text-[10px] font-medium">
                        {item.analista.charAt(0)}
                      </div>
                      <span className="font-medium text-texto">{item.analista}</span>
                    </div>
                    <div className="text-texto-apagado text-2xs">
                      <strong className="text-texto font-semibold">{item.total}</strong> projetos
                    </div>
                  </div>

                  {/* Barra de Progresso Minimalista */}
                  <div className="w-full bg-superficie h-2 rounded-full overflow-hidden flex border border-borda dark:border-transparent">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${percAprov}%` }}
                      title={`Aprovados: ${percAprov}%`}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${100 - percAprov}%` }}
                      title={`Em andamento: ${100 - percAprov}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-2xs text-texto-suave">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {item.aprovados} Aprovados ({percAprov}%)
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {item.emAndamento} Em análise
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
