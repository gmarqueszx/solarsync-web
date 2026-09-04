import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Debito, ROTULO_STATUS_DEBITO, StatusDebito } from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const DebitosModule: React.FC = () => {
  const { debitos, clientes, registrarConsultaDebito } = useApp();

  /** A linha de débito traz só o resumo do cliente; vendedor vem do cadastro completo. */
  const vendedorDoCliente = useMemo(() => {
    const mapa = new Map(clientes.map(c => [c.id, c.vendedor]));
    return (clienteId: number) => mapa.get(clienteId) ?? null;
  }, [clientes]);

  /** Inverte o status: é como o analista dá baixa depois de consultar a Agência Virtual. */
  const alternarStatusDebito = (debito: Debito) =>
    registrarConsultaDebito(
      debito.cliente.id,
      debito.status === 'ATIVO' ? 'QUITADO' : 'ATIVO',
    );

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modal
  const [debitoSelecionado, setDebitoSelecionado] = useState<Debito | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);

  // Filtering
  const debitosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return debitos.filter(d => {
      const matchTexto =
        d.cliente.nome.toLowerCase().includes(termo) ||
        (d.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        (vendedorDoCliente(d.cliente.id) ?? '').toLowerCase().includes(termo) ||
        (d.cliente.ucCoelba != null && d.cliente.ucCoelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || d.status === filtroStatus;
      return matchTexto && matchStatus;
    });
  }, [debitos, busca, filtroStatus, vendedorDoCliente]);

  // Pagination
  const totalPaginas = Math.ceil(debitosFiltrados.length / itensPorPagina) || 1;
  const debitosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return debitosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [debitosFiltrados, pagina]);

  const getStatusBadge = (status: StatusDebito) => {
    if (status === 'QUITADO') {
      return <Badge variant="success">{ROTULO_STATUS_DEBITO.QUITADO} / Regular</Badge>;
    }
    return <Badge variant="danger">Débito {ROTULO_STATUS_DEBITO.ATIVO}</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Regularizados / Sem Débito</span>
            <div className="text-xl font-semibold text-emerald-700 mt-1">
              {debitos.filter(d => d.status === 'QUITADO').length} clientes
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#149911] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Travados com Débito Ativo</span>
            <div className="text-xl font-semibold text-rose-600 mt-1">
              {debitos.filter(d => d.status === 'ATIVO').length} clientes
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Impacto no Fluxo</span>
            <div className="text-xs text-slate-700 mt-1 font-medium">
              Com débito ativo, a ART <strong>não é protocolada</strong> na Coelba
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
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
            placeholder="Buscar por cliente, cidade, UC Coelba ou vendedor..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2.5">
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="QUITADO">Apenas Quitado (Liberado)</option>
            <option value="ATIVO">Apenas Débito Ativo (Bloqueado)</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <Card
        title="Cache de Status de Débitos Coelba"
        subtitle={`Exibe ${debitosFiltrados.length} clientes monitorados (substitui a antiga aba CLIENTES_DEBITOS)`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">Cliente & Localização</th>
                <th className="py-3 px-4">Vendedor Responsável</th>
                <th className="py-3 px-4">Status no Portal Coelba</th>
                <th className="py-3 px-4">Última Consulta</th>
                <th className="py-3 px-6 text-right">Ação / Baixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {debitosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum registro de débito encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                debitosPaginados.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-800">{d.cliente.nome}</div>
                      <div className="text-[11px] text-[#424342] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {d.cliente.cidade ?? '—'}
                        </span>
                        {d.cliente.ucCoelba && (
                          <span className="text-slate-400">UC: {d.cliente.ucCoelba}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {vendedorDoCliente(d.cliente.id) ?? '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(d.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.ultimaConsultaEm ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => alternarStatusDebito(d).catch(() => {})}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                            d.status === 'ATIVO'
                              ? 'bg-emerald-50 text-[#149911] border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Alternar entre Quitado e Ativo"
                        >
                          {d.status === 'ATIVO' ? 'Dar Baixa (Quitar)' : 'Reabrir Débito'}
                        </button>
                        <button
                          onClick={() => {
                            setDebitoSelecionado(d);
                            setIsModalDetalheAberto(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
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
            Mostrando <span className="font-medium">{debitosPaginados.length}</span> de{' '}
            <span className="font-medium">{debitosFiltrados.length}</span> registros
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

      {/* Modal: Detalhes do Débito */}
      {debitoSelecionado && (
        <Modal
          isOpen={isModalDetalheAberto}
          onClose={() => {
            setIsModalDetalheAberto(false);
            setDebitoSelecionado(null);
          }}
          title={`Consulta de Débito — ${debitoSelecionado.cliente.nome}`}
          subtitle="Consulta realizada na Agência Virtual Coelba / Neoenergia"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await alternarStatusDebito(debitoSelecionado);
                    setIsModalDetalheAberto(false);
                  } catch {
                    /* toast de erro já exibido pelo contexto */
                  }
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
              >
                {debitoSelecionado.status === 'ATIVO'
                  ? 'Confirmar Quitação e Liberar Projeto'
                  : 'Reverter para Débito Ativo'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="font-medium text-slate-800">Dados da Unidade Consumidora (UC)</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{debitoSelecionado.cliente.cidade ?? '—'}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{vendedorDoCliente(debitoSelecionado.cliente.id) ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{debitoSelecionado.cliente.ucCoelba || 'N/A'}</strong></div>
                <div>Última Checagem: <strong className="text-slate-800">{debitoSelecionado.ultimaConsultaEm ?? '—'}</strong></div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
              <div className="font-medium text-slate-700">Status Financeiro</div>
              <div className="flex items-center justify-between">
                <div>{getStatusBadge(debitoSelecionado.status)}</div>
                {debitoSelecionado.status === 'ATIVO' ? (
                  <div className="text-xs text-rose-600 font-medium">
                    Débito em aberto bloqueia o envio da ART
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 font-medium">Nenhum débito em aberto</div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
