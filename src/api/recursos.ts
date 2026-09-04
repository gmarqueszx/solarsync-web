/**
 * Um método por endpoint da API, tipado pelo contrato. Nenhum componente monta URL na mão:
 * quando uma rota mudar, muda só aqui.
 */
import { api } from './client';
import {
  Cliente,
  Debito,
  HistoricoStatus,
  KPIStats,
  Pagina,
  Pendencia,
  PendenciaResumo,
  PeriodoDashboard,
  Projeto,
  ProjetoResumo,
  StatusDebito,
  StatusPendencia,
  StatusProjeto,
  StatusVistoria,
  TipoPendencia,
  TipoProjeto,
  Unificacao,
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

export const authApi = {
  login: (email: string, senha: string) =>
    api.publico<RespostaToken>('/api/auth/login', { email, senha }),
  loginGoogle: (idToken: string) =>
    api.publico<RespostaToken>('/api/auth/login/google', { idToken }),
  eu: () => api.get<UsuarioLogado>('/api/auth/eu'),
};

// ---------- Clientes ----------

export const clientesApi = {
  /** O parâmetro `nome` casa nome **ou** UC Coelba — é como o analista procura. */
  listar: (busca?: string) =>
    api.get<Pagina<Cliente>>('/api/clientes', { nome: busca, size: TAMANHO_PADRAO }),
  buscar: (id: number) => api.get<Cliente>(`/api/clientes/${id}`),
  criar: (dados: Partial<Cliente>) => api.post<Cliente>('/api/clientes', dados),
  atualizar: (id: number, dados: Partial<Cliente>) =>
    api.put<Cliente>(`/api/clientes/${id}`, dados),
};

// ---------- Usuários ----------

export const usuariosApi = {
  /** Alimenta os seletores de responsável e analista. Liberado a todos os papéis. */
  lookup: () => api.get<UsuarioResumo[]>('/api/usuarios/lookup', { ativo: true }),
};

// ---------- Pendências ----------

export interface FiltroPendencia {
  clienteId?: number;
  status?: StatusPendencia[];
  tipo?: TipoPendencia;
  responsavelId?: number;
  q?: string;
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
  iniciar: (id: number, observacao?: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/iniciar`, { observacao }),
  resolver: (id: number, observacao?: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/resolver`, { observacao }),
  cancelar: (id: number, motivo: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/cancelar`, { motivo }),
  reabrir: (id: number, observacao?: string) =>
    api.post<Pendencia>(`/api/pendencias/${id}/reabrir`, { observacao }),
};

// ---------- Débitos ----------

export const debitosApi = {
  listar: (status?: StatusDebito) =>
    api.get<Pagina<Debito>>('/api/debitos', { status, size: TAMANHO_PADRAO }),
  porCliente: (clienteId: number) => api.get<Debito>(`/api/debitos/cliente/${clienteId}`),
  historico: (id: number) => api.get<HistoricoStatus[]>(`/api/debitos/${id}/historico`),
  /** Idempotente: registrar de novo atualiza a mesma linha, não cria outra. */
  registrarConsulta: (clienteId: number, status: StatusDebito, consultadoEm?: string) =>
    api.put<Debito>(`/api/debitos/cliente/${clienteId}`, { status, consultadoEm }),
};

// ---------- Projetos ----------

export interface FiltroProjeto {
  clienteId?: number;
  status?: StatusProjeto[];
  tipoProjeto?: TipoProjeto;
  analistaResponsavelId?: number;
  q?: string;
  /** Combinados, dão a fila da etapa 4: instalado e ainda sem vistoria. */
  instalado?: boolean;
  semVistoria?: boolean;
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
    potenciaKwp?: number | null;
  }) => api.post<Projeto>('/api/projetos', dados),
  atualizar: (
    id: number,
    dados: {
      tipoProjeto: TipoProjeto;
      analistaResponsavelId?: number | null;
      dataRecebimento?: string | null;
      dataArt?: string | null;
      potenciaKwp?: number | null;
    },
  ) => api.put<Projeto>(`/api/projetos/${id}`, dados),

  aguardarEnvio: (id: number) => api.post<Projeto>(`/api/projetos/${id}/aguardar-envio`),
  /** Falha com 409 CLIENTE_COM_DEBITO se o cliente estiver devendo. */
  encaminhar: (id: number, dataArt?: string | null, dataEncaminhado?: string | null) =>
    api.post<Projeto>(`/api/projetos/${id}/encaminhar`, { dataArt, dataEncaminhado }),
  reencaminhar: (id: number, dataEncaminhado?: string | null) =>
    api.post<Projeto>(`/api/projetos/${id}/reencaminhar`, { dataEncaminhado }),
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
  listar: (filtro: { feita?: boolean; desligamento?: boolean; q?: string } = {}) =>
    api.get<Pagina<Unificacao>>('/api/unificacoes', { ...filtro, size: TAMANHO_PADRAO }),
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
  registrarDesligamento: (id: number) =>
    api.post<Unificacao>(`/api/unificacoes/${id}/registrar-desligamento`),
};

// ---------- Dashboard ----------

interface DashboardResposta {
  periodo: { de: string | null; ate: string | null };
  temposMediosEmDias: {
    semNinguemMexerNoCliente: number | null;
    resolucaoDePendencia: number | null;
    recebimentoAteEnvio: number | null;
    envioAteAprovacao: number | null;
    paradoPorDebito: number | null;
    instalacaoAteSolicitarVistoria: number | null;
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
    clientesComDebitoQuitado: number;
    vistoriasSolicitadas: number;
    vistoriasAprovadas: number;
    vistoriasReprovadas: number;
    unificacoesPendentes: number;
  };
}

export const dashboardApi = {
  /** Restrito a GESTOR e ADMINISTRADOR: para ANALISTA a API responde 403. */
  async metricas(periodo: PeriodoDashboard = {}): Promise<KPIStats> {
    const r = await api.get<DashboardResposta>('/api/dashboard', {
      de: periodo.de,
      ate: periodo.ate,
    });
    // Achata a resposta agrupada da API no formato que as telas já usavam.
    return {
      tempoMedioSemMexerDias: r.temposMediosEmDias.semNinguemMexerNoCliente,
      tempoMedioResolucaoPendenciaDias: r.temposMediosEmDias.resolucaoDePendencia,
      tempoMedioRecebimentoEnvioDias: r.temposMediosEmDias.recebimentoAteEnvio,
      tempoMedioParaAprovacaoDias: r.temposMediosEmDias.envioAteAprovacao,
      tempoMedioParadoDebitoDias: r.temposMediosEmDias.paradoPorDebito,
      tempoMedioInstalacaoVistoriaDias: r.temposMediosEmDias.instalacaoAteSolicitarVistoria,
      tempoMedioCicloCompletoDias: r.temposMediosEmDias.cicloCompleto,
      pendenciasAbertasNoPeriodo: r.quantitativos.pendenciasAbertasNoPeriodo,
      pendenciasResolvidas: r.quantitativos.pendenciasResolvidas,
      projetosEncaminhados: r.quantitativos.projetosEncaminhados,
      projetosReencaminhados: r.quantitativos.projetosReencaminhados,
      projetosAprovados: r.quantitativos.projetosAprovados,
      projetosReprovados: r.quantitativos.projetosReprovados,
      clientesComDebitoParado: r.quantitativos.clientesComDebitoAtivo,
      clientesDebitoQuitado: r.quantitativos.clientesComDebitoQuitado,
      vistoriasSolicitadas: r.quantitativos.vistoriasSolicitadas,
      vistoriasAprovadas: r.quantitativos.vistoriasAprovadas,
      vistoriasReprovadas: r.quantitativos.vistoriasReprovadas,
      unificacoesPendentes: r.quantitativos.unificacoesPendentes,
    };
  },
};
