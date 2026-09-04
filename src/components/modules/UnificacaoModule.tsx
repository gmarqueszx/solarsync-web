import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ROTULO_STATUS_DESLIGAMENTO, Unificacao } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Search,
  Plus,
  CheckCircle2,
  PowerOff,
  MapPin,
  ChevronLeft,
  ChevronRight,
  GitMerge,
} from 'lucide-react';

export const UnificacaoModule: React.FC = () => {
  const {
    unificacoes,
    clientes,
    usuarios,
    criarUnificacao,
    concluirUnificacao,
    reabrirUnificacao,
    solicitarDesligamento,
    abrirOrdemDeServico,
    concluirDesligamento,
  } = useApp();

  /** A linha traz só o resumo do cliente; vendedor vem do cadastro completo. */
  const vendedorDoCliente = useMemo(() => {
    const mapa = new Map(clientes.map(c => [c.id, c.vendedor]));
    return (clienteId: number) => mapa.get(clienteId) ?? null;
  }, [clientes]);

  const alternarUnificacaoFeita = (u: Unificacao) =>
    u.feita ? reabrirUnificacao(u.id) : concluirUnificacao(u.id);

  const [busca, setBusca] = useState('');
  const [filtroFeita, setFiltroFeita] = useState<string>('TODOS');
  const [filtroDesligamento, setFiltroDesligamento] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modals
  const [unificacaoSelecionada, setUnificacaoSelecionada] = useState<Unificacao | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);

  // Form New Unificacao
  const [novoClienteId, setNovoClienteId] = useState<number | ''>('');
  const [novoProjetistaId, setNovoProjetistaId] = useState<number | ''>('');
  const [novasInformacoes, setNovasInformacoes] = useState('');

  // A lista de clientes chega da API depois da primeira renderização: sincroniza o padrão.
  useEffect(() => {
    setNovoClienteId(atual => (atual === '' && clientes.length > 0 ? clientes[0].id : atual));
  }, [clientes]);

  // Filtering
  const unificacoesFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return unificacoes.filter(u => {
      const matchTexto =
        u.cliente.nome.toLowerCase().includes(termo) ||
        (u.cidade ?? '').toLowerCase().includes(termo) ||
        (u.projetista?.nome ?? '').toLowerCase().includes(termo) ||
        (u.informacoes ?? '').toLowerCase().includes(termo) ||
        (u.cliente.ucCoelba != null && u.cliente.ucCoelba.includes(busca));

      const matchFeita =
        filtroFeita === 'TODOS' ||
        (filtroFeita === 'FEITA' ? u.feita : !u.feita);

      const matchDesligamento =
        filtroDesligamento === 'TODOS' || u.desligamentoStatus === filtroDesligamento;

      return matchTexto && matchFeita && matchDesligamento;
    });
  }, [unificacoes, busca, filtroFeita, filtroDesligamento]);

  // Pagination
  const totalPaginas = Math.ceil(unificacoesFiltradas.length / itensPorPagina) || 1;
  const unificacoesPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return unificacoesFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [unificacoesFiltradas, pagina]);

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoClienteId === '') return;

    try {
      await criarUnificacao({
        clienteId: novoClienteId,
        projetistaId: novoProjetistaId === '' ? null : novoProjetistaId,
        informacoes: novasInformacoes || null,
      });
      setIsModalNovoAberto(false);
      setNovasInformacoes('');
    } catch {
      // O AppContext já mostrou o motivo da recusa; o modal fica aberto para correção.
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Unificações Concluídas</span>
            <div className="text-xl font-semibold text-emerald-700 mt-1">
              {unificacoes.filter(u => u.feita).length} contas contrato
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#149911] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            {/*
              Mostra quem está ESPERANDO, não quem já concluiu: a fila de espera é a que se
              perde de vista, e é nela que o gestor precisa agir.
            */}
            <span className="text-xs text-[#424342]">Aguardando Desligamento</span>
            <div className="text-xl font-semibold text-amber-700 mt-1">
              {
                unificacoes.filter(
                  u => u.desligamentoStatus === 'SOLICITADO'
                    || u.desligamentoStatus === 'OS_ABERTA',
                ).length
              }{' '}
              medidores
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <PowerOff className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Consolidação</span>
            <div className="text-xs text-slate-700 mt-1 font-medium">
              Unifica as antigas abas <strong>IGOR</strong>, <strong>UNIFICAÇÕES</strong> e <strong>DESLIGAMENTOS</strong>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-[#149911]" />
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, cidade, projetista ou detalhes..."
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
          <select
            value={filtroFeita}
            onChange={(e) => {
              setFiltroFeita(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="FEITA">Concluídas (Feitas)</option>
          </select>

          <select
            value={filtroDesligamento}
            onChange={(e) => {
              setFiltroDesligamento(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos Desligamentos</option>
            <option value="NAO_SOLICITADO">A solicitar</option>
            <option value="SOLICITADO">Aguardando equipe</option>
            <option value="OS_ABERTA">O.S. aberta</option>
            <option value="CONCLUIDO">Desligado</option>
          </select>

          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Unificação</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Unificação de Contas Contrato & Medição Coelba"
        subtitle={`Exibe ${unificacoesFiltradas.length} processos de unificação e desligamento físico de medidor`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">Cliente & Localização</th>
                <th className="py-3 px-4">Projetista Responsável</th>
                <th className="py-3 px-6">Informações Técnicas</th>
                <th className="py-3 px-4 text-center">Unificação Feita?</th>
                <th className="py-3 px-4 text-center">Desligamento Físico</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {unificacoesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma unificação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                unificacoesPaginadas.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-800">{u.cliente.nome}</div>
                      <div className="text-[11px] text-[#424342] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {u.cidade ?? '—'}
                        </span>
                        {u.cliente.ucCoelba && (
                          <span className="text-slate-400">UC: {u.cliente.ucCoelba}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.projetista?.nome ?? '—'}
                    </td>
                    <td className="py-3.5 px-6 max-w-xs truncate text-slate-600">
                      {u.informacoes ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => alternarUnificacaoFeita(u).catch(() => {})}
                        className="inline-flex items-center gap-1.5 focus:outline-none"
                        title="Clique para alternar status de conclusão"
                      >
                        {u.feita ? (
                          <Badge variant="success">Feita</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {/*
                        Ciclo de solicitar e aguardar retorno: cada estado oferece só a ação
                        que faz sentido a seguir. Solicitar exige a unificação feita — a API
                        recusa com 409 e o toast explica.
                      */}
                      {u.desligamentoStatus === 'CONCLUIDO' ? (
                        <Badge variant="success">Desligado</Badge>
                      ) : u.desligamentoStatus === 'SOLICITADO' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Badge variant="warning">Aguardando equipe</Badge>
                          <button
                            onClick={() => concluirDesligamento(u.id).catch(() => {})}
                            className="text-[11px] font-medium text-[#149911] hover:underline"
                            title="Registrar que o medidor foi desligado"
                          >
                            concluir
                          </button>
                          <button
                            onClick={() => abrirOrdemDeServico(u.id).catch(() => {})}
                            className="text-[11px] font-medium text-amber-700 hover:underline"
                            title="A equipe de campo não realizou o desligamento"
                          >
                            abrir O.S.
                          </button>
                        </div>
                      ) : u.desligamentoStatus === 'OS_ABERTA' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Badge variant="danger">O.S. aberta</Badge>
                          <button
                            onClick={() => concluirDesligamento(u.id).catch(() => {})}
                            className="text-[11px] font-medium text-[#149911] hover:underline"
                            title="Registrar que o medidor foi desligado"
                          >
                            concluir
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => solicitarDesligamento(u.id).catch(() => {})}
                          className="inline-flex items-center gap-1.5 focus:outline-none"
                          title="Solicitar o desligamento do medidor unificado"
                        >
                          <Badge variant="neutral">Solicitar Desligamento</Badge>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => {
                          setUnificacaoSelecionada(u);
                          setIsModalDetalheAberto(true);
                        }}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        Ver Detalhes
                      </button>
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
            Mostrando <span className="font-medium">{unificacoesPaginadas.length}</span> de{' '}
            <span className="font-medium">{unificacoesFiltradas.length}</span> registros
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

      {/* Modal: Detalhes da Unificação */}
      {unificacaoSelecionada && (
        <Modal
          isOpen={isModalDetalheAberto}
          onClose={() => {
            setIsModalDetalheAberto(false);
            setUnificacaoSelecionada(null);
          }}
          title={`Unificação — ${unificacaoSelecionada.cliente.nome}`}
          subtitle={`Projetista: ${unificacaoSelecionada.projetista?.nome ?? '—'} · ${unificacaoSelecionada.cidade ?? '—'}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {unificacaoSelecionada.desligamentoStatus === 'NAO_SOLICITADO' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await solicitarDesligamento(unificacaoSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PowerOff className="w-4 h-4" />
                  Solicitar Desligamento
                </button>
              )}
              {(unificacaoSelecionada.desligamentoStatus === 'SOLICITADO'
                || unificacaoSelecionada.desligamentoStatus === 'OS_ABERTA') && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await concluirDesligamento(unificacaoSelecionada.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <PowerOff className="w-4 h-4" />
                  Registrar Medidor Desligado
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await alternarUnificacaoFeita(unificacaoSelecionada);
                    setIsModalDetalheAberto(false);
                  } catch {
                    /* toast de erro já exibido pelo contexto */
                  }
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
              >
                {unificacaoSelecionada.feita ? 'Reabrir Unificação' : 'Concluir Unificação'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="font-medium text-slate-800">Dados do Cliente & Contrato</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{unificacaoSelecionada.cidade ?? '—'}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{vendedorDoCliente(unificacaoSelecionada.cliente.id) ?? '—'}</strong></div>
                <div>Projetista: <strong className="text-slate-800">{unificacaoSelecionada.projetista?.nome ?? '—'}</strong></div>
                <div>UC Principal: <strong className="text-slate-800">{unificacaoSelecionada.cliente.ucCoelba || 'N/A'}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Status da Unificação</span>
                {unificacaoSelecionada.feita ? (
                  <Badge variant="success">Unificação Feita</Badge>
                ) : (
                  <Badge variant="warning">Pendente de Execução</Badge>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Desligamento do Medidor</span>
                <Badge
                  variant={
                    unificacaoSelecionada.desligamentoStatus === 'CONCLUIDO'
                      ? 'success'
                      : unificacaoSelecionada.desligamentoStatus === 'OS_ABERTA'
                        ? 'danger'
                        : unificacaoSelecionada.desligamentoStatus === 'SOLICITADO'
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {ROTULO_STATUS_DESLIGAMENTO[unificacaoSelecionada.desligamentoStatus]}
                </Badge>
                {unificacaoSelecionada.desligamentoSolicitadoEm && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {/* Data crua, como no resto das telas — ver nota de formatação no CLAUDE.md */}
                    Solicitado em {unificacaoSelecionada.desligamentoSolicitadoEm}
                    {unificacaoSelecionada.desligamentoConcluidoEm
                      && ` · desligado em ${unificacaoSelecionada.desligamentoConcluidoEm}`}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">
                Instruções e Informações Técnicas da Unificação
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {unificacaoSelecionada.informacoes || 'Sem informações técnicas registradas.'}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova Unificação */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Cadastrar Nova Unificação de Medidor"
        subtitle="Agrupamento de contas contrato ou ramais de medição pós-vistoria"
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
              form="form-nova-unificacao"
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
            >
              Registrar Unificação
            </button>
          </>
        }
      >
        <form id="form-nova-unificacao" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
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

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Projetista Responsável
            </label>
            <select
              value={novoProjetistaId}
              onChange={(e) =>
                setNovoProjetistaId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
            >
              <option value="">Sem projetista definido</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Instruções Técnicas da Unificação
            </label>
            <textarea
              rows={3}
              value={novasInformacoes}
              onChange={(e) => setNovasInformacoes(e.target.value)}
              placeholder="Ex: Unificação do medidor da bomba com a casa sede. Abrir O.S. na Coelba para remoção do ramal secundário..."
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              required
            />
          </div>

          <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            💡 <strong>Regra de Negócio:</strong> O desligamento físico do medidor é registrado
            depois, na própria linha da unificação, quando a O.S. é executada pela Coelba.
          </div>
        </form>
      </Modal>
    </div>
  );
};
