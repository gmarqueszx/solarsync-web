import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ROTULO_STATUS_VISTORIA, ROTULO_TIPO_PROJETO, StatusVistoria, Vistoria } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const VistoriaModule: React.FC = () => {
  const {
    vistorias,
    projetos,
    solicitarVistoria,
    aprovarVistoria,
    reprovarVistoria,
    resolicitarVistoria,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modals
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState<Vistoria | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);

  /** A vistoria guarda só o `projetoId`; o subtipo vem do projeto correspondente. */
  const projetoPorId = useMemo(() => new Map(projetos.map(p => [p.id, p])), [projetos]);
  const subtipoDaVistoria = (v: Vistoria) => {
    const projeto = projetoPorId.get(v.projetoId);
    return projeto ? ROTULO_TIPO_PROJETO[projeto.tipoProjeto] : '—';
  };

  /**
   * A API recusa vistoria de projeto sem instalação registrada (409), e cada projeto tem no
   * máximo uma vistoria — a reprovada é resolicitada no próprio registro.
   */
  const projetosElegiveis = useMemo(
    () =>
      projetos.filter(p => p.dataInstalacao && !vistorias.some(v => v.projetoId === p.id)),
    [projetos, vistorias],
  );

  // Form New Vistoria
  const [novoProjetoId, setNovoProjetoId] = useState<number | ''>('');
  useEffect(() => {
    setNovoProjetoId(atual =>
      atual === '' && projetosElegiveis.length > 0 ? projetosElegiveis[0].id : atual,
    );
  }, [projetosElegiveis]);

  // Filtering
  const vistoriasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return vistorias.filter(v => {
      const matchTexto =
        v.cliente.nome.toLowerCase().includes(termo) ||
        (v.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        (v.cliente.ucCoelba != null && v.cliente.ucCoelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || v.status === filtroStatus;
      return matchTexto && matchStatus;
    });
  }, [vistorias, busca, filtroStatus]);

  // Pagination
  const totalPaginas = Math.ceil(vistoriasFiltradas.length / itensPorPagina) || 1;
  const vistoriasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return vistoriasFiltradas.slice(inicio, inicio + itensPorPagina);
  }, [vistoriasFiltradas, pagina]);

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoProjetoId === '') return;

    try {
      await solicitarVistoria(novoProjetoId);
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
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-xs"
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
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="SOLICITADA">Solicitadas (Aguardando)</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="REPROVADA">Reprovadas</option>
          </select>

          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Solicitar Vistoria</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Vistorias Técnicas Pós-Instalação"
        subtitle={`Exibe ${vistoriasFiltradas.length} vistorias solicitadas junto à Coelba para troca do medidor`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">Cliente & Localização</th>
                <th className="py-3 px-4">Subtipo de Projeto</th>
                <th className="py-3 px-4">Data Solicitação</th>
                <th className="py-3 px-4">Status da Vistoria</th>
                <th className="py-3 px-4">Data Resultado</th>
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
                      <div className="font-medium text-slate-800">{v.cliente.nome}</div>
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
                        <span>{v.dataSolicitacao}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {v.dataResultado ? (
                        <span className="font-medium text-slate-700">{v.dataResultado}</span>
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
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
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
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
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
              <div className="font-medium text-slate-800">Dados da Vistoria Técnica</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{vistoriaSelecionada.cliente.cidade ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{vistoriaSelecionada.cliente.ucCoelba || 'N/A'}</strong></div>
                <div>Subtipo: <strong className="text-slate-800">{subtipoDaVistoria(vistoriaSelecionada)}</strong></div>
                <div>Instalação em: <strong className="text-slate-800">{vistoriaSelecionada.dataInstalacaoDoProjeto ?? '—'}</strong></div>
                <div>Solicitado em: <strong className="text-slate-800">{vistoriaSelecionada.dataSolicitacao}</strong></div>
                <div>Resultado em: <strong className="text-slate-800">{vistoriaSelecionada.dataResultado || 'Pendente'}</strong></div>
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
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar Solicitação
            </button>
          </>
        }
      >
        <form id="form-nova-vistoria" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Projeto Instalado Vinculado
            </label>
            {projetosElegiveis.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                Nenhum projeto disponível para vistoria. A solicitação só é aceita depois que a
                instalação da usina é registrada na tela de Projetos.
              </div>
            ) : (
              <select
                value={novoProjetoId}
                onChange={(e) => setNovoProjetoId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                {projetosElegiveis.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.cliente.nome} ({ROTULO_TIPO_PROJETO[p.tipoProjeto]} — Instalado em: {p.dataInstalacao})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            💡 <strong>Regra de Negócio:</strong> Só aparecem aqui projetos com data de instalação
            registrada e ainda sem vistoria aberta — a Coelba não recebe a solicitação antes disso.
          </div>
        </form>
      </Modal>
    </div>
  );
};
