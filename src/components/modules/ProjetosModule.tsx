import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Projeto, StatusProjeto, TipoProjeto } from '../../types';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ProjetosModule: React.FC = () => {
  const {
    projetos,
    clientes,
    adicionarProjeto,
    atualizarStatusProjeto,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroAnalista, setFiltroAnalista] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modals
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [isModalReprovaAberto, setIsModalReprovaAberto] = useState(false);
  const [motivoReprovaTexto, setMotivoReprovaTexto] = useState('');

  // Form for New Project
  const [novoClienteId, setNovoClienteId] = useState(clientes[0]?.id || '');
  const [novoTipoProjeto, setNovoTipoProjeto] = useState<TipoProjeto>('PADRAO');
  const [novoAnalista, setNovoAnalista] = useState('Ivan Silva');
  const [novaPotencia, setNovaPotencia] = useState('15.0');
  const [novoDataArt, setNovoDataArt] = useState('');

  // Filtering
  const projetosFiltrados = useMemo(() => {
    return projetos.filter(p => {
      const matchTexto =
        p.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cliente.cidade.toLowerCase().includes(busca.toLowerCase()) ||
        p.analista_responsavel.toLowerCase().includes(busca.toLowerCase()) ||
        (p.cliente.uc_coelba && p.cliente.uc_coelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || p.status === filtroStatus;
      const matchTipo = filtroTipo === 'TODOS' || p.tipo_projeto === filtroTipo;
      const matchAnalista = filtroAnalista === 'TODOS' || p.analista_responsavel === filtroAnalista;

      return matchTexto && matchStatus && matchTipo && matchAnalista;
    });
  }, [projetos, busca, filtroStatus, filtroTipo, filtroAnalista]);

  // Pagination
  const totalPaginas = Math.ceil(projetosFiltrados.length / itensPorPagina) || 1;
  const projetosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return projetosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [projetosFiltrados, pagina]);

  const analistasUnicos = Array.from(new Set(projetos.map(p => p.analista_responsavel)));

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    const cliente = clientes.find(c => c.id === novoClienteId) || clientes[0];
    const hoje = new Date().toISOString().split('T')[0];

    adicionarProjeto({
      cliente_id: cliente.id,
      cliente,
      tipo_projeto: novoTipoProjeto,
      analista_responsavel: novoAnalista,
      potencia_kwp: parseFloat(novaPotencia) || 10,
      data_recebimento: hoje,
      data_art: novoDataArt || hoje,
      data_encaminhado: hoje,
      status: 'ENCAMINHADO',
      motivo_reprova: null,
      data_aprovacao: null,
    });

    setIsModalNovoAberto(false);
  };

  const handleConfirmarReprova = () => {
    if (!projetoSelecionado) return;
    atualizarStatusProjeto(
      projetoSelecionado.id,
      'REPROVADO',
      motivoReprovaTexto || 'Inconformidade técnica indicada no parecer Coelba'
    );
    setIsModalReprovaAberto(false);
    setIsModalDetalheAberto(false);
    setMotivoReprovaTexto('');
  };

  const getStatusBadge = (status: StatusProjeto) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="success">Aprovado Coelba</Badge>;
      case 'REPROVADO':
        return <Badge variant="danger">Reprovado</Badge>;
      case 'REENCAMINHADO':
        return <Badge variant="info">Reencaminhado</Badge>;
      case 'ENCAMINHADO':
      default:
        return <Badge variant="warning">Encaminhado / Em Análise</Badge>;
    }
  };

  const formatTipo = (tipo: TipoProjeto) => {
    switch (tipo) {
      case 'PADRAO':
        return 'Padrão';
      case 'AMPLIACAO':
        return 'Ampliação';
      case 'AUMENTO_POTENCIA':
        return 'Aumento de Potência';
      case 'MUDANCA_INVERSOR':
        return 'Mudança de Inversor';
      case 'UMA_PLACA_A_MAIS':
        return '1 Placa a Mais';
      case 'INVERSORES_SEPARADOS':
        return 'Inversores Separados';
      default:
        return tipo;
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
            placeholder="Buscar por cliente, cidade, analista ou UC..."
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
            <option value="TODOS">Todos Status</option>
            <option value="ENCAMINHADO">Encaminhado</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REPROVADO">Reprovado</option>
            <option value="REENCAMINHADO">Reencaminhado</option>
          </select>

          {/* Project Type Filter */}
          <select
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos os Subtipos</option>
            <option value="PADRAO">Padrão</option>
            <option value="AMPLIACAO">Ampliação</option>
            <option value="AUMENTO_POTENCIA">Aumento de Potência</option>
            <option value="MUDANCA_INVERSOR">Mudança de Inversor</option>
            <option value="UMA_PLACA_A_MAIS">1 Placa a Mais</option>
            <option value="INVERSORES_SEPARADOS">Inversores Separados</option>
          </select>

          {/* Analyst Filter */}
          <select
            value={filtroAnalista}
            onChange={(e) => {
              setFiltroAnalista(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-xs"
          >
            <option value="TODOS">Todos Analistas</option>
            {analistasUnicos.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* New Project CTA */}
          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Projetos em Homologação Coelba"
        subtitle={`Exibe ${projetosFiltrados.length} projetos (unificação das abas Ivan, Larissa, Camila e dos 5 subtipos)`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">Cliente & Localização</th>
                <th className="py-3 px-4">Subtipo & Potência</th>
                <th className="py-3 px-4">Analista Responsável</th>
                <th className="py-3 px-4">Cronograma (Receb. / ART / Envio)</th>
                <th className="py-3 px-4">Status Parecer</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {projetosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum projeto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                projetosPaginados.map(proj => (
                  <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-800">{proj.cliente.nome}</div>
                      <div className="text-[11px] text-[#424342] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {proj.cliente.cidade}
                        </span>
                        {proj.cliente.uc_coelba && (
                          <span className="text-slate-400">UC: {proj.cliente.uc_coelba}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{formatTipo(proj.tipo_projeto)}</div>
                      <div className="text-[11px] text-[#149911] font-medium mt-0.5">
                        {proj.potencia_kwp} kWp
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-medium border border-slate-200">
                          {proj.analista_responsavel.charAt(0)}
                        </div>
                        <span>{proj.analista_responsavel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="text-[11px] space-y-0.5">
                        <div>Recebimento: <span className="text-slate-700">{proj.data_recebimento}</span></div>
                        <div>ART: <span className="text-slate-700">{proj.data_art || 'Pendente'}</span></div>
                        <div>Envio Coelba: <span className="text-slate-700">{proj.data_encaminhado || 'Aguardando'}</span></div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(proj.status)}
                      {proj.status === 'APROVADO' && proj.data_aprovacao && (
                        <div className="text-[10px] text-emerald-700 mt-1">
                          Aprovado em: {proj.data_aprovacao}
                        </div>
                      )}
                      {proj.status === 'REPROVADO' && proj.motivo_reprova && (
                        <div className="text-[10px] text-rose-600 mt-1 line-clamp-1" title={proj.motivo_reprova}>
                          Motivo: {proj.motivo_reprova}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {proj.status !== 'APROVADO' && (
                          <button
                            onClick={() => atualizarStatusProjeto(proj.id, 'APROVADO')}
                            title="Aprovar Projeto (Parecer Positivo)"
                            className="p-1.5 text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {proj.status !== 'REPROVADO' && (
                          <button
                            onClick={() => {
                              setProjetoSelecionado(proj);
                              setIsModalReprovaAberto(true);
                            }}
                            title="Registrar Reprova Coelba"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setProjetoSelecionado(proj);
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
            Mostrando <span className="font-medium">{projetosPaginados.length}</span> de{' '}
            <span className="font-medium">{projetosFiltrados.length}</span> registros
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

      {/* Modal: Detalhes do Projeto */}
      {projetoSelecionado && (
        <Modal
          isOpen={isModalDetalheAberto}
          onClose={() => {
            setIsModalDetalheAberto(false);
            setProjetoSelecionado(null);
          }}
          title={`Projeto — ${projetoSelecionado.cliente.nome}`}
          subtitle={`Subtipo: ${formatTipo(projetoSelecionado.tipo_projeto)} (${projetoSelecionado.potencia_kwp} kWp)`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {projetoSelecionado.status === 'REPROVADO' && (
                <button
                  type="button"
                  onClick={() => {
                    atualizarStatusProjeto(projetoSelecionado.id, 'REENCAMINHADO');
                    setIsModalDetalheAberto(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reencaminhar com Correções
                </button>
              )}
              {projetoSelecionado.status !== 'APROVADO' && (
                <button
                  type="button"
                  onClick={() => {
                    atualizarStatusProjeto(projetoSelecionado.id, 'APROVADO');
                    setIsModalDetalheAberto(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar Projeto
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {/* Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="font-medium text-slate-800">Dados do Projeto & Cliente</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{projetoSelecionado.cliente.cidade}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{projetoSelecionado.cliente.vendedor}</strong></div>
                <div>Analista: <strong className="text-slate-800">{projetoSelecionado.analista_responsavel}</strong></div>
                <div>Potência: <strong className="text-slate-800">{projetoSelecionado.potencia_kwp} kWp</strong></div>
                <div>Data Recebimento: <strong className="text-slate-800">{projetoSelecionado.data_recebimento}</strong></div>
                <div>Data ART: <strong className="text-slate-800">{projetoSelecionado.data_art || 'Pendente'}</strong></div>
                <div>Data Envio Coelba: <strong className="text-slate-800">{projetoSelecionado.data_encaminhado || 'Aguardando'}</strong></div>
                <div>Data Aprovação: <strong className="text-slate-800">{projetoSelecionado.data_aprovacao || '—'}</strong></div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">Status Atual</label>
              <div>{getStatusBadge(projetoSelecionado.status)}</div>
            </div>

            {projetoSelecionado.motivo_reprova && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-medium text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Motivo da Reprova Coelba:
                </div>
                <p className="leading-relaxed">{projetoSelecionado.motivo_reprova}</p>
              </div>
            )}

            <div className="text-[11px] text-[#424342] bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              💡 <strong>Regra de Negócio:</strong> Quando o projeto é <em>APROVADO</em>, ele fica automaticamente elegível para solicitação de vistoria técnica pós-instalação da usina fotovoltaica.
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Registrar Reprova */}
      <Modal
        isOpen={isModalReprovaAberto}
        onClose={() => setIsModalReprovaAberto(false)}
        title="Registrar Reprova Coelba"
        subtitle={`Cliente: ${projetoSelecionado?.cliente.nome}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalReprovaAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarReprova}
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
            >
              Confirmar Reprova
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Informe o motivo exato apontado pela Coelba/Neoenergia para que o analista possa realizar a correção e reencaminhar.
          </p>
          <textarea
            rows={4}
            value={motivoReprovaTexto}
            onChange={(e) => setMotivoReprovaTexto(e.target.value)}
            placeholder="Ex: Divergência entre o diagrama unifilar e a potência informada na ART..."
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:ring-1 focus:ring-rose-500"
            required
          />
        </div>
      </Modal>

      {/* Modal: Novo Projeto */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Cadastrar Novo Projeto de Homologação"
        subtitle="Unifica o registro do projeto eliminando abas duplicadas"
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
              form="form-novo-projeto"
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
            >
              Cadastrar Projeto
            </button>
          </>
        }
      >
        <form id="form-novo-projeto" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Cliente Vinculado
            </label>
            <select
              value={novoClienteId}
              onChange={(e) => setNovoClienteId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
            >
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.cidade} — Vendedor: {c.vendedor})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Subtipo de Projeto
              </label>
              <select
                value={novoTipoProjeto}
                onChange={(e) => setNovoTipoProjeto(e.target.value as TipoProjeto)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                <option value="PADRAO">Padrão</option>
                <option value="AMPLIACAO">Ampliação</option>
                <option value="AUMENTO_POTENCIA">Aumento de Potência</option>
                <option value="MUDANCA_INVERSOR">Mudança de Inversor</option>
                <option value="UMA_PLACA_A_MAIS">Uma Placa a Mais</option>
                <option value="INVERSORES_SEPARADOS">Inversores Separados</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Analista Responsável
              </label>
              <select
                value={novoAnalista}
                onChange={(e) => setNovoAnalista(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                <option value="Ivan Silva">Ivan Silva</option>
                <option value="Larissa Moura">Larissa Moura</option>
                <option value="Camila Bastos">Camila Bastos</option>
                <option value="Igor Rocha">Igor Rocha</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Potência Calculada (kWp)
              </label>
              <input
                type="number"
                step="0.1"
                value={novaPotencia}
                onChange={(e) => setNovaPotencia(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
                required
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Data Emissão ART (Opcional)
              </label>
              <input
                type="date"
                value={novoDataArt}
                onChange={(e) => setNovoDataArt(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
