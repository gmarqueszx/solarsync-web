/**
 * Um método por endpoint da API, tipado pelo contrato. Nenhum componente monta URL na mão:
 * quando uma rota mudar, muda só aqui.
 */
import { api } from './client';
import {
  Cliente,
  DadosCliente,
  DadosPrioridade,
  Debito,
  HistoricoStatus,
  KPIStats,
  Pagina,
  Papel,
  Pendencia,
  PendenciaResumo,
  PeriodoDashboard,
  Projeto,
  ProjetoResumo,
  StatusDebito,
  StatusDesligamento,
  StatusPendencia,
  StatusProjeto,
  StatusTriagem,
  StatusVistoria,
  TipoDebito,
  TipoPendencia,
  TipoProjeto,
  Unificacao,
  Usuario,
  UsuarioLogado,
  UsuarioResumo,
  Vistoria,
} from '../types';

/** Página grande: as telas do SolarSync são listas de trabalho, não catálogos infinitos. */
const TAMANHO_PADRAO = 200;

// ---------- Autenticação ----------

export interface RespostaToken {
  accessToken: string;
  refreshToken: string;
  tipo: string;
  expiraEmSegundos: number;
  usuario: UsuarioLogado;
}

/**
 * Só e-mail e senha. Não há login federado nem auto-cadastro desde 16/09/2026: quem entra
 * precisa ter sido cadastrado por um ADMINISTRADOR ou GESTOR na tela de Usuários.
 */
export const authApi = {
  login: (email: string, senha: string) =>
    api.publico<RespostaToken>('/api/auth/login', { email, senha }),
  eu: () => api.get<UsuarioLogado>('/api/auth/eu'),
};

// ---------- Clientes ----------

export interface FiltroCliente {
  /** Casa nome **ou** UC Coelba — é como o analista procura. */
  nome?: string;
  statusTriagem?: StatusTriagem[];
  /** Sem nenhuma consulta de débito registrada: a fila da consulta pré projeto. */
  semConsultaDebito?: boolean;
}

export const clientesApi = {
  listar: (filtro: FiltroCliente = {}) =>
    api.get<Pagina<Cliente>>('/api/clientes', {
      ...filtro,
      statusTriagem: filtro.statusTriagem?.join(','),
      size: TAMANHO_PADRAO,
    }),
  buscar: (id: number) => api.get<Cliente>(`/api/clientes/${id}`),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/clientes/${id}/historico`),
  criar: (dados: DadosCliente) => api.post<Cliente>('/api/clientes', dados),
  /** O PUT substitui o cadastro inteiro: mande sempre todos os campos, não só o alterado. */
  atualizar: (id: number, dados: DadosCliente) =>
    api.put<Cliente>(`/api/clientes/${id}`, dados),

  // Triagem da etapa 1: status é endpoint de ação, nunca campo do PUT.
  /** Checou a Coelba e não há pendência: cria o projeto em RECEBIDO e libera a etapa 2. */
  marcarSemPendencia: (id: number) =>
    api.post<Cliente>(`/api/clientes/${id}/sem-pendencia`),
  /** Devolve o cliente para a fila de verificação (novo ciclo ou marcação errada). */
  reverificar: (id: number) => api.post<Cliente>(`/api/clientes/${id}/reverificar`),

  /**
   * Adianta o cliente: ele passa a aparecer no topo da fila da etapa em que estiver, e continua
   * no topo das seguintes até alguém encerrar. Chamar de novo revisa o motivo — não é preciso
   * remover antes.
   *
   * Com `INSTALACAO_ADIANTADA`, a `dataInstalacao` é obrigatória (409
   * `PRIORIDADE_SEM_INSTALACAO`) e desce para o projeto do cliente: é a mesma data que a etapa
   * de vistoria exige, não uma segunda.
   */
  marcarPrioridade: (id: number, dados: DadosPrioridade) =>
    api.post<Cliente>(`/api/clientes/${id}/prioridade`, dados),
  /** A data de instalação já registrada no projeto permanece: é fato de campo, não privilégio. */
  removerPrioridade: (id: number) =>
    api.post<Cliente>(`/api/clientes/${id}/remover-prioridade`),
};

// ---------- Referências ----------

/**
 * As listas fechadas do cadastro. Vinham de `src/data/constantes.ts`; passaram para o servidor
 * em 17/09/2026 porque a importação do Nectar precisa normalizar cidade e vendedor contra o
 * mesmo padrão — e duas cópias divergem. O backend é a fonte de verdade.
 */
export interface Referencias {
  municipios: string[];
  vendedores: string[];
}

export const referenciasApi = {
  listar: () => api.get<Referencias>('/api/referencias'),
};

// ---------- Usuários ----------

export const usuariosApi = {
  /** Alimenta os seletores de responsável e analista. Liberado a todos os papéis. */
  lookup: () => api.get<UsuarioResumo[]>('/api/usuarios/lookup', { ativo: true }),

  // Daqui para baixo, só ADMINISTRADOR e GESTOR — a API responde 403 para ANALISTA.
  /** Inclui os inativos: a tela precisa mostrar quem foi desligado, não escondê-lo. */
  listar: () => api.get<Usuario[]>('/api/usuarios'),
  /**
   * A senha é obrigatória e provisória. Um GESTOR que tente criar um ADMINISTRADOR leva 403:
   * conceder esse papel é só do administrador.
   */
  criar: (dados: { nome: string; email: string; papeis: Papel[]; senha: string }) =>
    api.post<Usuario>('/api/usuarios', dados),
  /** Sem senha: trocá-la é `definirSenha`, para um ajuste de nome não resetar o acesso. */
  atualizar: (id: number, dados: { nome: string; email: string; papeis: Papel[] }) =>
    api.put<Usuario>(`/api/usuarios/${id}`, dados),
  definirSenha: (id: number, senha: string) =>
    api.post<Usuario>(`/api/usuarios/${id}/senha`, { senha }),
  ativar: (id: number) => api.post<Usuario>(`/api/usuarios/${id}/ativar`),
  /**
   * O caminho certo para quem saiu da empresa: o acesso morre em minutos e a auditoria fica
   * de pé. Excluir de verdade é só do ADMINISTRADOR e falha se a pessoa já aparece no
   * histórico — por isso não há botão de excluir na tela.
   */
  desativar: (id: number) => api.post<Usuario>(`/api/usuarios/${id}/desativar`),
};

// ---------- Pendências ----------

export interface FiltroPendencia {
  clienteId?: number;
  status?: StatusPendencia[];
  tipo?: TipoPendencia;
  responsavelId?: number;
  q?: string;
  /**
   * As duas filas de pendência que não podem ser resolvidas. São **derivadas** (pendência
   * aberta + situação do débito), não status: a pendência travada continua ABERTA, e um status
   * próprio viveria dessincronizado do débito.
   */
  travadaPorDebito?: boolean;
  semConsultaDebito?: boolean;
}

export const pendenciasApi = {
  listar: (filtro: FiltroPendencia = {}) =>
    api.get<Pagina<PendenciaResumo>>('/api/pendencias', {
      ...filtro,
      status: filtro.status?.join(','),
      size: TAMANHO_PADRAO,
    }),
  buscar: (id: number) => api.get<Pendencia>(`/api/pendencias/${id}`),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/pendencias/${id}/historico`),
  criar: (dados: {
    clienteId: number;
    tipo: TipoPendencia;
    solicitadoEm?: string;
    responsavelId?: number | null;
    observacao?: string | null;
  }) => api.post<Pendencia>('/api/pendencias', dados),
  atualizar: (
    id: number,
    dados: { tipo: TipoPendencia; responsavelId?: number | null; observacao?: string | null },
  ) => api.put<Pendencia>(`/api/pendencias/${id}`, dados),

  // Transições são endpoints de ação: o PUT não aceita status, de propósito.
  // Não há "iniciar": apontar a pendência na triagem já é iniciá-la.
  resolver: (id: number, observacao?: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/resolver`, { observacao }),
  cancelar: (id: number, motivo: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/cancelar`, { motivo }),
  reabrir: (id: number, observacao?: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/reabrir`, { observacao }),
};

// ---------- Débitos ----------

export interface FiltroDebito {
  clienteId?: number;
  tipo?: TipoDebito;
  status?: StatusDebito;
  q?: string;
  /** Só os ATIVO detectados há mais de N dias: a fila que o financeiro persegue. */
  paradoHaMaisDeDias?: number;
}

export const debitosApi = {
  listar: (filtro: FiltroDebito = {}) =>
    api.get<Pagina<Debito>>('/api/debitos', { ...filtro, size: TAMANHO_PADRAO }),
  /** Até dois registros: o que trava a pendência e o que trava a homologação. */
  porCliente: (clienteId: number) => api.get<Debito[]>(`/api/debitos/cliente/${clienteId}`),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/debitos/${id}/historico`),
  /**
   * Idempotente por `(cliente, tipo)`: registrar de novo atualiza a mesma linha, não cria outra.
   * O tipo é obrigatório — é ele que diz qual etapa esta consulta responde.
   */
  registrarConsulta: (
    clienteId: number,
    tipo: TipoDebito,
    status: StatusDebito,
    consultadoEm?: string,
    proximoVencimento?: string | null,
  ) =>
    api.put<Debito>(`/api/debitos/cliente/${clienteId}`, {
      tipo,
      status,
      consultadoEm,
      // Só acompanha a quitação: com débito ATIVO o servidor ignora, porque aí não há "próxima
      // conta" a esperar — há a atual, que já barra o envio sozinha.
      proximoVencimento,
    }),
};

// ---------- Projetos ----------

export interface FiltroProjeto {
  clienteId?: number;
  status?: StatusProjeto[];
  tipoProjeto?: TipoProjeto;
  analistaResponsavelId?: number;
  q?: string;
  /**
   * `status=['APROVADO'] + semVistoria` é a fila da etapa 4: projeto homologado esperando
   * alguém registrar a instalação e pedir a vistoria.
   */
  instalado?: boolean;
  semVistoria?: boolean;
  /** Projetos por enviar cujo cliente tem débito de homologação ativo. */
  travadoPorDebito?: boolean;
  /** Projetos por enviar cujo débito de homologação nunca foi consultado. */
  semConsultaDebito?: boolean;
}

export const projetosApi = {
  listar: (filtro: FiltroProjeto = {}) =>
    api.get<Pagina<ProjetoResumo>>('/api/projetos', {
      ...filtro,
      status: filtro.status?.join(','),
      size: TAMANHO_PADRAO,
    }),
  buscar: (id: number) => api.get<Projeto>(`/api/projetos/${id}`),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/projetos/${id}/historico`),
  criar: (dados: {
    clienteId: number;
    tipoProjeto: TipoProjeto;
    analistaResponsavelId?: number | null;
    dataRecebimento?: string | null;
    dataArt?: string | null;
    numeroSolicitacao?: string | null;
    potenciaKwp?: number | null;
  }) => api.post<Projeto>('/api/projetos', dados),
  atualizar: (
    id: number,
    dados: {
      tipoProjeto: TipoProjeto;
      analistaResponsavelId?: number | null;
      dataRecebimento?: string | null;
      dataArt?: string | null;
      numeroSolicitacao?: string | null;
      potenciaKwp?: number | null;
    },
  ) => api.put<Projeto>(`/api/projetos/${id}`, dados),

  aguardarEnvio: (id: number) => api.post<Projeto>(`/api/projetos/${id}/aguardar-envio`),
  /**
   * Falha com 409 `CLIENTE_COM_DEBITO` se o cliente estiver devendo, e com 409
   * `DEBITO_NAO_CONSULTADO` se ninguém tiver consultado o débito de homologação — que é o passo
   * do projetista ao receber o cliente.
   */
  /**
   * Além de `CLIENTE_COM_DEBITO` e `DEBITO_NAO_CONSULTADO`, pode falhar com 409
   * `PROXIMO_DEBITO_A_VENCER`: o cliente está quitado, mas a próxima conta vence em um dia ou
   * menos e a Coelba analisaria o projeto já com débito em aberto.
   */
  encaminhar: (
    id: number,
    dataArt?: string | null,
    dataEncaminhado?: string | null,
    numeroSolicitacao?: string | null,
  ) =>
    api.post<Projeto>(`/api/projetos/${id}/encaminhar`, {
      dataArt,
      dataEncaminhado,
      numeroSolicitacao,
    }),
  /** Sem `numeroSolicitacao`, mantém o número já registrado. */
  reencaminhar: (
    id: number,
    dataEncaminhado?: string | null,
    numeroSolicitacao?: string | null,
  ) =>
    api.post<Projeto>(`/api/projetos/${id}/reencaminhar`, {
      dataEncaminhado,
      numeroSolicitacao,
    }),
  aprovar: (id: number, dataAprovacao?: string | null) =>
    api.post<Projeto>(`/api/projetos/${id}/aprovar`, { dataAprovacao }),
  reprovar: (id: number, motivo: string) =>
    api.post<Projeto>(`/api/projetos/${id}/reprovar`, { motivo }),
  registrarInstalacao: (id: number, dataInstalacao: string) =>
    api.post<Projeto>(`/api/projetos/${id}/registrar-instalacao`, { dataInstalacao }),
  /** Só ADMINISTRADOR: pula a máquina de estados, mantendo a auditoria. */
  corrigirStatus: (id: number, novoStatus: StatusProjeto, justificativa: string) =>
    api.post<Projeto>(`/api/projetos/${id}/corrigir-status`, { novoStatus, justificativa }),
};

// ---------- Vistorias ----------

export interface FiltroVistoria {
  projetoId?: number;
  clienteId?: number;
  status?: StatusVistoria[];
  q?: string;
}

export const vistoriasApi = {
  listar: (filtro: FiltroVistoria = {}) =>
    api.get<Pagina<Vistoria>>('/api/vistorias', {
      ...filtro,
      status: filtro.status?.join(','),
      size: TAMANHO_PADRAO,
    }),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/vistorias/${id}/historico`),
  /** Falha com 409 PROJETO_SEM_INSTALACAO se a instalação não tiver sido registrada. */
  solicitar: (projetoId: number, dataSolicitacao?: string) =>
    api.post<Vistoria>('/api/vistorias', { projetoId, dataSolicitacao }),
  aprovar: (id: number, dataResultado?: string) =>
    api.post<Vistoria>(`/api/vistorias/${id}/aprovar`, { dataResultado }),
  reprovar: (id: number, dataResultado?: string) =>
    api.post<Vistoria>(`/api/vistorias/${id}/reprovar`, { dataResultado }),
  /** Nova solicitação após reprova, no mesmo registro. */
  resolicitar: (id: number, projetoId: number, dataSolicitacao?: string) =>
    api.post<Vistoria>(`/api/vistorias/${id}/resolicitar`, { projetoId, dataSolicitacao }),
};

// ---------- Unificações ----------

export const unificacoesApi = {
  listar: (
    filtro: { feita?: boolean; desligamentoStatus?: StatusDesligamento[]; q?: string } = {},
  ) =>
    api.get<Pagina<Unificacao>>('/api/unificacoes', {
      ...filtro,
      desligamentoStatus: filtro.desligamentoStatus?.join(','),
      size: TAMANHO_PADRAO,
    }),
  criar: (dados: {
    clienteId: number;
    cidade?: string | null;
    projetistaId?: number | null;
    informacoes?: string | null;
  }) => api.post<Unificacao>('/api/unificacoes', dados),
  atualizar: (
    id: number,
    dados: {
      clienteId: number;
      cidade?: string | null;
      projetistaId?: number | null;
      informacoes?: string | null;
    },
  ) => api.put<Unificacao>(`/api/unificacoes/${id}`, dados),
  concluir: (id: number) => api.post<Unificacao>(`/api/unificacoes/${id}/concluir`),
  reabrir: (id: number) => api.post<Unificacao>(`/api/unificacoes/${id}/reabrir`),
  /** Falha com 409 UNIFICACAO_NAO_FEITA se a unificação ainda não foi confirmada. */
  solicitarDesligamento: (id: number, data?: string) =>
    api.post<Unificacao>(`/api/unificacoes/${id}/solicitar-desligamento`, { data }),
  /** A equipe de campo não realizou o desligamento. */
  abrirOrdemDeServico: (id: number) =>
    api.post<Unificacao>(`/api/unificacoes/${id}/abrir-os`),
  concluirDesligamento: (id: number, data?: string) =>
    api.post<Unificacao>(`/api/unificacoes/${id}/concluir-desligamento`, { data }),
};

// ---------- Dashboard ----------

interface DashboardResposta {
  periodo: { de: string | null; ate: string | null };
  filtro: { analistaId: number | null; analistaNome: string | null };
  temposMediosEmDias: {
    semNinguemMexerNoCliente: number | null;
    resolucaoDePendencia: number | null;
    recebimentoAteEnvio: number | null;
    envioAteAprovacao: number | null;
    paradoPorDebito: number | null;
    instalacaoAteSolicitarVistoria: number | null;
    esperaDoDesligamento: number | null;
    cicloCompleto: number | null;
  };
  quantitativos: {
    pendenciasAbertasNoPeriodo: number;
    pendenciasResolvidas: number;
    projetosEncaminhados: number;
    projetosReencaminhados: number;
    projetosAprovados: number;
    projetosReprovados: number;
    clientesComDebitoAtivo: number;
    clientesTravadosNaPendencia: number;
    clientesTravadosNaHomologacao: number;
    clientesComDebitoQuitado: number;
    vistoriasSolicitadas: number;
    vistoriasAprovadas: number;
    vistoriasReprovadas: number;
    unificacoesPendentes: number;
    desligamentosAguardando: number;
    desligamentosComOsAberta: number;
    desligamentosConcluidos: number;
  };
}

export const dashboardApi = {
  /**
   * Aberto a todos os papéis desde 09/09/2026.
   *
   * `analistaId` recorta tudo pelo responsável da etapa — que é uma coluna diferente em cada
   * uma (responsável da pendência, analista do projeto, quem consultou o débito, projetista da
   * unificação). O nome do analista volta na resposta para a tela rotular os números sem
   * cruzar com a lista de usuários.
   */
  async metricas(periodo: PeriodoDashboard = {}): Promise<KPIStats> {
    const r = await api.get<DashboardResposta>('/api/dashboard', {
      de: periodo.de,
      ate: periodo.ate,
      analistaId: periodo.analistaId,
    });
    // Achata a resposta agrupada da API no formato que as telas já usavam.
    return {
      analistaId: r.filtro.analistaId,
      analistaNome: r.filtro.analistaNome,
      tempoMedioSemMexerDias: r.temposMediosEmDias.semNinguemMexerNoCliente,
      tempoMedioResolucaoPendenciaDias: r.temposMediosEmDias.resolucaoDePendencia,
      tempoMedioRecebimentoEnvioDias: r.temposMediosEmDias.recebimentoAteEnvio,
      tempoMedioParaAprovacaoDias: r.temposMediosEmDias.envioAteAprovacao,
      tempoMedioParadoDebitoDias: r.temposMediosEmDias.paradoPorDebito,
      tempoMedioInstalacaoVistoriaDias: r.temposMediosEmDias.instalacaoAteSolicitarVistoria,
      tempoMedioEsperaDesligamentoDias: r.temposMediosEmDias.esperaDoDesligamento,
      tempoMedioCicloCompletoDias: r.temposMediosEmDias.cicloCompleto,
      pendenciasAbertasNoPeriodo: r.quantitativos.pendenciasAbertasNoPeriodo,
      pendenciasResolvidas: r.quantitativos.pendenciasResolvidas,
      projetosEncaminhados: r.quantitativos.projetosEncaminhados,
      projetosReencaminhados: r.quantitativos.projetosReencaminhados,
      projetosAprovados: r.quantitativos.projetosAprovados,
      projetosReprovados: r.quantitativos.projetosReprovados,
      clientesComDebitoParado: r.quantitativos.clientesComDebitoAtivo,
      clientesTravadosNaPendencia: r.quantitativos.clientesTravadosNaPendencia,
      clientesTravadosNaHomologacao: r.quantitativos.clientesTravadosNaHomologacao,
      clientesDebitoQuitado: r.quantitativos.clientesComDebitoQuitado,
      vistoriasSolicitadas: r.quantitativos.vistoriasSolicitadas,
      vistoriasAprovadas: r.quantitativos.vistoriasAprovadas,
      vistoriasReprovadas: r.quantitativos.vistoriasReprovadas,
      unificacoesPendentes: r.quantitativos.unificacoesPendentes,
      desligamentosAguardando: r.quantitativos.desligamentosAguardando,
      desligamentosComOsAberta: r.quantitativos.desligamentosComOsAberta,
      desligamentosConcluidos: r.quantitativos.desligamentosConcluidos,
    };
  },
};
