import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cliente,
  ProjetoLista,
  ROTULO_STATUS_VISTORIA,
  ROTULO_TIPO_PROJETO,
  StatusVistoria,
  Vistoria,
} from '../../types';
import { diasDesde, formatarData, textoDiasParado } from '../../utils/data';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ClienteModal } from '../common/ClienteModal';
import { Botao } from '../ui/Button';
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MapPin,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Send,
} from 'lucide-react';
import { useOrdenacao } from '../../hooks/useOrdenacao';
import { Ordenavel } from '../ui/Tabela';

const hojeISO = () => new Date().toISOString().split('T')[0];

/** Ordem do fluxo: solicitada (esperando) primeiro, depois reprovada, depois aprovada. */
const PESO_STATUS: Record<StatusVistoria, number> = {
  SOLICITADA: 0,
  REPROVADA: 1,
  APROVADA: 2,
};

const VALORES_ORDENAVEIS = {
  cliente: (v: Vistoria) => v.cliente.nome,
  dataSolicitacao: (v: Vistoria) => v.dataSolicitacao,
  status: (v: Vistoria) => PESO_STATUS[v.status],
  dataResultado: (v: Vistoria) => v.dataResultado,
};

type ColunaVistoria = keyof typeof VALORES_ORDENAVEIS;

export const VistoriaModule: React.FC = () => {
  const {
    vistorias,
    projetos,
    clientes,
    solicitarVistoria,
    aprovarVistoria,
    reprovarVistoria,
    resolicitarVistoria,
    registrarInstalacao,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Abre pela solicitação mais antiga: é a que está esperando retorno há mais tempo.
  const { ordenacao, ordenar, cabecalho } = useOrdenacao<Vistoria, ColunaVistoria>(
    VALORES_ORDENAVEIS,
    { campo: 'dataSolicitacao', direcao: 'asc' },
  );

  // Modals
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState<Vistoria | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);

  // Edição de cliente diretamente por Vistorias
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [isModalClienteAberto, setIsModalClienteAberto] = useState(false);

  const abrirEdicaoClientePorId = (clienteId: number) => {
    const c = clientes.find((item) => item.id === clienteId);
    if (c) {
      setClienteParaEditar(c);
      setIsModalClienteAberto(true);
    }
  };

  /** A vistoria guarda só o `projetoId`; o subtipo vem do projeto correspondente. */
  const projetoPorId = useMemo(() => new Map(projetos.map(p => [p.id, p])), [projetos]);
  const subtipoDaVistoria = (v: Vistoria) => {
    const projeto = projetoPorId.get(v.projetoId);
    return projeto ? ROTULO_TIPO_PROJETO[projeto.tipoProjeto] : '—';
  };

  /**
   * Projetos elegíveis para vistoria: com status APROVADO ou com instalação já registrada,
   * que ainda não tenham vistoria aberta. Se a instalação ainda não foi registrada,
   * o modal de vistoria permite informá-la diretamente.
   */
  const projetosElegiveis = useMemo(
    () =>
      projetos.filter(
        p => (p.status === 'APROVADO' || p.dataInstalacao) && !vistorias.some(v => v.projetoId === p.id),
      ),
    [projetos, vistorias],
  );

  /**
   * A fila da etapa 4: projeto homologado pela Coelba e ainda sem vistoria. É aqui que o
   * projeto "chega" depois de aprovado — antes ele não aparecia em lugar nenhum, e a vistoria
   * só acontecia se alguém lembrasse de vir procurar.
   *
   * Nenhum registro de Vistoria nasce junto com a aprovação, de propósito: `data_solicitacao`
   * tem que ser a data em que se pediu de verdade, senão a métrica de tempo até solicitar
   * vistoria mede o nada.
   *
   * O mais antigo primeiro — é o que está esperando há mais tempo.
   */
  const filaAguardandoVistoria = useMemo(
    () =>
      projetos
        .filter(p => p.status === 'APROVADO' && !vistorias.some(v => v.projetoId === p.id))
        .sort((a, b) => (a.dataAprovacao ?? '').localeCompare(b.dataAprovacao ?? '')),
    [projetos, vistorias],
  );

  // Form New Vistoria
  const [novoProjetoId, setNovoProjetoId] = useState<number | ''>('');
  const [dataInstalacaoNova, setDataInstalacaoNova] = useState(hojeISO);

  // Registro da instalação direto pela fila — é aqui que essa data é preenchida no fluxo,
  // e não na tela de homologação: quem homologa acompanha a Coelba, não o campo.
  const [projetoParaInstalacao, setProjetoParaInstalacao] = useState<ProjetoLista | null>(null);
  const [dataInstalacaoTexto, setDataInstalacaoTexto] = useState(hojeISO);
  const [salvandoInstalacao, setSalvandoInstalacao] = useState(false);

  const abrirModalInstalacao = (projeto: ProjetoLista) => {
    setProjetoParaInstalacao(projeto);
    setDataInstalacaoTexto(projeto.dataInstalacao || hojeISO());
  };

  const handleConfirmarInstalacao = async () => {
    if (!projetoParaInstalacao || !dataInstalacaoTexto) return;
    setSalvandoInstalacao(true);
    try {
      await registrarInstalacao(projetoParaInstalacao.id, dataInstalacaoTexto);
      setProjetoParaInstalacao(null);
    } catch {
      /* toast de erro já exibido pelo contexto */
    } finally {
      setSalvandoInstalacao(false);
    }
  };

  const projetoEscolhido = useMemo(
    () => projetos.find(p => p.id === novoProjetoId),
    [projetos, novoProjetoId]
  );

  useEffect(() => {
    setNovoProjetoId(atual =>
      atual === '' && projetosElegiveis.length > 0 ? projetosElegiveis[0].id : atual,
    );
  }, [projetosElegiveis]);

  // Filtering
  const vistoriasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return ordenar(vistorias.filter(v => {
      const matchTexto =
        v.cliente.nome.toLowerCase().includes(termo) ||
        (v.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        (v.cliente.ucCoelba != null && v.cliente.ucCoelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || v.status === filtroStatus;
      return matchTexto && matchStatus;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistorias, busca, filtroStatus, ordenacao]);

  // Pagination
  const totalPaginas = Math.ceil(vistoriasFiltradas.length / itensPorPagina) || 1;
  const vistoriasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return vistoriasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [vistoriasFiltradas, pagina]);

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoProjetoId === '' || !projetoEscolhido) return;

    try {
      if (!projetoEscolhido.dataInstalacao) {
        if (!dataInstalacaoNova) return;
        await registrarInstalacao(projetoEscolhido.id, dataInstalacaoNova);
      }
      await solicitarVistoria(projetoEscolhido.id);
      setIsModalNovoAberto(false);
    } catch {
      // O AppContext já mostrou o motivo da recusa; o modal fica aberto para correção.
    }
  };

  const getStatusBadge = (status: StatusVistoria) => {
    switch (status) {
      case 'APROVADA':
        return <Badge variant="success">Vistoria {ROTULO_STATUS_VISTORIA.APROVADA}</Badge>;
      case 'REPROVADA':
        return <Badge variant="danger">Vistoria {ROTULO_STATUS_VISTORIA.REPROVADA}</Badge>;
      case 'SOLICITADA':
      default:
        return <Badge variant="info">Solicitada (Aguardando Visita)</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, cidade ou UC Coelba..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-sm"
          />
        </div>

        {/* Filters and CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="SOLICITADA">Solicitadas (Aguardando)</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="REPROVADA">Reprovadas</option>
          </select>

          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Vistoria</span>
          </button>
        </div>
      </div>

      {/* Fila de entrada da etapa 4 — projeto homologado esperando vistoria. */}
      <Card
        title={`Aguardando vistoria (${filaAguardandoVistoria.length})`}
        subtitle="Projetos aprovados pela Coelba que ainda não têm vistoria solicitada. Registre a instalação da usina aqui e depois solicite a vistoria."
      >
        {filaAguardandoVistoria.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-[#149911]" />
            Nenhum projeto aprovado esperando vistoria.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Aprovado</th>
                  <th className="py-3 px-4">Instalação da usina</th>
                  <th className="py-3 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filaAguardandoVistoria.map(p => {
                  const diasAprovado = diasDesde(p.dataAprovacao);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-slate-800">{p.cliente.nome}</div>
                        <div className="text-[11px] text-[#424342] flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.cliente.cidade ?? '—'}
                          </span>
                          {p.cliente.ucCoelba && (
                            <span className="text-slate-400">UC: {p.cliente.ucCoelba}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{ROTULO_TIPO_PROJETO[p.tipoProjeto]}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="text-slate-700">{formatarData(p.dataAprovacao)}</div>
                        {diasAprovado !== null && diasAprovado > 0 && (
                          <div className="text-[11px] text-slate-400">
                            {textoDiasParado(diasAprovado)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.dataInstalacao ? (
                          <button
                            type="button"
                            onClick={() => abrirModalInstalacao(p)}
                            className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                            title="Clique para corrigir a data de instalação"
                          >
                            <CalendarCheck className="w-3.5 h-3.5 text-[#149911]" />
                            {formatarData(p.dataInstalacao)}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirModalInstalacao(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            Registrar instalação
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Botao
                          tamanho="sm"
                          variante="primario"
                          disabled={!p.dataInstalacao}
                          title={
                            p.dataInstalacao
                              ? 'Solicitar vistoria à Coelba'
                              : 'Registre a data de instalação da usina antes de solicitar a vistoria'
                          }
                          onClick={() => solicitarVistoria(p.id).catch(() => {})}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Solicitar vistoria
                        </Botao>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Main Table Card */}
      <Card
        title="Vistorias Técnicas Pós-Instalação"
        subtitle={`Exibe ${vistoriasFiltradas.length} vistorias solicitadas junto à Coelba para troca do medidor`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">
                  <Ordenavel {...cabecalho('cliente')}>Cliente &amp; Localização</Ordenavel>
                </th>
                <th className="py-3 px-4">Tipo de Projeto</th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('dataSolicitacao')}>Data Solicitação</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('status')}>Status da Vistoria</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('dataResultado')}>Data Resultado</Ordenavel>
                </th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vistoriasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma vistoria encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                vistoriasPaginadas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-medium text-slate-800">{v.cliente.nome}</span>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoClientePorId(v.cliente.id)}
                          title="Editar dados cadastrais do cliente"
                          className="p-1 text-slate-400 hover:text-[#149911] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-[#424342] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {v.cliente.cidade ?? '—'}
                        </span>
                        {v.cliente.ucCoelba && (
                          <span className="text-slate-400">UC: {v.cliente.ucCoelba}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {subtipoDaVistoria(v)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatarData(v.dataSolicitacao)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {v.dataResultado ? (
                        <span className="font-medium text-slate-700">
                          {formatarData(v.dataResultado)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {/* Vistoria aprovada é estado final: nenhuma ação sobra na linha. */}
                      <div className="flex items-center justify-end gap-1">
                        {v.status === 'SOLICITADA' && (
                          <>
                            <button
                              onClick={() => aprovarVistoria(v.id).catch(() => {})}
                              title="Aprovar Vistoria (Troca de Medidor OK)"
                              className="p-1.5 text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => reprovarVistoria(v.id).catch(() => {})}
                              title="Registrar Reprova de Vistoria"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {v.status === 'REPROVADA' && (
                          <button
                            onClick={() => resolicitarVistoria(v.id, v.projetoId).catch(() => {})}
                            title="Solicitar Vistoria Novamente"
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setVistoriaSelecionada(v);
                            setIsModalDetalheAberto(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors ml-1"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Mostrando <span className="font-medium">{vistoriasPaginadas.length}</span> de{' '}
            <span className="font-medium">{vistoriasFiltradas.length}</span> registros
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina(p => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-700 font-medium">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Modal: Detalhes da Vistoria */}
      {vistoriaSelecionada && (
        <Modal
          isOpen={isModalDetalheAberto}
          onClose={() => {
            setIsModalDetalheAberto(false);
            setVistoriaSelecionada(null);
          }}
          title={`Vistoria — ${vistoriaSelecionada.cliente.nome}`}
          subtitle={`Status: ${ROTULO_STATUS_VISTORIA[vistoriaSelecionada.status]}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {vistoriaSelecionada.status === 'REPROVADA' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await resolicitarVistoria(
                        vistoriaSelecionada.id,
                        vistoriaSelecionada.projetoId,
                      );
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Solicitar Vistoria Novamente
                </button>
              )}
              {vistoriaSelecionada.status === 'SOLICITADA' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await aprovarVistoria(vistoriaSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar Vistoria e Liberar Pós-Venda
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">Dados da Vistoria Técnica</span>
                <button
                  type="button"
                  onClick={() => abrirEdicaoClientePorId(vistoriaSelecionada.cliente.id)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Cadastro do Cliente
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{vistoriaSelecionada.cliente.cidade ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{vistoriaSelecionada.cliente.ucCoelba || 'N/A'}</strong></div>
                <div>Tipo: <strong className="text-slate-800">{subtipoDaVistoria(vistoriaSelecionada)}</strong></div>
                <div>Instalação em: <strong className="text-slate-800">{formatarData(vistoriaSelecionada.dataInstalacaoDoProjeto)}</strong></div>
                <div>Solicitado em: <strong className="text-slate-800">{formatarData(vistoriaSelecionada.dataSolicitacao)}</strong></div>
                <div>Resultado em: <strong className="text-slate-800">{vistoriaSelecionada.dataResultado ? formatarData(vistoriaSelecionada.dataResultado) : 'Pendente'}</strong></div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">Status da Vistoria</label>
              <div>{getStatusBadge(vistoriaSelecionada.status)}</div>
            </div>

            <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              💡 <strong>Regra de Negócio:</strong> Aprovada a vistoria, o cliente segue para o pós-venda. Caso haja <em>Unificação</em> pendente com desligamento, a equipe avança para conferência do ramal.
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Solicitar Vistoria */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Solicitar Nova Vistoria Técnica"
        subtitle="Registrada pós-instalação da usina fotovoltaica junto à Coelba"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalNovoAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-nova-vistoria"
              disabled={projetosElegiveis.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar Solicitação
            </button>
          </>
        }
      >
        <form id="form-nova-vistoria" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Projeto Vinculado
            </label>
            {projetosElegiveis.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                Nenhum projeto aprovado disponível para vistoria no momento.
              </div>
            ) : (
              <select
                value={novoProjetoId}
                onChange={(e) => setNovoProjetoId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                {projetosElegiveis.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.cliente.nome} ({ROTULO_TIPO_PROJETO[p.tipoProjeto]} — {p.dataInstalacao ? `instalado em ${formatarData(p.dataInstalacao)}` : 'aprovado, instalação pendente'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {projetoEscolhido && !projetoEscolhido.dataInstalacao && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-amber-800">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Preenchimento da Data de Instalação</span>
              </div>
              <p>
                Este projeto foi aprovado na Coelba mas ainda não tem a data de instalação cadastrada.
                Informe a data em que a usina foi montada para registrar a instalação e solicitar a vistoria:
              </p>
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Data da Instalação da Usina <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dataInstalacaoNova}
                  onChange={(e) => setDataInstalacaoNova(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
                />
              </div>
            </div>
          )}

          <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            💡 <strong>Regra de Negócio:</strong> Se a instalação ainda não havia sido registrada,
            o sistema salva a data informada e protocola a vistoria automaticamente na Coelba.
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar Instalação — mora aqui, e não na tela de homologação */}
      <Modal
        isOpen={projetoParaInstalacao !== null}
        onClose={() => setProjetoParaInstalacao(null)}
        title="Registrar instalação da usina"
        subtitle={`Cliente: ${projetoParaInstalacao?.cliente.nome ?? ''}`}
        maxWidth="md"
        footer={
          <>
            <Botao variante="fantasma" onClick={() => setProjetoParaInstalacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              onClick={handleConfirmarInstalacao}
              disabled={salvandoInstalacao || !dataInstalacaoTexto}
            >
              {salvandoInstalacao ? 'Salvando…' : 'Registrar instalação'}
            </Botao>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Data em que a usina foi montada em campo — a informação que chega pelo grupo de
            instalados. É ela que libera a solicitação de vistoria junto à Coelba, e é dela que
            sai a métrica de tempo entre instalar e pedir a vistoria.
          </p>
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Data da instalação <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={dataInstalacaoTexto}
              onChange={(e) => setDataInstalacaoTexto(e.target.value)}
              max={hojeISO()}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              required
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Edição de Cliente */}
      <ClienteModal
        isOpen={isModalClienteAberto}
        onClose={() => setIsModalClienteAberto(false)}
        clienteEmEdicao={clienteParaEditar}
      />
    </div>
  );
};
