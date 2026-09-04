import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ROTULO_TIPO_PROJETO, TipoProjeto } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileCheck2,
  TrendingUp,
  Wrench,
  Zap,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
  const { kpis, projetos, pendencias } = useApp();

  // Sem KPIs não há painel: ou ainda está carregando, ou o papel não tem acesso à métrica.
  if (!kpis) {
    return (
      <Card className="p-10">
        <div className="text-center space-y-1">
          <div className="text-sm font-medium text-slate-700">
            Indicadores indisponíveis no momento
          </div>
          <p className="text-xs text-[#424342]">
            O painel executivo é restrito a Gestor e Administrador.
          </p>
        </div>
      </Card>
    );
  }

  // Metrics for cycle times
  const metricasTempo = [
    {
      titulo: 'Tempo s/ Interação',
      subtitulo: 'Pagamento → 1ª Ação',
      dias: kpis.tempoMedioSemMexerDias,
      meta: 'Meta ≤ 2 dias',
      status: 'bom',
      icone: Clock,
      descricao: 'Tempo decorrido entre o sinal financeiro e a primeira checagem da equipe.',
    },
    {
      titulo: 'Resolução de Pendência',
      subtitulo: 'Solicitado → Concluído',
      dias: kpis.tempoMedioResolucaoPendenciaDias,
      meta: 'Meta ≤ 5 dias',
      status: 'atencao',
      icone: AlertTriangle,
      descricao: 'Média de dias para regularizar titularidade, padrão ou rede na Coelba.',
    },
    {
      titulo: 'Recebimento → Envio',
      subtitulo: 'Montagem e ART',
      dias: kpis.tempoMedioRecebimentoEnvioDias,
      meta: 'Meta ≤ 3 dias',
      status: 'bom',
      icone: Send,
      descricao: 'Elaboração do projeto executivo, emissão de ART e protocolo inicial.',
    },
    {
      titulo: 'Prazo Coelba Aprovação',
      subtitulo: 'Envio → Parecer Aprovado',
      dias: kpis.tempoMedioParaAprovacaoDias,
      meta: 'Prazo Legal: 15 dias',
      status: 'bom',
      icone: FileCheck2,
      descricao: 'Tempo que a concessionária leva para analisar e emitir parecer de acesso.',
    },
    {
      titulo: 'Parado por Débito',
      subtitulo: 'Detecção → Quitação',
      dias: kpis.tempoMedioParadoDebitoDias,
      meta: 'Gargalo comercial',
      status: 'alerta',
      icone: Flame,
      descricao: 'Dias que o projeto fica travado aguardando o cliente pagar faturas atrasadas.',
    },
    {
      titulo: 'Instalação → Vistoria',
      subtitulo: 'Usina pronta → Solicitação',
      dias: kpis.tempoMedioInstalacaoVistoriaDias,
      meta: 'Meta ≤ 7 dias',
      status: 'atencao',
      icone: Wrench,
      descricao:
        'Dias entre a usina ficar instalada e alguém pedir a vistoria à Coelba. '
        + 'É o intervalo em que o cliente já pagou, já tem a usina no telhado e ainda não gera.',
    },
    {
      titulo: 'Ciclo Completo de Homologação',
      subtitulo: 'Entrada → Troca do Medidor',
      dias: kpis.tempoMedioCicloCompletoDias,
      meta: 'Meta ≤ 35 dias',
      status: 'bom',
      icone: TrendingUp,
      descricao: 'Tempo total desde a entrada do cliente até a vistoria técnica aprovada.',
    },
  ];

  // Distribution by Analyst — os analistas vêm dos próprios projetos, não de uma lista fixa.
  const analistas = Array.from(
    new Set(projetos.map(p => p.analistaResponsavel?.nome ?? 'Sem analista atribuído')),
  );
  const cargaAnalistas = analistas.map(analista => {
    const doAnalista = projetos.filter(
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

  // Distribution by Project Type
  const contagemTipos = (Object.keys(ROTULO_TIPO_PROJETO) as TipoProjeto[]).map(tipo => ({
    tipo,
    label: ROTULO_TIPO_PROJETO[tipo],
    quantidade: projetos.filter(p => p.tipoProjeto === tipo).length,
  }));

  const maxQtdTipo = Math.max(...contagemTipos.map(t => t.quantidade), 1);

  return (
    <div className="space-y-6">
      {/* Overview Alert Banner for Gestor */}
      <div className="bg-gradient-to-r from-[#244F26] to-[#1b431e] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-emerald-900/40">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
            <Zap className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-white">Painel Executivo de Homologação</h2>
              <Badge variant="accent">GESTOR EXCLUSIVE</Badge>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Substitui a visão fragmentada das 18 abas do Excel por métricas em tempo real do ciclo de vida Coelba/Neoenergia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-right bg-black/20 px-4 py-2 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/60 block">Volume Ativo</span>
            <span className="text-lg font-semibold text-white">
              {projetos.length} <span className="text-xs font-normal text-white/70">projetos</span>
            </span>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/60 block">Taxa de Aprovação</span>
            <span className="text-lg font-semibold text-[#1EFC1E]">
              {Math.round((kpis.projetosAprovados / (projetos.length || 1)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Quantitativos Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Projetos Aprovados */}
        <Card className="p-4" headerBorder={false}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#424342]">Projetos Aprovados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#149911] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-800 tracking-tight">
              {kpis.projetosAprovados}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Parecer emitido
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total liberado para vistoria técnica
          </p>
        </Card>

        {/* Card 2: Encaminhados & Em Análise */}
        <Card className="p-4" headerBorder={false}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#424342]">Em Análise Coelba</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-800 tracking-tight">
              {kpis.projetosEncaminhados + kpis.projetosReencaminhados}
            </span>
            <span className="text-xs text-sky-600 font-medium">
              {kpis.projetosReencaminhados > 0 && `(${kpis.projetosReencaminhados} reencaminhados)`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Aguardando prazo regulatório da distribuidora
          </p>
        </Card>

        {/* Card 3: Pendências Coelba */}
        <Card className="p-4" headerBorder={false}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#424342]">Pendências na Fila</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-800 tracking-tight">
              {pendencias.filter(p => p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO').length}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              de {kpis.pendenciasAbertasNoPeriodo} abertas no período
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpis.pendenciasResolvidas} resolvidas este ciclo
          </p>
        </Card>

        {/* Card 4: Débitos Parados */}
        <Card className="p-4" headerBorder={false}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#424342]">Travados por Débito</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-rose-600 tracking-tight">
              {kpis.clientesComDebitoParado}
            </span>
            <span className="text-xs text-rose-700 font-medium">
              clientes
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Projetos impedidos de enviar ART
          </p>
        </Card>
      </div>

      {/* Section: Tempos Médios de Ciclo (SLAs e Gargalos) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-slate-800 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#149911]" />
              Tempos Médios de Ciclo de Vida (SLA por Etapa)
            </h3>
            <p className="text-xs text-[#424342]">
              Calculados a partir do histórico de transição de status (auditoria de eventos)
            </p>
          </div>
          <span className="text-xs text-[#149911] font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50">
            Atualizado Hoje
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricasTempo.map((item, index) => {
            const Icone = item.icone;
            return (
              <Card key={index} className="p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
                    <Icone className="w-4 h-4 text-[#149911]" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.meta}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-700">{item.titulo}</div>
                  <div className="text-[11px] text-[#424342]">{item.subtitulo}</div>
                </div>

                {/* Tempo nulo = não houve caso no período. Mostrar 0 leria "instantâneo". */}
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-800 tracking-tight">
                    {item.dias ?? '—'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {item.dias === null ? 'sem casos no período' : 'dias úteis (média)'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed border-t border-slate-100 pt-2">
                  {item.descricao}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Lower Row: Analyst Workload & Project Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Analyst */}
        <Card
          title="Produtividade e Carga por Analista"
          subtitle="Distribuição da homologação unificada (ex-abas Ivan, Larissa e Camila)"
        >
          <div className="space-y-4">
            {cargaAnalistas.map((item, idx) => {
              const percAprov = Math.round((item.aprovados / (item.total || 1)) * 100);
              return (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#244F26] text-white flex items-center justify-center text-[10px] font-medium">
                        {item.analista.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{item.analista}</span>
                    </div>
                    <div className="text-[#424342]">
                      <span className="font-semibold text-slate-800">{item.total}</span> projetos vinculados
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#149911] h-full transition-all duration-500"
                      style={{ width: `${percAprov}%` }}
                      title={`Aprovados: ${percAprov}%`}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${100 - percAprov}%` }}
                      title={`Em andamento: ${100 - percAprov}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#424342]">
                    <span className="flex items-center gap-1 text-[#149911]">
                      <span className="w-2 h-2 rounded-full bg-[#149911]" />
                      {item.aprovados} Aprovados ({percAprov}%)
                    </span>
                    <span className="flex items-center gap-1 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {item.emAndamento} Em andamento / análise
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Project Subtypes Breakdown */}
        <Card
          title="Tipos de Projeto no Funil"
          subtitle="Subtipos que antes ocupavam 5 abas isoladas na planilha"
        >
          <div className="space-y-3">
            {contagemTipos.map((item, idx) => {
              const perc = Math.round((item.quantidade / maxQtdTipo) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-normal">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.quantidade} un.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#244F26] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(perc, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#149911] shrink-0" />
            <span>
              <strong>Ganho do SolarSync:</strong> Agora todos os subtipos compartilham o mesmo ciclo de vida unificado, evitando re-trabalho e mantendo histórico consistente.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
