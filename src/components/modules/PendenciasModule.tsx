import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { pendenciasApi } from '../../api/recursos';
import {
  Pendencia,
  PendenciaLista,
  ROTULO_STATUS_PENDENCIA,
  ROTULO_TIPO_PENDENCIA,
  StatusPendencia,
  TipoPendencia,
} from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Search,
  Plus,
  CheckCircle,
  Play,
  Ban,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const PendenciasModule: React.FC = () => {
  const {
    pendencias,
    clientes,
    usuarios,
    criarPendencia,
    iniciarPendencia,
    resolverPendencia,
    cancelarPendencia,
    reabrirPendencia,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modal states
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<PendenciaLista | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [isModalCancelaAberto, setIsModalCancelaAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  /**
   * A listagem não traz a observação (só o detalhe traz). Buscamos sob demanda ao abrir o
   * modal, em vez de esconder o parecer que o analista acabou de escrever.
   */
  const [detalhe, setDetalhe] = useState<Pendencia | null>(null);
  useEffect(() => {
    if (!pendenciaSelecionada) {
      setDetalhe(null);
      return;
    }
    let cancelado = false;
    pendenciasApi
      .buscar(pendenciaSelecionada.id)
      .then(p => {
        if (!cancelado) setDetalhe(p);
      })
      .catch(() => {
        /* o card de observação simplesmente não preenche; o resto do modal continua útil */
      });
    return () => {
      cancelado = true;
    };
  }, [pendenciaSelecionada]);

  // Form state for new Pendencia
  const [novoClienteId, setNovoClienteId] = useState<number | ''>('');
  const [novoTipo, setNovoTipo] = useState<TipoPendencia>('TROCA_TITULARIDADE');
  const [novoResponsavelId, setNovoResponsavelId] = useState<number | ''>('');
  const [novaObservacao, setNovaObservacao] = useState('');

  // A lista de clientes chega da API depois da primeira renderização: sincroniza o padrão.
  useEffect(() => {
    setNovoClienteId(atual => (atual === '' && clientes.length > 0 ? clientes[0].id : atual));
  }, [clientes]);

  // Filtering
  const pendenciasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return pendencias.filter(p => {
      const matchTexto =
        p.cliente.nome.toLowerCase().includes(termo) ||
        (p.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        ROTULO_TIPO_PENDENCIA[p.tipo].toLowerCase().includes(termo) ||
        (p.responsavel?.nome ?? '').toLowerCase().includes(termo) ||
        (p.cliente.ucCoelba != null && p.cliente.ucCoelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || p.status === filtroStatus;
      const matchResp =
        filtroResponsavel === 'TODOS' || String(p.responsavel?.id ?? '') === filtroResponsavel;

      return matchTexto && matchStatus && matchResp;
    });
  }, [pendencias, busca, filtroStatus, filtroResponsavel]);

  // Pagination
  const totalPaginas = Math.ceil(pendenciasFiltradas.length / itensPorPagina) || 1;
  const pendenciasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return pendenciasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [pendenciasFiltradas, pagina]);

  const responsaveisUnicos = useMemo(() => {
    const mapa = new Map<number, string>();
    pendencias.forEach(p => {
      if (p.responsavel) mapa.set(p.responsavel.id, p.responsavel.nome);
    });
    return Array.from(mapa, ([id, nome]) => ({ id, nome }));
  }, [pendencias]);

  const fecharDetalhe = () => {
    setIsModalDetalheAberto(false);
    setPendenciaSelecionada(null);
  };

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoClienteId === '') return;

    try {
      await criarPendencia({
        clienteId: novoClienteId,
        tipo: novoTipo,
        responsavelId: novoResponsavelId === '' ? null : novoResponsavelId,
        observacao: novaObservacao || null,
      });
      setIsModalNovoAberto(false);
      setNovaObservacao('');
    } catch {
      // O AppContext já mostrou o motivo da recusa; o modal fica aberto para correção.
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!pendenciaSelecionada || !motivoCancelamento.trim()) return;
    try {
      await cancelarPendencia(pendenciaSelecionada.id, motivoCancelamento.trim());
      setIsModalCancelaAberto(false);
      setIsModalDetalheAberto(false);
      setMotivoCancelamento('');
    } catch {
      // Mantém o modal aberto: o toast de erro já explica o que impediu.
    }
  };

  const getStatusBadge = (status: StatusPendencia) => {
    switch (status) {
      case 'RESOLVIDA':
        return <Badge variant="success">{ROTULO_STATUS_PENDENCIA.RESOLVIDA}</Badge>;
      case 'EM_ANDAMENTO':
        return <Badge variant="warning">{ROTULO_STATUS_PENDENCIA.EM_ANDAMENTO}</Badge>;
      case 'CANCELADA':
        return <Badge variant="neutral">{ROTULO_STATUS_PENDENCIA.CANCELADA}</Badge>;
      case 'ABERTA':
      default:
        return <Badge variant="danger">{ROTULO_STATUS_PENDENCIA.ABERTA}</Badge>;
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
            placeholder="Buscar por cliente, cidade, UC Coelba ou tipo..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-xs"
          />
        </div>

        {/* Filters and CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ABERTA">{ROTULO_STATUS_PENDENCIA.ABERTA}</option>
            <option value="EM_ANDAMENTO">{ROTULO_STATUS_PENDENCIA.EM_ANDAMENTO}</option>
            <option value="RESOLVIDA">{ROTULO_STATUS_PENDENCIA.RESOLVIDA}</option>
            <option value="CANCELADA">{ROTULO_STATUS_PENDENCIA.CANCELADA}</option>
          </select>

          {/* Responsible Filter */}
          <select
            value={filtroResponsavel}
            onChange={(e) => {
              setFiltroResponsavel(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos Responsáveis</option>
            {responsaveisUnicos.map(r => (
              <option key={r.id} value={String(r.id)}>
                {r.nome}
              </option>
            ))}
          </select>

          {/* New Pendencia Button */}
          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Pendência</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Fila Unificada de Pendências"
        subtitle={`Exibe ${pendenciasFiltradas.length} pendências mapeadas (consolida abas PARAFAZER, PENDENCIASNYCOLLE e PENDENCIASOLICITACOES)`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">Cliente & Localização</th>
                <th className="py-3 px-4">Tipo de Pendência</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Solicitado Em</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pendenciasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma pendência encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                pendenciasPaginadas.map(p => (
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
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">
                        {ROTULO_TIPO_PENDENCIA[p.tipo]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-medium border border-slate-200">
                          {(p.responsavel?.nome ?? '—').charAt(0)}
                        </div>
                        <span>{p.responsavel?.nome ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.solicitadoEm}</span>
                      </div>
                      {p.resolvidoEm && (
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          Concluído: {p.resolvidoEm}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {/* Só as transições que a API aceita para o status atual da linha. */}
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'ABERTA' && (
                          <button
                            onClick={() => iniciarPendencia(p.id).catch(() => {})}
                            title="Iniciar atendimento"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {(p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO') && (
                          <button
                            onClick={() => resolverPendencia(p.id).catch(() => {})}
                            title="Marcar como resolvida"
                            className="p-1.5 text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPendenciaSelecionada(p);
                            setIsModalDetalheAberto(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
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

        {/* Table Pagination */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Mostrando <span className="font-medium">{pendenciasPaginadas.length}</span> de{' '}
            <span className="font-medium">{pendenciasFiltradas.length}</span> registros
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

      {/* Modal: Detalhes & Edição */}
      {pendenciaSelecionada && (
        <Modal
          isOpen={isModalDetalheAberto}
          onClose={fecharDetalhe}
          title={`Pendência — ${pendenciaSelecionada.cliente.nome}`}
          subtitle={`Tipo: ${ROTULO_TIPO_PENDENCIA[pendenciaSelecionada.tipo]} · Protocolo Coelba`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {(pendenciaSelecionada.status === 'ABERTA' ||
                pendenciaSelecionada.status === 'EM_ANDAMENTO') && (
                <button
                  type="button"
                  onClick={() => setIsModalCancelaAberto(true)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  Cancelar Pendência
                </button>
              )}
              {pendenciaSelecionada.status === 'ABERTA' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await iniciarPendencia(pendenciaSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Atendimento
                </button>
              )}
              {pendenciaSelecionada.status === 'ABERTA' ||
              pendenciaSelecionada.status === 'EM_ANDAMENTO' ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await resolverPendencia(pendenciaSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Concluir e Liberar para Débito/Projeto
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await reabrirPendencia(pendenciaSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
                >
                  Reabrir Pendência
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {/* Client Info Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="font-medium text-slate-800">Dados do Cliente Vinculado</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{pendenciaSelecionada.cliente.cidade ?? '—'}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{pendenciaSelecionada.cliente.vendedor ?? '—'}</strong></div>
                <div>Data Pagamento: <strong className="text-slate-800">{pendenciaSelecionada.cliente.dataPagamento ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{pendenciaSelecionada.cliente.ucCoelba || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Pendency Details */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 block">
                Status Atual
              </label>
              <div className="flex items-center gap-3">
                {getStatusBadge(pendenciaSelecionada.status)}
                <span className="text-xs text-slate-400">
                  Responsável: <strong className="text-slate-700">{pendenciaSelecionada.responsavel?.nome ?? '—'}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">
                Observações & Parecer Técnico
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {detalhe
                  ? detalhe.observacao || 'Sem observações adicionais registradas.'
                  : 'Carregando observações…'}
              </div>
            </div>

            <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              💡 <strong>Regra de Negócio:</strong> Quando a pendência é marcada como <em>RESOLVIDA</em>, o fluxo avança para a validação de débitos e criação automática do projeto com ART.
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cancelar Pendência */}
      <Modal
        isOpen={isModalCancelaAberto}
        onClose={() => setIsModalCancelaAberto(false)}
        title="Cancelar Pendência"
        subtitle={`Cliente: ${pendenciaSelecionada?.cliente.nome ?? ''}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalCancelaAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirmarCancelamento}
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
            >
              Confirmar Cancelamento
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Informe o motivo do cancelamento. Ele fica registrado no histórico da pendência.
          </p>
          <textarea
            rows={4}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Ex: Cliente desistiu da instalação e solicitou o encerramento do protocolo na Coelba..."
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-1 focus:ring-rose-500"
            required
          />
        </div>
      </Modal>

      {/* Modal: Nova Pendência */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Cadastrar Nova Pendência Coelba"
        subtitle="Entrada no fluxo de homologação para regularização prévia"
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
              form="form-nova-pendencia"
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
            >
              Registrar Pendência
            </button>
          </>
        }
      >
        <form id="form-nova-pendencia" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Cliente Vinculado
            </label>
            <select
              value={novoClienteId}
              onChange={(e) => setNovoClienteId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
            >
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.cidade ?? 'Sem cidade'} — Vendedor: {c.vendedor ?? '—'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Tipo de Pendência
              </label>
              <select
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value as TipoPendencia)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                {(Object.keys(ROTULO_TIPO_PENDENCIA) as TipoPendencia[]).map(tipo => (
                  <option key={tipo} value={tipo}>
                    {ROTULO_TIPO_PENDENCIA[tipo]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Responsável
              </label>
              <select
                value={novoResponsavelId}
                onChange={(e) =>
                  setNovoResponsavelId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                <option value="">Sem responsável definido</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Observação / Descrição da Exigência
            </label>
            <textarea
              rows={3}
              value={novaObservacao}
              onChange={(e) => setNovaObservacao(e.target.value)}
              placeholder="Ex: Protocolo aberto junto à Coelba para troca de titularidade da conta contrato..."
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
