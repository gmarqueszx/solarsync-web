import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CardKPI } from '../ui/CardKPI';
import { COR_SERIE, GraficoBarrasHorizontais, GraficoLinhas, Medidor } from '../ui/Graficos';
import {
  ROTULO_STATUS_PROJETO,
  ROTULO_TIPO_PROJETO,
  StatusProjeto,
  TipoProjeto,
} from '../../types';
import { formatarData, hojeISO, somarDiasISO } from '../../utils/data';
import { contarPorBalde, intervaloDoGrafico, montarBaldes } from '../../utils/series';
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
   *
   * Os `useMemo` ficam **antes** do retorno de "indicadores indisponíveis": hook depois de um
   * `return` condicional quebra a ordem entre renderizações.
   */
  const analistaFiltrado = kpis?.analistaId;

  const projetosNoRecorte = useMemo(
    () =>
      analistaFiltrado
        ? projetos.filter(p => p.analistaResponsavel?.id === analistaFiltrado)
        : projetos,
    [projetos, analistaFiltrado],
  );

  const pendenciasNoRecorte = useMemo(
    () =>
      analistaFiltrado
        ? pendencias.filter(p => p.responsavel?.id === analistaFiltrado)
        : pendencias,
    [pendencias, analistaFiltrado],
  );

  /**
   * O ritmo, agora saindo dos projetos de verdade.
   *
   * ⚠️ O gráfico era **desenhado à mão**: um `path` SVG com coordenadas fixas no código, que
   * nunca mudava de forma por mais que os números mudassem. Os quatro pontos até calculavam um
   * valor a partir dos KPIs, mas o valor não era usado em lugar nenhum — só a bolinha era
   * desenhada, sempre na mesma altura.
   *
   * As duas séries são as duas pontas do trâmite com a Coelba: o que **entrou** na fila da
   * distribuidora (`dataEncaminhado`) e o que **saiu** aprovado (`dataAprovacao`). Postas
   * juntas elas respondem a pergunta que o subtítulo do card promete e que nenhum número
   * isolado responde: o gargalo é a gente enviando pouco, ou a Coelba devolvendo devagar?
   */
  const ritmo = useMemo(() => {
    const datas = [
      ...projetosNoRecorte.map(p => p.dataAprovacao),
      ...projetosNoRecorte.map(p => p.dataEncaminhado),
    ];
    const intervalo = intervaloDoGrafico(datas, periodoDashboard.de, periodoDashboard.ate);
    if (!intervalo) return null;

    const { baldes, granularidade } = montarBaldes(intervalo.de, intervalo.ate);
    return {
      granularidade,
      rotulos: baldes.map(b => b.rotulo),
      aprovados: contarPorBalde(
        baldes,
        projetosNoRecorte.map(p => p.dataAprovacao),
      ),
      encaminhados: contarPorBalde(
        baldes,
        projetosNoRecorte.map(p => p.dataEncaminhado),
      ),
    };
  }, [projetosNoRecorte, periodoDashboard.de, periodoDashboard.ate]);

  const contagemTipos = useMemo(
    () =>
      (Object.keys(ROTULO_TIPO_PROJETO) as TipoProjeto[]).map(tipo => ({
        tipo,
        label: ROTULO_TIPO_PROJETO[tipo],
        quantidade: projetosNoRecorte.filter(p => p.tipoProjeto === tipo).length,
      })),
    [projetosNoRecorte],
  );

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

  const taxaAprovacao = Math.round(
    (kpis.projetosAprovados / (projetosNoRecorte.length || 1)) * 100,
  );

  const pendenciasAtivas = pendenciasNoRecorte.filter(p => p.status === 'ABERTA').length;

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
                  aria-pressed={ativo}
                  /*
                    A pílula ativa era `bg-white/10` — invisível no tema claro, onde a cápsula
                    que a contém já é branca. No claro a marcação precisa de superfície sutil
                    mais contorno; no escuro o véu branco continua certo.
                  */
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-180 ease-suave ${
                    ativo
                      ? 'bg-superficie-sutil dark:bg-white/10 text-texto font-semibold shadow-card dark:shadow-none ring-1 ring-borda dark:ring-0'
                      : 'text-texto-suave hover:text-texto hover:bg-superficie-sutil dark:hover:bg-white/[0.05]'
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

      {/*
        Fileira de KPIs. Os ícones vinham todos no tom 400, que é calibrado para fundo escuro:
        no tema claro eles ficavam lavados contra o branco do card.
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 escalonar">
        <CardKPI
          rotulo="Projetos Aprovados"
          valor={kpis.projetosAprovados}
          badge={`+${taxaAprovacao}%`}
          badgeTom="positivo"
          legenda="Parecer de acesso emitido"
          icone={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        />
        <CardKPI
          rotulo="Em Análise Coelba"
          valor={kpis.projetosEncaminhados + kpis.projetosReencaminhados}
          badge="15d prazo"
          badgeTom="info"
          legenda="Aguardando distribuidora"
          icone={<Send className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        />
        <CardKPI
          rotulo="Pendências na Fila"
          valor={pendenciasAtivas}
          badge={`${kpis.pendenciasResolvidas} resolvidas`}
          badgeTom="atencao"
          legenda="Troca titularidade e rede"
          icone={<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        />
        <CardKPI
          rotulo="Travados por Débito"
          valor={kpis.clientesComDebitoParado}
          badge={`${kpis.clientesTravadosNaHomologacao} homologação`}
          badgeTom="critico"
          tom="critico"
          legenda="Clientes com fatura atrasada"
          icone={<Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
        />
        <CardKPI
          rotulo="Ciclo Médio Total"
          valor={kpis.tempoMedioCicloCompletoDias ?? '—'}
          sufixo={kpis.tempoMedioCicloCompletoDias ? 'd' : undefined}
          badge="Meta ≤ 35d"
          badgeTom="positivo"
          legenda="Entrada → Parecer aprovado"
          icone={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        />
      </div>

      {/* Seção Gráfica: ritmo do trâmite e distribuição por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: o que entrou e o que saiu do trâmite com a Coelba, ao longo do tempo */}
        <Card
          className="lg:col-span-2"
          title="Ritmo de Aprovações & Trâmite Coelba"
          subtitle={
            ritmo?.granularidade === 'MES'
              ? 'Pareceres emitidos e projetos protocolados, mês a mês'
              : 'Pareceres emitidos e projetos protocolados, semana a semana'
          }
          headerBorder={true}
          action={
            <span className="text-2xs text-texto-suave whitespace-nowrap">
              <strong className="text-texto font-medium tabular-nums">
                {kpis.projetosAprovados}
              </strong>{' '}
              aprovados de {projetosNoRecorte.length}
            </span>
          }
        >
          {ritmo ? (
            <GraficoLinhas
              rotulos={ritmo.rotulos}
              unidade="projetos"
              series={[
                {
                  nome: 'Aprovados',
                  cor: COR_SERIE.aprovado,
                  valores: ritmo.aprovados,
                  area: true,
                },
                {
                  nome: 'Encaminhados',
                  cor: COR_SERIE.encaminhado,
                  valores: ritmo.encaminhados,
                },
              ]}
            />
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-borda text-center px-6">
              <p className="text-xs font-medium text-texto">Nada protocolado ainda</p>
              <p className="text-2xs text-texto-apagado">
                A linha aparece assim que o primeiro projeto for encaminhado à Coelba.
              </p>
            </div>
          )}
        </Card>

        {/*
          Gráfico 2: distribuição por tipo. Barras deitadas porque os rótulos são longos
          ("Ampliação de Projeto Existente") e em coluna eram cortados; uma cor só porque
          categoria nominal não tem ordem — o tamanho da barra já diz quem é maior.
        */}
        <Card
          className="lg:col-span-1"
          title="Projetos por Tipo"
          subtitle="Volume consolidado no funil"
          headerBorder={true}
        >
          <div className="space-y-5">
            <GraficoBarrasHorizontais
              itens={contagemTipos.map(item => ({
                rotulo: item.label,
                valor: item.quantidade,
                dica: `${item.label}: ${item.quantidade} projeto(s)`,
              }))}
            />

            <div className="p-2.5 rounded-lg bg-superficie-sutil border border-borda dark:border-transparent text-2xs text-texto-suave flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-solar-primary dark:text-emerald-400 shrink-0" />
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
              <Clock className="w-4 h-4 text-solar-primary dark:text-emerald-400" />
              Tempos Médios de Ciclo de Vida (SLA por Etapa)
            </h3>
            <p className="text-2xs text-texto-suave">
              Calculados a partir do histórico de transição de status (auditoria de eventos)
            </p>
          </div>
          <span className="text-2xs font-medium text-solar-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 escalonar">
          {metricasTempo.map((item, index) => {
            const Icone = item.icone;
            return (
              <Card
                key={index}
                className="p-4 elevar-no-hover hover:border-borda-forte dark:hover:bg-superficie-elevada"
                noPadding={true}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-superficie-sutil border border-borda dark:border-transparent flex items-center justify-center text-texto-suave">
                    <Icone className="w-4 h-4 text-solar-primary dark:text-emerald-400" />
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
          {/* `rounded-b-card` porque o `-my-6` faz a tabela encostar na borda do card: sem
              isto a última linha desenha um canto quadrado sobre o canto arredondado. */}
          <div className="overflow-x-auto -mx-6 -my-6 rounded-b-card">
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
                    // `hover:bg-white/[0.02]` era invisível no claro: branco sobre branco.
                    <tr
                      key={p.id}
                      className="hover:bg-superficie-sutil dark:hover:bg-white/[0.03] transition-colors duration-120"
                    >
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
            {cargaAnalistas.length === 0 && (
              <p className="text-2xs text-texto-apagado py-6 text-center">
                Nenhum projeto atribuído no recorte atual.
              </p>
            )}
            {cargaAnalistas.map((item, idx) => {
              const percAprov = Math.round((item.aprovados / (item.total || 1)) * 100);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-superficie-sutil border border-borda dark:border-transparent space-y-2 transition-colors duration-180 hover:border-borda-forte"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 shrink-0 rounded-full bg-solar-100 dark:bg-emerald-950/80 text-solar-800 dark:text-emerald-300 flex items-center justify-center text-[10px] font-semibold">
                        {item.analista.charAt(0)}
                      </div>
                      <span className="font-medium text-texto truncate">{item.analista}</span>
                    </div>
                    <div className="text-texto-apagado text-2xs shrink-0">
                      <strong className="text-texto font-semibold tabular-nums">
                        {item.total}
                      </strong>{' '}
                      projetos
                    </div>
                  </div>

                  {/*
                    Uma cor sobre trilho neutro, e não verde contra âmbar como era antes: esse
                    par tem separação de apenas 3,1 em deuteranopia, ou seja, a barra inteira
                    vira um bloco só para quem não distingue verde de vermelho — e a barra é
                    justamente o que se olha antes de ler os números.
                  */}
                  <Medidor
                    percentual={percAprov}
                    rotulo={`${item.analista}: ${percAprov}% aprovados`}
                  />

                  <div className="flex items-center justify-between text-2xs text-texto-suave">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: COR_SERIE.aprovado }}
                      />
                      {item.aprovados} aprovados ({percAprov}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full shrink-0 bg-texto-apagado"
                      />
                      {item.emAndamento} em análise
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
