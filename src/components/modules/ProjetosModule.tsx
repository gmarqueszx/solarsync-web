import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { projetosApi } from '../../api/recursos';
import {
  Projeto,
  ProjetoLista,
  ROTULO_STATUS_PROJETO,
  ROTULO_TIPO_PROJETO,
  StatusProjeto,
  TipoProjeto,
} from '../../types';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  CalendarCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/** Estados em que a Coelba já recebeu o projeto e pode emitir parecer. */
const EM_ANALISE: StatusProjeto[] = ['ENCAMINHADO', 'REENCAMINHADO'];
/** Estados anteriores ao protocolo: ainda dá para encaminhar. */
const ANTES_DO_ENVIO: StatusProjeto[] = ['RECEBIDO', 'AGUARDANDO_ENVIO'];

const hojeISO = () => new Date().toISOString().split('T')[0];

export const ProjetosModule: React.FC = () => {
  const {
    projetos,
    clientes,
    usuarios,
    criarProjeto,
    aguardarEnvioProjeto,
    encaminharProjeto,
    reencaminharProjeto,
    aprovarProjeto,
    reprovarProjeto,
    registrarInstalacao,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroAnalista, setFiltroAnalista] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Modals
  const [projetoSelecionado, setProjetoSelecionado] = useState<ProjetoLista | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [isModalReprovaAberto, setIsModalReprovaAberto] = useState(false);
  const [motivoReprovaTexto, setMotivoReprovaTexto] = useState('');
  const [isModalEncaminharAberto, setIsModalEncaminharAberto] = useState(false);
  const [dataArtEnvio, setDataArtEnvio] = useState('');
  const [isModalInstalacaoAberto, setIsModalInstalacaoAberto] = useState(false);
  const [dataInstalacaoTexto, setDataInstalacaoTexto] = useState(hojeISO());

  /**
   * A listagem é enxuta (não traz data da ART nem motivo da reprova). O detalhe completo é
   * buscado ao abrir o modal, que é onde o analista precisa desses dois campos.
   */
  const [detalhe, setDetalhe] = useState<Projeto | null>(null);
  useEffect(() => {
    if (!projetoSelecionado) {
      setDetalhe(null);
      return;
    }
    let cancelado = false;
    projetosApi
      .buscar(projetoSelecionado.id)
      .then(p => {
        if (!cancelado) setDetalhe(p);
      })
      .catch(() => {
        /* o modal segue mostrando o que a listagem já tem */
      });
    return () => {
      cancelado = true;
    };
  }, [projetoSelecionado]);

  // Form for New Project
  const [novoClienteId, setNovoClienteId] = useState<number | ''>('');
  const [novoTipoProjeto, setNovoTipoProjeto] = useState<TipoProjeto>('PADRAO');
  const [novoAnalistaId, setNovoAnalistaId] = useState<number | ''>('');
  const [novaPotencia, setNovaPotencia] = useState('15.0');

  // Listas chegam da API depois da primeira renderização: sincroniza os padrões dos seletores.
  useEffect(() => {
    setNovoClienteId(atual => (atual === '' && clientes.length > 0 ? clientes[0].id : atual));
  }, [clientes]);

  // Filtering
  const projetosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return projetos.filter(p => {
      const matchTexto =
        p.cliente.nome.toLowerCase().includes(termo) ||
        (p.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        (p.analistaResponsavel?.nome ?? '').toLowerCase().includes(termo) ||
        (p.cliente.ucCoelba != null && p.cliente.ucCoelba.includes(busca));

      const matchStatus = filtroStatus === 'TODOS' || p.status === filtroStatus;
      const matchTipo = filtroTipo === 'TODOS' || p.tipoProjeto === filtroTipo;
      const matchAnalista =
        filtroAnalista === 'TODOS' || String(p.analistaResponsavel?.id ?? '') === filtroAnalista;

      return matchTexto && matchStatus && matchTipo && matchAnalista;
    });
  }, [projetos, busca, filtroStatus, filtroTipo, filtroAnalista]);

  // Pagination
  const totalPaginas = Math.ceil(projetosFiltrados.length / itensPorPagina) || 1;
  const projetosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return projetosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [projetosFiltrados, pagina]);

  const analistasUnicos = useMemo(() => {
    const mapa = new Map<number, string>();
    projetos.forEach(p => {
      if (p.analistaResponsavel) mapa.set(p.analistaResponsavel.id, p.analistaResponsavel.nome);
    });
    return Array.from(mapa, ([id, nome]) => ({ id, nome }));
  }, [projetos]);

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoClienteId === '') return;

    try {
      await criarProjeto({
        clienteId: novoClienteId,
        tipoProjeto: novoTipoProjeto,
        analistaResponsavelId: novoAnalistaId === '' ? null : novoAnalistaId,
        potenciaKwp: parseFloat(novaPotencia) || null,
      });
      setIsModalNovoAberto(false);
    } catch {
      // O AppContext já mostrou o motivo da recusa; o modal fica aberto para correção.
    }
  };

  const handleConfirmarReprova = async () => {
    if (!projetoSelecionado || !motivoReprovaTexto.trim()) return;
    try {
      await reprovarProjeto(projetoSelecionado.id, motivoReprovaTexto.trim());
      setIsModalReprovaAberto(false);
      setIsModalDetalheAberto(false);
      setMotivoReprovaTexto('');
    } catch {
      /* toast de erro já exibido pelo contexto */
    }
  };

  const handleConfirmarEncaminhamento = async () => {
    if (!projetoSelecionado) return;
    try {
      await encaminharProjeto(projetoSelecionado.id, dataArtEnvio || null);
      setIsModalEncaminharAberto(false);
      setIsModalDetalheAberto(false);
      setDataArtEnvio('');
    } catch {
      /* débito ativo do cliente cai aqui: o toast do contexto explica */
    }
  };

  const handleConfirmarInstalacao = async () => {
    if (!projetoSelecionado || !dataInstalacaoTexto) return;
    try {
      await registrarInstalacao(projetoSelecionado.id, dataInstalacaoTexto);
      setIsModalInstalacaoAberto(false);
      setIsModalDetalheAberto(false);
    } catch {
      /* toast de erro já exibido pelo contexto */
    }
  };

  const getStatusBadge = (status: StatusProjeto) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="success">Aprovado Coelba</Badge>;
      case 'REPROVADO':
        return <Badge variant="danger">{ROTULO_STATUS_PROJETO.REPROVADO}</Badge>;
      case 'REENCAMINHADO':
        return <Badge variant="info">{ROTULO_STATUS_PROJETO.REENCAMINHADO}</Badge>;
      case 'RECEBIDO':
        return <Badge variant="neutral">{ROTULO_STATUS_PROJETO.RECEBIDO}</Badge>;
      case 'AGUARDANDO_ENVIO':
        return <Badge variant="warning">{ROTULO_STATUS_PROJETO.AGUARDANDO_ENVIO}</Badge>;
      case 'ENCAMINHADO':
      default:
        return <Badge variant="warning">Encaminhado / Em Análise</Badge>;
    }
  };

  const formatTipo = (tipo: TipoProjeto) => ROTULO_TIPO_PROJETO[tipo];

  const formatPotencia = (potencia: number | null) =>
    potencia !== null ? `${potencia} kWp` : 'Potência não informada';

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
            {(Object.keys(ROTULO_STATUS_PROJETO) as StatusProjeto[]).map(status => (
              <option key={status} value={status}>
                {ROTULO_STATUS_PROJETO[status]}
              </option>
            ))}
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
            {(Object.keys(ROTULO_TIPO_PROJETO) as TipoProjeto[]).map(tipo => (
              <option key={tipo} value={tipo}>
                {ROTULO_TIPO_PROJETO[tipo]}
              </option>
            ))}
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
              <option key={a.id} value={String(a.id)}>
                {a.nome}
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
                <th className="py-3 px-4">Cronograma (Receb. / Envio / Instalação)</th>
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
                          {proj.cliente.cidade ?? '—'}
                        </span>
                        {proj.cliente.ucCoelba && (
                          <span className="text-slate-400">UC: {proj.cliente.ucCoelba}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{formatTipo(proj.tipoProjeto)}</div>
                      <div className="text-[11px] text-[#149911] font-medium mt-0.5">
                        {formatPotencia(proj.potenciaKwp)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-medium border border-slate-200">
                          {(proj.analistaResponsavel?.nome ?? '—').charAt(0)}
                        </div>
                        <span>{proj.analistaResponsavel?.nome ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="text-[11px] space-y-0.5">
                        <div>Recebimento: <span className="text-slate-700">{proj.dataRecebimento ?? '—'}</span></div>
                        <div>Envio Coelba: <span className="text-slate-700">{proj.dataEncaminhado || 'Aguardando'}</span></div>
                        <div>Instalação: <span className="text-slate-700">{proj.dataInstalacao || 'Não registrada'}</span></div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(proj.status)}
                      {proj.status === 'APROVADO' && proj.dataAprovacao && (
                        <div className="text-[10px] text-emerald-700 mt-1">
                          Aprovado em: {proj.dataAprovacao}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {/* Só as transições que a máquina de estados do backend aceita. */}
                      <div className="flex items-center justify-end gap-1">
                        {ANTES_DO_ENVIO.includes(proj.status) && (
                          <button
                            onClick={() => {
                              setProjetoSelecionado(proj);
                              setDataArtEnvio('');
                              setIsModalEncaminharAberto(true);
                            }}
                            title="Encaminhar Projeto à Coelba"
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {EM_ANALISE.includes(proj.status) && (
                          <>
                            <button
                              onClick={() => aprovarProjeto(proj.id).catch(() => {})}
                              title="Aprovar Projeto (Parecer Positivo)"
                              className="p-1.5 text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
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
                          </>
                        )}
                        {proj.status === 'REPROVADO' && (
                          <button
                            onClick={() => reencaminharProjeto(proj.id).catch(() => {})}
                            title="Reencaminhar com Correções"
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {proj.status === 'APROVADO' && !proj.dataInstalacao && (
                          <button
                            onClick={() => {
                              setProjetoSelecionado(proj);
                              setDataInstalacaoTexto(hojeISO());
                              setIsModalInstalacaoAberto(true);
                            }}
                            title="Registrar Instalação (libera a vistoria)"
                            className="p-1.5 text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CalendarCheck className="w-4 h-4" />
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
          subtitle={`Subtipo: ${formatTipo(projetoSelecionado.tipoProjeto)} (${formatPotencia(projetoSelecionado.potenciaKwp)})`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalDetalheAberto(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {projetoSelecionado.status === 'RECEBIDO' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await aguardarEnvioProjeto(projetoSelecionado.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Marcar como Aguardando Envio
                </button>
              )}
              {ANTES_DO_ENVIO.includes(projetoSelecionado.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setDataArtEnvio('');
                    setIsModalEncaminharAberto(true);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Encaminhar à Coelba
                </button>
              )}
              {projetoSelecionado.status === 'REPROVADO' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await reencaminharProjeto(projetoSelecionado.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reencaminhar com Correções
                </button>
              )}
              {EM_ANALISE.includes(projetoSelecionado.status) && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await aprovarProjeto(projetoSelecionado.id);
                      setIsModalDetalheAberto(false);
                    } catch {
                      /* toast de erro já exibido pelo contexto */
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar Projeto
                </button>
              )}
              {projetoSelecionado.status === 'APROVADO' && !projetoSelecionado.dataInstalacao && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInstalacaoTexto(hojeISO());
                    setIsModalInstalacaoAberto(true);
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Registrar Instalação
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
                <div>Cidade: <strong className="text-slate-800">{projetoSelecionado.cliente.cidade ?? '—'}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{projetoSelecionado.cliente.vendedor ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{projetoSelecionado.cliente.ucCoelba || 'N/A'}</strong></div>
                <div>Analista: <strong className="text-slate-800">{projetoSelecionado.analistaResponsavel?.nome ?? '—'}</strong></div>
                <div>Potência: <strong className="text-slate-800">{formatPotencia(projetoSelecionado.potenciaKwp)}</strong></div>
                <div>Data Recebimento: <strong className="text-slate-800">{projetoSelecionado.dataRecebimento ?? '—'}</strong></div>
                <div>Data ART: <strong className="text-slate-800">{detalhe?.dataArt || 'Pendente'}</strong></div>
                <div>Data Envio Coelba: <strong className="text-slate-800">{projetoSelecionado.dataEncaminhado || 'Aguardando'}</strong></div>
                <div>Data Aprovação: <strong className="text-slate-800">{projetoSelecionado.dataAprovacao || '—'}</strong></div>
                <div>Data Instalação: <strong className="text-slate-800">{projetoSelecionado.dataInstalacao || 'Não registrada'}</strong></div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">Status Atual</label>
              <div>{getStatusBadge(projetoSelecionado.status)}</div>
            </div>

            {detalhe?.motivoReprova && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-medium text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Motivo da Reprova Coelba:
                </div>
                <p className="leading-relaxed">{detalhe.motivoReprova}</p>
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
        subtitle={`Cliente: ${projetoSelecionado?.cliente.nome ?? ''}`}
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

      {/* Modal: Encaminhar à Coelba */}
      <Modal
        isOpen={isModalEncaminharAberto}
        onClose={() => setIsModalEncaminharAberto(false)}
        title="Encaminhar Projeto à Coelba"
        subtitle={`Cliente: ${projetoSelecionado?.cliente.nome ?? ''}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalEncaminharAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarEncaminhamento}
              className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs"
            >
              Confirmar Envio
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            O protocolo só é aceito com o cliente sem débito em aberto na Coelba. Informe a data de emissão da ART, se já houver.
          </p>
          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Data Emissão ART (Opcional)
            </label>
            <input
              type="date"
              value={dataArtEnvio}
              onChange={(e) => setDataArtEnvio(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Registrar Instalação */}
      <Modal
        isOpen={isModalInstalacaoAberto}
        onClose={() => setIsModalInstalacaoAberto(false)}
        title="Registrar Instalação da Usina"
        subtitle={`Cliente: ${projetoSelecionado?.cliente.nome ?? ''}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalInstalacaoAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarInstalacao}
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-xs"
            >
              Registrar Instalação
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            A data de instalação é o que libera a solicitação de vistoria técnica junto à Coelba.
          </p>
          <div>
            <label className="font-medium text-slate-700 block mb-1">Data da Instalação</label>
            <input
              type="date"
              value={dataInstalacaoTexto}
              onChange={(e) => setDataInstalacaoTexto(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              required
            />
          </div>
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
                Subtipo de Projeto
              </label>
              <select
                value={novoTipoProjeto}
                onChange={(e) => setNovoTipoProjeto(e.target.value as TipoProjeto)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                {(Object.keys(ROTULO_TIPO_PROJETO) as TipoProjeto[]).map(tipo => (
                  <option key={tipo} value={tipo}>
                    {ROTULO_TIPO_PROJETO[tipo]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Analista Responsável
              </label>
              <select
                value={novoAnalistaId}
                onChange={(e) =>
                  setNovoAnalistaId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                <option value="">Sem analista definido</option>
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
        </form>
      </Modal>
    </div>
  );
};
