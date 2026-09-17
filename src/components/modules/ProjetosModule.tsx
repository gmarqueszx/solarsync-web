import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { projetosApi } from '../../api/recursos';
import {
  Cliente,
  Projeto,
  ProjetoLista,
  ROTULO_STATUS_PROJETO,
  ROTULO_TIPO_PROJETO,
  StatusProjeto,
  TipoProjeto,
  TIPOS_PROJETO,
} from '../../types';
import { formatarData } from '../../utils/data';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ClienteModal } from '../common/ClienteModal';
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Hash,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { useOrdenacao } from '../../hooks/useOrdenacao';
import { Ordenavel } from '../ui/Tabela';

/** Estados em que a Coelba já recebeu o projeto e pode emitir parecer. */
const EM_ANALISE: StatusProjeto[] = ['ENCAMINHADO', 'REENCAMINHADO'];
/** Estados anteriores ao protocolo: ainda dá para encaminhar. */
const ANTES_DO_ENVIO: StatusProjeto[] = ['RECEBIDO', 'AGUARDANDO_ENVIO'];

/** Ordem do fluxo, não alfabética: ordenar por status tem de andar com o processo. */
const PESO_STATUS: Record<StatusProjeto, number> = {
  RECEBIDO: 0,
  AGUARDANDO_ENVIO: 1,
  ENCAMINHADO: 2,
  REPROVADO: 3,
  REENCAMINHADO: 4,
  APROVADO: 5,
};

const VALORES_ORDENAVEIS = {
  cliente: (p: ProjetoLista) => p.cliente.nome,
  tipo: (p: ProjetoLista) => ROTULO_TIPO_PROJETO[p.tipoProjeto],
  numeroSolicitacao: (p: ProjetoLista) => p.numeroSolicitacao,
  analista: (p: ProjetoLista) => p.analistaResponsavel?.nome ?? null,
  cronograma: (p: ProjetoLista) => p.dataRecebimento,
  status: (p: ProjetoLista) => PESO_STATUS[p.status],
};

type ColunaProjeto = keyof typeof VALORES_ORDENAVEIS;

export const ProjetosModule: React.FC = () => {
  const {
    projetos,
    clientes,
    debitos,
    usuarios,
    criarProjeto,
    aguardarEnvioProjeto,
    encaminharProjeto,
    reencaminharProjeto,
    aprovarProjeto,
    reprovarProjeto,
  } = useApp();

  /**
   * Por que o envio à Coelba será recusado, se for o caso. Espelha as duas guardas do
   * `ProjetoService`: `SEM_CONSULTA` pede a consulta do débito de homologação (o passo do
   * projetista ao receber o cliente), `DEBITO_ATIVO` pede a cobrança. Antecipar aqui evita a
   * analista descobrir o motivo só depois de clicar em enviar.
   */
  const bloqueioDoEnvio = useMemo(() => {
    const statusPorCliente = new Map(
      debitos.filter(d => d.tipo === 'HOMOLOGACAO').map(d => [d.cliente.id, d.status]),
    );
    return (clienteId: number): 'SEM_CONSULTA' | 'DEBITO_ATIVO' | null => {
      const status = statusPorCliente.get(clienteId);
      if (status === undefined) return 'SEM_CONSULTA';
      return status === 'ATIVO' ? 'DEBITO_ATIVO' : null;
    };
  }, [debitos]);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroAnalista, setFiltroAnalista] = useState<string>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 6;

  // Abre pelo mais antigo em recebimento: é o projeto parado que atrasa o cliente.
  const { ordenacao, ordenar, cabecalho } = useOrdenacao<ProjetoLista, ColunaProjeto>(
    VALORES_ORDENAVEIS,
    { campo: 'cronograma', direcao: 'asc' },
  );

  // Modals
  const [projetoSelecionado, setProjetoSelecionado] = useState<ProjetoLista | null>(null);
  const [isModalDetalheAberto, setIsModalDetalheAberto] = useState(false);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [isModalReprovaAberto, setIsModalReprovaAberto] = useState(false);
  const [motivoReprovaTexto, setMotivoReprovaTexto] = useState('');
  const [isModalEncaminharAberto, setIsModalEncaminharAberto] = useState(false);
  const [modoEnvio, setModoEnvio] = useState<'ENCAMINHAR' | 'REENCAMINHAR'>('ENCAMINHAR');
  const [dataArtEnvio, setDataArtEnvio] = useState('');
  const [numeroSolicitacaoEnvio, setNumeroSolicitacaoEnvio] = useState('');

  // Edição e cadastro de cliente diretamente pelo módulo de projetos
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
  const [isModalClienteAberto, setIsModalClienteAberto] = useState(false);

  const abrirCriacaoCliente = () => {
    setClienteParaEditar(null);
    setIsModalClienteAberto(true);
  };

  const abrirEdicaoClientePorId = (clienteId: number) => {
    const c = clientes.find((item) => item.id === clienteId);
    if (c) {
      setClienteParaEditar(c);
      setIsModalClienteAberto(true);
    }
  };

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
  const [novoTipoProjeto, setNovoTipoProjeto] = useState<TipoProjeto>('PROJETO_INICIAL');
  const [novoAnalistaId, setNovoAnalistaId] = useState<number | ''>('');
  const [novaPotencia, setNovaPotencia] = useState('15.0');

  // Listas chegam da API depois da primeira renderização: sincroniza os padrões dos seletores.
  useEffect(() => {
    setNovoClienteId(atual => (atual === '' && clientes.length > 0 ? clientes[0].id : atual));
  }, [clientes]);

  // Filtering
  const projetosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return ordenar(projetos.filter(p => {
      const matchTexto =
        p.cliente.nome.toLowerCase().includes(termo) ||
        (p.cliente.cidade ?? '').toLowerCase().includes(termo) ||
        (p.analistaResponsavel?.nome ?? '').toLowerCase().includes(termo) ||
        (p.cliente.ucCoelba ?? '').toLowerCase().includes(termo) ||
        // Quando o retorno da Coelba chega, o analista tem o número em mãos, não o nome.
        (p.numeroSolicitacao ?? '').toLowerCase().includes(termo);

      const matchStatus = filtroStatus === 'TODOS' || p.status === filtroStatus;
      const matchTipo = filtroTipo === 'TODOS' || p.tipoProjeto === filtroTipo;
      const matchAnalista =
        filtroAnalista === 'TODOS' || String(p.analistaResponsavel?.id ?? '') === filtroAnalista;

      return matchTexto && matchStatus && matchTipo && matchAnalista;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetos, busca, filtroStatus, filtroTipo, filtroAnalista, ordenacao]);

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

  /** Abre o modal de envio, seja o primeiro (`ENCAMINHAR`) ou o reenvio após reprova. */
  const abrirModalEnvio = (
    projeto: ProjetoLista,
    modo: 'ENCAMINHAR' | 'REENCAMINHAR',
  ) => {
    setProjetoSelecionado(projeto);
    setModoEnvio(modo);
    setDataArtEnvio('');
    // No reenvio, parte do número atual: a Coelba costuma manter, mas às vezes emite outro.
    setNumeroSolicitacaoEnvio(modo === 'REENCAMINHAR' ? projeto.numeroSolicitacao ?? '' : '');
    setIsModalEncaminharAberto(true);
  };

  const handleConfirmarEncaminhamento = async () => {
    if (!projetoSelecionado) return;
    const numero = numeroSolicitacaoEnvio.trim() || null;
    try {
      if (modoEnvio === 'REENCAMINHAR') {
        await reencaminharProjeto(projetoSelecionado.id, numero);
      } else {
        await encaminharProjeto(projetoSelecionado.id, dataArtEnvio || null, numero);
      }
      setIsModalEncaminharAberto(false);
      setIsModalDetalheAberto(false);
      setDataArtEnvio('');
      setNumeroSolicitacaoEnvio('');
    } catch {
      /* débito ativo ou não consultado caem aqui: o toast do contexto explica qual foi */
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
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-sm"
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
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todos Status</option>
            {(Object.keys(ROTULO_STATUS_PROJETO) as StatusProjeto[]).map(status => (
              <option key={status} value={status}>
                {ROTULO_STATUS_PROJETO[status]}
              </option>
            ))}
          </select>

          {/* Tipo de projeto: são só três na operação real. */}
          <select
            value={filtroTipo}
            onChange={(e) => {
              setFiltroTipo(e.target.value);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todos os Tipos</option>
            {TIPOS_PROJETO.map(tipo => (
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
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todos Analistas</option>
            {analistasUnicos.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.nome}
              </option>
            ))}
          </select>

          {/* New Client CTA */}
          <button
            onClick={abrirCriacaoCliente}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-[#149911]" />
            <span>Novo Cliente</span>
          </button>

          {/* New Project CTA */}
          <button
            onClick={() => setIsModalNovoAberto(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Projetos em Homologação"
        subtitle={`${projetosFiltrados.length} projetos no recorte atual`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">
                  <Ordenavel {...cabecalho('cliente')}>Cliente &amp; Localização</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('tipo')}>Tipo &amp; Potência</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('numeroSolicitacao')}>Nº Solicitação</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('analista')}>Analista Responsável</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('cronograma')}>Cronograma (Receb. / Envio)</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('status')}>Status Parecer</Ordenavel>
                </th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {projetosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum projeto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                projetosPaginados.map(proj => (
                  <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-medium text-slate-800">{proj.cliente.nome}</span>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoClientePorId(proj.cliente.id)}
                          title="Editar dados cadastrais do cliente"
                          className="p-1 text-slate-400 hover:text-[#149911] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                      {proj.numeroSolicitacao ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-800 tabular-nums">
                          <Hash className="w-3 h-3 text-slate-400" />
                          {proj.numeroSolicitacao}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
                      <div className="text-[11px] space-y-1">
                        <div>Recebimento: <span className="text-slate-700">{formatarData(proj.dataRecebimento)}</span></div>
                        <div>
                          Envio Coelba:{' '}
                          <span className="text-slate-700">
                            {proj.dataEncaminhado ? formatarData(proj.dataEncaminhado) : 'Aguardando'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(proj.status)}
                      {proj.status === 'APROVADO' && proj.dataAprovacao && (
                        <div className="text-[10px] text-emerald-700 mt-1">
                          Aprovado em {formatarData(proj.dataAprovacao)}
                        </div>
                      )}
                      {/* A instalação é registrada na etapa de Vistoria, não aqui. */}
                      {proj.status === 'APROVADO' && !proj.dataInstalacao && (
                        <div className="text-[10px] text-amber-700 mt-1">
                          Na fila da vistoria
                        </div>
                      )}
                      {/* O que vai barrar o envio, antes de o analista tentar. */}
                      {[...ANTES_DO_ENVIO, 'REPROVADO'].includes(proj.status)
                        && bloqueioDoEnvio(proj.cliente.id) !== null && (
                          <div className="mt-1">
                            {bloqueioDoEnvio(proj.cliente.id) === 'SEM_CONSULTA' ? (
                              <span className="text-[10px] text-sky-700">
                                Falta consultar o débito de homologação
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-700">
                                Travado por débito de homologação
                              </span>
                            )}
                          </div>
                        )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {/* Só as transições que a máquina de estados do backend aceita. */}
                      <div className="flex items-center justify-end gap-1">
                        {ANTES_DO_ENVIO.includes(proj.status) && (
                          <button
                            onClick={() => abrirModalEnvio(proj, 'ENCAMINHAR')}
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
                            onClick={() => abrirModalEnvio(proj, 'REENCAMINHAR')}
                            title="Reencaminhar com Correções"
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
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
                  onClick={() => abrirModalEnvio(projetoSelecionado, 'ENCAMINHAR')}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Encaminhar à Coelba
                </button>
              )}
              {projetoSelecionado.status === 'REPROVADO' && (
                <button
                  type="button"
                  onClick={() => abrirModalEnvio(projetoSelecionado, 'REENCAMINHAR')}
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
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
                  className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
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
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">Dados do Projeto & Cliente</span>
                <button
                  type="button"
                  onClick={() => abrirEdicaoClientePorId(projetoSelecionado.cliente.id)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#149911] hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Cadastro do Cliente
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Cidade: <strong className="text-slate-800">{projetoSelecionado.cliente.cidade ?? '—'}</strong></div>
                <div>Vendedor: <strong className="text-slate-800">{projetoSelecionado.cliente.vendedor ?? '—'}</strong></div>
                <div>UC Coelba: <strong className="text-slate-800">{projetoSelecionado.cliente.ucCoelba || 'N/A'}</strong></div>
                <div>Analista: <strong className="text-slate-800">{projetoSelecionado.analistaResponsavel?.nome ?? '—'}</strong></div>
                <div>Potência: <strong className="text-slate-800">{formatPotencia(projetoSelecionado.potenciaKwp)}</strong></div>
                <div>Nº Solicitação: <strong className="text-slate-800">{projetoSelecionado.numeroSolicitacao || 'Ainda não emitido'}</strong></div>
                <div>Data Recebimento: <strong className="text-slate-800">{formatarData(projetoSelecionado.dataRecebimento)}</strong></div>
                <div>Data ART: <strong className="text-slate-800">{detalhe?.dataArt ? formatarData(detalhe.dataArt) : 'Pendente'}</strong></div>
                <div>Data Envio Coelba: <strong className="text-slate-800">{projetoSelecionado.dataEncaminhado ? formatarData(projetoSelecionado.dataEncaminhado) : 'Aguardando'}</strong></div>
                <div>Data Aprovação: <strong className="text-slate-800">{formatarData(projetoSelecionado.dataAprovacao)}</strong></div>
                <div>Data Instalação: <strong className="text-slate-800">{projetoSelecionado.dataInstalacao ? formatarData(projetoSelecionado.dataInstalacao) : 'Registrada na etapa de vistoria'}</strong></div>
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
              💡 <strong>Depois daqui:</strong> aprovado, o projeto entra na fila{' '}
              <em>Aguardando vistoria</em> do módulo de Vistoria. É lá que se registra a data de
              instalação da usina e se solicita a vistoria — quem homologa não preenche instalação.
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
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
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

      {/* Modal: Encaminhar / Reencaminhar à Coelba */}
      <Modal
        isOpen={isModalEncaminharAberto}
        onClose={() => setIsModalEncaminharAberto(false)}
        title={
          modoEnvio === 'REENCAMINHAR'
            ? 'Reencaminhar Projeto Corrigido'
            : 'Encaminhar Projeto à Coelba'
        }
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
              className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              Confirmar Envio
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            O envio exige a <strong>consulta de débito de homologação</strong> registrada e sem
            débito em aberto — é o passo que o projetista faz ao receber o cliente.
          </p>

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Nº da Solicitação na Coelba
            </label>
            <input
              type="text"
              maxLength={50}
              value={numeroSolicitacaoEnvio}
              onChange={(e) => setNumeroSolicitacaoEnvio(e.target.value)}
              placeholder="Ex: 2026-COE-004781"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
            />
            <p className="text-[11px] text-[#424342] mt-1">
              É o número que a Coelba devolve ao receber o projeto. Guardá-lo aqui é o que vai
              permitir casar o e-mail diário de status com este registro.
              {modoEnvio === 'REENCAMINHAR' && ' Em branco, mantém o número atual.'}
            </p>
          </div>

          {modoEnvio === 'ENCAMINHAR' && (
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
          )}
        </div>
      </Modal>

      {/* Modal: Novo Projeto */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Cadastrar Novo Projeto de Homologação"
        subtitle="O projeto do cliente, do recebimento ao envio à concessionária"
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
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm"
            >
              Cadastrar Projeto
            </button>
          </>
        }
      >
        <form id="form-novo-projeto" onSubmit={handleSalvarNovo} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700">
                Cliente Vinculado
              </label>
              <button
                type="button"
                onClick={abrirCriacaoCliente}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#149911] hover:underline"
              >
                <Plus className="w-3 h-3" />
                Cadastrar novo cliente
              </button>
            </div>
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
                Tipo de Projeto
              </label>
              <select
                value={novoTipoProjeto}
                onChange={(e) => setNovoTipoProjeto(e.target.value as TipoProjeto)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-1 focus:ring-[#149911]"
              >
                {TIPOS_PROJETO.map(tipo => (
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

      {/* Modal: Cadastro e Edição de Cliente */}
      <ClienteModal
        isOpen={isModalClienteAberto}
        onClose={() => setIsModalClienteAberto(false)}
        clienteEmEdicao={clienteParaEditar}
      />
    </div>
  );
};
