import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cliente,
  ROTULO_STATUS_TRIAGEM,
  ROTULO_TIPO_DEBITO,
  ROTULO_TIPO_PENDENCIA,
  StatusDebito,
  StatusTriagem,
  TIPOS_DEBITO,
  TipoDebito,
  TipoPendencia,
} from '../../types';
import { formatarData } from '../../utils/data';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ClienteModal } from '../common/ClienteModal';
import {
  Search,
  Plus,
  Users,
  Zap,
  SearchCheck,
  CreditCard,
  MapPin,
  Phone,
  Pencil,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useOrdenacao } from '../../hooks/useOrdenacao';
import { Ordenavel } from '../ui/Tabela';

/** Campo vazio no formulário vira `null` no corpo da requisição, não string vazia. */
const ouNulo = (valor: string): string | null => (valor.trim() === '' ? null : valor);

type Filtro =
  | 'TODOS'
  | 'AGUARDANDO_VERIFICACAO'
  | 'COM_PENDENCIA'
  | 'SEM_PENDENCIA'
  | 'FALTA_CONSULTAR_DEBITO'
  | 'SEM_UC'
  | 'SEM_DATA_PAGAMENTO';

const VARIANTE_TRIAGEM: Record<StatusTriagem, 'warning' | 'danger' | 'success'> = {
  AGUARDANDO_VERIFICACAO: 'warning',
  COM_PENDENCIA: 'danger',
  SEM_PENDENCIA: 'success',
};

/** "Falta checar" primeiro: é a fila de trabalho, não a ordem alfabética do enum. */
const PESO_TRIAGEM: Record<StatusTriagem, number> = {
  AGUARDANDO_VERIFICACAO: 0,
  COM_PENDENCIA: 1,
  SEM_PENDENCIA: 2,
};

const VALORES_ORDENAVEIS = {
  cliente: (c: Cliente) => c.nome,
  cidade: (c: Cliente) => c.cidade,
  vendedor: (c: Cliente) => c.vendedor,
  pagamento: (c: Cliente) => c.dataPagamento,
  contato: (c: Cliente) => c.telefone,
  triagem: (c: Cliente) => PESO_TRIAGEM[c.statusTriagem],
};

type ColunaCliente = keyof typeof VALORES_ORDENAVEIS;

/**
 * Cadastro de clientes e triagem da etapa 1 — a entrada do fluxo. Todos os outros módulos
 * pedem um `clienteId`, e até esta tela existir não havia como criar o primeiro: a interface só
 * funcionava com os dados de exemplo do backend.
 *
 * É também onde a checagem de pendência na Coelba é registrada. "Este cliente não tem
 * pendência" precisa ser um fato marcado por alguém, senão não se distingue de "ninguém olhou
 * ainda" — e é o segundo que se perde de vista.
 */
export const ClientesModule: React.FC = () => {
  const {
    clientes,
    usuarios,
    pendencias,
    debitos,
    projetos,
    unificacoes,
    marcarSemPendencia,
    reverificarCliente,
    criarPendencia,
    registrarConsultaDebito,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 8;

  // Abre pela fila da triagem: quem ninguém checou ainda é o que esta tela existe para pegar.
  const { ordenacao, ordenar, cabecalho } = useOrdenacao<Cliente, ColunaCliente>(
    VALORES_ORDENAVEIS,
    { campo: 'triagem', direcao: 'asc' },
  );

  const [isModalAberto, setIsModalAberto] = useState(false);
  /** Nulo = criação; preenchido = edição do cadastro daquele cliente. */
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);

  // Modal: Apontar pendência na Coelba diretamente da triagem
  const [isModalPendenciaAberto, setIsModalPendenciaAberto] = useState(false);
  const [clienteParaPendencia, setClienteParaPendencia] = useState<Cliente | null>(null);
  const [tipoPendencia, setTipoPendencia] = useState<TipoPendencia>('TROCA_TITULARIDADE');
  const [responsavelId, setResponsavelId] = useState<number | ''>('');
  const [observacaoPendencia, setObservacaoPendencia] = useState('');
  const [salvandoPendencia, setSalvandoPendencia] = useState(false);

  // Modal: Registrar consulta de débito diretamente da triagem
  const [isModalDebitoAberto, setIsModalDebitoAberto] = useState(false);
  const [clienteParaDebito, setClienteParaDebito] = useState<Cliente | null>(null);
  const [tipoDebitoForm, setTipoDebitoForm] = useState<TipoDebito>('HOMOLOGACAO');
  const [statusDebitoForm, setStatusDebitoForm] = useState<StatusDebito>('QUITADO');
  const [salvandoDebito, setSalvandoDebito] = useState(false);

  const abrirCriacao = () => {
    setClienteEmEdicao(null);
    setIsModalAberto(true);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setClienteEmEdicao(cliente);
    setIsModalAberto(true);
  };

  const abrirModalPendencia = (cliente: Cliente) => {
    setClienteParaPendencia(cliente);
    setTipoPendencia('TROCA_TITULARIDADE');
    setResponsavelId('');
    setObservacaoPendencia('');
    setIsModalPendenciaAberto(true);
  };

  const handleSalvarPendencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteParaPendencia) return;
    setSalvandoPendencia(true);
    try {
      await criarPendencia({
        clienteId: clienteParaPendencia.id,
        tipo: tipoPendencia,
        responsavelId: responsavelId === '' ? null : Number(responsavelId),
        observacao: ouNulo(observacaoPendencia),
      });
      setIsModalPendenciaAberto(false);
      setClienteParaPendencia(null);
    } catch {
      // O AppContext exibe o toast de erro da API
    } finally {
      setSalvandoPendencia(false);
    }
  };

  const abrirModalDebito = (cliente: Cliente) => {
    setClienteParaDebito(cliente);
    // Já abre no tipo que falta: se as duas faltam, começa pela etapa 1, que vem antes no fluxo.
    setTipoDebitoForm(tiposFaltando(cliente.id)[0] ?? 'HOMOLOGACAO');
    setStatusDebitoForm('QUITADO');
    setIsModalDebitoAberto(true);
  };

  const handleSalvarDebito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteParaDebito) return;
    setSalvandoDebito(true);
    try {
      await registrarConsultaDebito(clienteParaDebito.id, tipoDebitoForm, statusDebitoForm);
      setIsModalDebitoAberto(false);
      setClienteParaDebito(null);
    } catch {
      // Erro exibido pelo AppContext
    } finally {
      setSalvandoDebito(false);
    }
  };

  /**
   * Onde cada cliente está no fluxo. Serve para não recadastrar quem já tem processo aberto e
   * para achar quem entrou e nunca foi tocado — a dor que a planilha não mostrava.
   */
  const movimentoPorCliente = useMemo(() => {
    const mapa = new Map<
      number,
      { pendenciasAbertas: number; projetosEmAndamento: number; debitoAtivo: boolean }
    >();

    const linha = (clienteId: number) => {
      const atual = mapa.get(clienteId);
      if (atual) return atual;
      const nova = { pendenciasAbertas: 0, projetosEmAndamento: 0, debitoAtivo: false };
      mapa.set(clienteId, nova);
      return nova;
    };

    pendencias.forEach((p) => {
      const l = linha(p.cliente.id);
      if (p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO') l.pendenciasAbertas += 1;
    });
    projetos.forEach((p) => {
      const l = linha(p.cliente.id);
      if (p.status !== 'APROVADO') l.projetosEmAndamento += 1;
    });
    debitos.forEach((d) => {
      const l = linha(d.cliente.id);
      if (d.status === 'ATIVO') l.debitoAtivo = true;
    });
    unificacoes.forEach((u) => linha(u.cliente.id));

    return mapa;
  }, [pendencias, projetos, debitos, unificacoes]);

  /**
   * Que consultas de débito ainda faltam para o cliente. São duas perguntas independentes — a
   * do débito que trava a pendência e a do que trava a homologação —, e cada etapa recusa
   * avançar sem a sua (409 `DEBITO_NAO_CONSULTADO`). Ausência de consulta não é "não deve", é
   * "ninguém olhou".
   */
  const tiposFaltando = useMemo(() => {
    const consultados = new Set(debitos.map((d) => `${d.cliente.id}|${d.tipo}`));
    return (clienteId: number) =>
      TIPOS_DEBITO.filter((tipo) => !consultados.has(`${clienteId}|${tipo}`));
  }, [debitos]);

  const faltaConsultarDebito = useMemo(
    () => (clienteId: number) => tiposFaltando(clienteId).length > 0,
    [tiposFaltando],
  );

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ordenar(clientes.filter((c) => {
      const matchTexto =
        termo === '' ||
        c.nome.toLowerCase().includes(termo) ||
        (c.cidade ?? '').toLowerCase().includes(termo) ||
        (c.vendedor ?? '').toLowerCase().includes(termo) ||
        (c.ucCoelba ?? '').toLowerCase().includes(termo) ||
        (c.telefone ?? '').toLowerCase().includes(termo);

      const matchFiltro =
        filtro === 'TODOS' ||
        (filtro === 'FALTA_CONSULTAR_DEBITO' && faltaConsultarDebito(c.id)) ||
        (filtro === 'SEM_UC' && !c.ucCoelba) ||
        (filtro === 'SEM_DATA_PAGAMENTO' && !c.dataPagamento) ||
        filtro === c.statusTriagem;

      return matchTexto && matchFiltro;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, busca, filtro, faltaConsultarDebito, ordenacao]);

  const totalPaginas = Math.ceil(clientesFiltrados.length / itensPorPagina) || 1;
  const clientesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [clientesFiltrados, pagina]);

  const aguardandoVerificacao = clientes.filter(
    (c) => c.statusTriagem === 'AGUARDANDO_VERIFICACAO',
  ).length;
  const aguardandoConsultaDebito = clientes.filter((c) => faltaConsultarDebito(c.id)).length;
  const semUc = clientes.filter((c) => !c.ucCoelba).length;

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setFiltro('AGUARDANDO_VERIFICACAO');
            setPagina(1);
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-left hover:border-[#149911] transition-colors"
        >
          <div>
            {/*
              A fila de trabalho da etapa 1, e o motivo desta triagem existir: todo cliente tem
              de ser checado na Coelba, e antes disso não havia onde registrar quem já foi.
            */}
            <span className="text-xs text-[#424342]">Falta Checar na Coelba</span>
            <div className="text-xl font-semibold text-amber-700 mt-1">
              {aguardandoVerificacao} clientes
            </div>
            <span className="text-[11px] text-[#424342]">tem pendência ou não?</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <SearchCheck className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => {
            setFiltro('FALTA_CONSULTAR_DEBITO');
            setPagina(1);
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-left hover:border-[#149911] transition-colors"
        >
          <div>
            <span className="text-xs text-[#424342]">Falta Consultar Débito</span>
            <div className="text-xl font-semibold text-sky-700 mt-1">
              {aguardandoConsultaDebito} clientes
            </div>
            <span className="text-[11px] text-[#424342]">trava a resolução da pendência</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </button>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            {/*
              Sem UC não se acha o cliente na agência virtual da Coelba — nem para consultar
              débito, nem para enviar projeto. É a lacuna de cadastro que trava trabalho.
            */}
            <span className="text-xs text-[#424342]">Sem UC Coelba</span>
            <div className="text-xl font-semibold text-slate-700 mt-1">{semUc} cadastros</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-[#424342]">Clientes Cadastrados</span>
            <div className="text-xl font-semibold text-slate-800 mt-1">
              {clientes.length} clientes
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#149911] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, UC Coelba, cidade, vendedor ou telefone..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value as Filtro);
              setPagina(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#149911] cursor-pointer shadow-sm"
          >
            <option value="TODOS">Todos os clientes</option>
            <option value="AGUARDANDO_VERIFICACAO">Falta checar na Coelba</option>
            <option value="COM_PENDENCIA">Checados — com pendência</option>
            <option value="SEM_PENDENCIA">Checados — sem pendência</option>
            <option value="FALTA_CONSULTAR_DEBITO">Falta consultar débito</option>
            <option value="SEM_UC">Sem UC Coelba</option>
            <option value="SEM_DATA_PAGAMENTO">Sem data de pagamento</option>
          </select>

          <button
            onClick={abrirCriacao}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#149911] hover:bg-[#256D1B] text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card
        title="Cadastro de Clientes"
        subtitle={`Exibe ${clientesFiltrados.length} clientes — a base que os módulos de pendência, débito, projeto e unificação referenciam`}
      >
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-medium">
                <th className="py-3 px-6">
                  <Ordenavel {...cabecalho('cliente')}>Cliente &amp; UC Coelba</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('cidade')}>Cidade</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('vendedor')}>Vendedor</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('pagamento')}>Pagamento</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('contato')}>Contato</Ordenavel>
                </th>
                <th className="py-3 px-4">
                  <Ordenavel {...cabecalho('triagem')}>Pendência na Coelba</Ordenavel>
                </th>
                <th className="py-3 px-4">Situação no Fluxo</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {clientesPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {clientes.length === 0
                      ? 'Nenhum cliente cadastrado ainda. Comece em "Novo Cliente" — os outros módulos dependem deste cadastro.'
                      : 'Nenhum cliente encontrado com os filtros atuais.'}
                  </td>
                </tr>
              ) : (
                clientesPaginados.map((c) => {
                  const movimento = movimentoPorCliente.get(c.id);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-medium text-slate-800">{c.nome}</div>
                        <div className="text-[11px] text-[#424342] mt-0.5">
                          {c.ucCoelba ? (
                            <>UC: {c.ucCoelba}</>
                          ) : (
                            <span className="text-amber-700">UC não informada</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {c.cidade ?? '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{c.vendedor ?? '—'}</td>
                      <td className="py-3.5 px-4">
                        {c.dataPagamento ? (
                          formatarData(c.dataPagamento)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.telefone ? (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.telefone}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {/*
                          Coluna da etapa 1. A analista marca diretamente aqui o resultado da checagem
                          na Coelba: "sem pendência" (segue para projeto) ou "apontar pendência" (cria
                          a pendência com 1 clique e já a lança no fluxo Coelba).
                        */}
                        <div className="flex flex-col gap-1">
                          <Badge variant={VARIANTE_TRIAGEM[c.statusTriagem]}>
                            {ROTULO_STATUS_TRIAGEM[c.statusTriagem]}
                          </Badge>
                          {c.statusTriagem === 'AGUARDANDO_VERIFICACAO' && (
                            <div className="flex flex-col gap-1 mt-0.5">
                              <button
                                onClick={() => marcarSemPendencia(c.id).catch(() => {})}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#149911] hover:underline"
                                title="Checou a Coelba e não há pendência: cria o projeto direto e segue para consulta de débito"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                sem pendência
                              </button>
                              <button
                                onClick={() => abrirModalPendencia(c)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline"
                                title="Checou a Coelba e tem pendência: escolhe o tipo e já lança direto no fluxo de Pendências Coelba"
                              >
                                <AlertCircle className="w-3 h-3" />
                                apontar pendência
                              </button>
                            </div>
                          )}
                          {c.statusTriagem !== 'AGUARDANDO_VERIFICACAO' && (
                            <button
                              onClick={() => abrirModalPendencia(c)}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 hover:underline mt-0.5"
                              title="Registrar outra pendência Coelba para este cliente"
                            >
                              <Plus className="w-3 h-3" />
                              nova pendência
                            </button>
                          )}
                          {faltaConsultarDebito(c.id) && (
                            <button
                              onClick={() => abrirModalDebito(c)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:underline"
                              title="Registrar a consulta da agência virtual da Coelba para este cliente"
                            >
                              <CreditCard className="w-3 h-3" />
                              registrar débito
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!movimento ? (
                            <Badge variant="neutral">Sem movimento</Badge>
                          ) : (
                            <>
                              {movimento.debitoAtivo && <Badge variant="danger">Débito ativo</Badge>}
                              {movimento.pendenciasAbertas > 0 && (
                                <Badge variant="warning">
                                  {movimento.pendenciasAbertas} pendência
                                  {movimento.pendenciasAbertas > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {movimento.projetosEmAndamento > 0 && (
                                <Badge variant="info">
                                  {movimento.projetosEmAndamento} projeto
                                  {movimento.projetosEmAndamento > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {!movimento.debitoAtivo &&
                                movimento.pendenciasAbertas === 0 &&
                                movimento.projetosEmAndamento === 0 && (
                                  <Badge variant="success">Em dia</Badge>
                                )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => abrirModalPendencia(c)}
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Apontar pendência na Coelba para este cliente"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                          {c.statusTriagem !== 'AGUARDANDO_VERIFICACAO' && (
                            <button
                              onClick={() => reverificarCliente(c.id).catch(() => {})}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Devolver à fila de verificação (novo ciclo ou marcação errada)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => abrirEdicao(c)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Mostrando <span className="font-medium">{clientesPaginados.length}</span> de{' '}
            <span className="font-medium">{clientesFiltrados.length}</span> clientes
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-700 font-medium">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Modal: Novo cliente / Editar cadastro — componente reutilizável com municípios da Bahia e vendedores padrão */}
      <ClienteModal
        isOpen={isModalAberto}
        onClose={() => setIsModalAberto(false)}
        clienteEmEdicao={clienteEmEdicao}
      />

      {/* Modal: Apontar Pendência na Coelba */}
      <Modal
        isOpen={isModalPendenciaAberto}
        onClose={() => setIsModalPendenciaAberto(false)}
        title="Apontar Pendência na Coelba"
        subtitle={
          clienteParaPendencia
            ? `Cliente: ${clienteParaPendencia.nome}${clienteParaPendencia.ucCoelba ? ` • UC: ${clienteParaPendencia.ucCoelba}` : ''}`
            : 'Registro da checagem na Coelba'
        }
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalPendenciaAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-apontar-pendencia"
              disabled={salvandoPendencia}
              className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4" />
              {salvandoPendencia ? 'Registrando…' : 'Lançar no Fluxo de Pendências'}
            </button>
          </>
        }
      >
        <form
          id="form-apontar-pendencia"
          onSubmit={handleSalvarPendencia}
          className="space-y-4 text-xs"
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Lançamento automático:</strong> ao confirmar, a pendência é criada diretamente
              no fluxo de <strong>Pendências Coelba</strong> e este cliente é marcado como{' '}
              <strong>Com pendência</strong>. Não é necessário cadastrar nada manualmente no outro módulo.
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1" htmlFor="pendencia-tipo">
              Qual é a pendência identificada na Coelba? <span className="text-rose-600">*</span>
            </label>
            <select
              id="pendencia-tipo"
              value={tipoPendencia}
              onChange={(e) => setTipoPendencia(e.target.value as TipoPendencia)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {(Object.keys(ROTULO_TIPO_PENDENCIA) as TipoPendencia[]).map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_PENDENCIA[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1" htmlFor="pendencia-responsavel">
              Analista Responsável pela Regularização
            </label>
            <select
              id="pendencia-responsavel"
              value={responsavelId}
              onChange={(e) =>
                setResponsavelId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Não atribuir agora (fila geral de pendências)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1" htmlFor="pendencia-observacao">
              Observação / Detalhes da Coelba
            </label>
            <textarea
              id="pendencia-observacao"
              rows={3}
              value={observacaoPendencia}
              onChange={(e) => setObservacaoPendencia(e.target.value)}
              placeholder="Ex: Titular anterior da conta possui débito ou faleceu; documentação exigida: escritura do imóvel e procuração..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar Consulta de Débito direto do Cliente */}
      <Modal
        isOpen={isModalDebitoAberto}
        onClose={() => setIsModalDebitoAberto(false)}
        title="Registrar Consulta de Débito Coelba"
        subtitle={
          clienteParaDebito
            ? `Cliente: ${clienteParaDebito.nome}${clienteParaDebito.ucCoelba ? ` • UC: ${clienteParaDebito.ucCoelba}` : ''}`
            : 'Consulta de débito'
        }
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalDebitoAberto(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-debito-cliente"
              disabled={salvandoDebito}
              className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {salvandoDebito ? 'Salvando…' : 'Confirmar Consulta'}
            </button>
          </>
        }
      >
        <form id="form-debito-cliente" onSubmit={handleSalvarDebito} className="space-y-4 text-xs">
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex gap-2">
            <CreditCard className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
            <div>
              Consulte a <strong>Agência Virtual Neoenergia Coelba</strong> com a UC do cliente e
              registre o resultado abaixo.
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-2">
              Que etapa este débito trava <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIPOS_DEBITO.map((tipo) => {
                const ativo = tipoDebitoForm === tipo;
                const falta =
                  clienteParaDebito && tiposFaltando(clienteParaDebito.id).includes(tipo);
                return (
                  <label
                    key={tipo}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      ativo
                        ? 'border-[#149911] bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-semibold text-slate-800">
                        {ROTULO_TIPO_DEBITO[tipo]}
                      </span>
                      <input
                        type="radio"
                        name="tipoDebitoCliente"
                        checked={ativo}
                        onChange={() => setTipoDebitoForm(tipo)}
                        className="accent-[#149911]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {falta ? 'Ainda não consultado para este cliente.' : 'Já consultado — vai atualizar o registro.'}
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-2">
              Situação encontrada na Agência Virtual <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                  statusDebitoForm === 'QUITADO'
                    ? 'border-[#149911] bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#149911]" />
                    Quitado / Em Dia
                  </span>
                  <input
                    type="radio"
                    name="statusDebitoCliente"
                    checked={statusDebitoForm === 'QUITADO'}
                    onChange={() => setStatusDebitoForm('QUITADO')}
                    className="accent-[#149911]"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Sem débitos na Coelba. Libera o projeto e resolução de pendências.
                </p>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                  statusDebitoForm === 'ATIVO'
                    ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Débito Ativo
                  </span>
                  <input
                    type="radio"
                    name="statusDebitoCliente"
                    checked={statusDebitoForm === 'ATIVO'}
                    onChange={() => setStatusDebitoForm('ATIVO')}
                    className="accent-rose-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Faturas em aberto. Bloqueia o encaminhamento à Coelba até quitação.
                </p>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
