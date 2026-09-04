/**
 * Espelha o contrato da API (`docs/api/openapi.json` no repositório do backend).
 *
 * Regras que vieram do contrato e diferem do protótipo original:
 * - `id` é número, não string.
 * - Campos em camelCase, não snake_case.
 * - Status e tipos são enums fechados; o texto para o usuário vem dos rótulos abaixo.
 * - Datas são strings ISO: `YYYY-MM-DD` para data, ISO-8601 completo para instante.
 */

export type Papel = 'ADMINISTRADOR' | 'GESTOR' | 'ANALISTA';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  papeis: Papel[];
}

export interface UsuarioResumo {
  id: number;
  nome: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cidade: string | null;
  vendedor: string | null;
  dataPagamento: string | null;
  ucCoelba: string | null;
  telefone: string | null;
}

export interface ClienteResumo {
  id: number;
  nome: string;
  cidade: string | null;
  ucCoelba: string | null;
}

// ---------- Pendência ----------

export type TipoPendencia =
  | 'TROCA_TITULARIDADE'
  | 'LIGACAO_NOVA'
  | 'EXTENSAO_REDE'
  | 'OUTRA';

export type StatusPendencia = 'ABERTA' | 'EM_ANDAMENTO' | 'RESOLVIDA' | 'CANCELADA';

export interface Pendencia {
  id: number;
  cliente: ClienteResumo;
  tipo: TipoPendencia;
  status: StatusPendencia;
  solicitadoEm: string;
  resolvidoEm: string | null;
  responsavel: UsuarioResumo | null;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** O que a listagem devolve: sem observação e sem o cliente completo. */
export interface PendenciaResumo {
  id: number;
  clienteId: number;
  clienteNome: string;
  tipo: TipoPendencia;
  status: StatusPendencia;
  solicitadoEm: string;
  resolvidoEm: string | null;
  responsavelId: number | null;
  responsavelNome: string | null;
}

// ---------- Débito ----------

export type StatusDebito = 'ATIVO' | 'QUITADO';

export interface Debito {
  id: number;
  cliente: ClienteResumo;
  status: StatusDebito;
  ultimaConsultaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Projeto ----------

export type TipoProjeto =
  | 'PADRAO'
  | 'AMPLIACAO'
  | 'AUMENTO_POTENCIA'
  | 'MUDANCA_INVERSOR'
  | 'PROJETO_UMA_PLACA_A_MAIS'
  | 'INVERSORES_SEPARADOS';

export type StatusProjeto =
  | 'RECEBIDO'
  | 'AGUARDANDO_ENVIO'
  | 'ENCAMINHADO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'REENCAMINHADO';

export interface Projeto {
  id: number;
  cliente: ClienteResumo;
  tipoProjeto: TipoProjeto;
  analistaResponsavel: UsuarioResumo | null;
  dataRecebimento: string | null;
  dataArt: string | null;
  dataEncaminhado: string | null;
  status: StatusProjeto;
  motivoReprova: string | null;
  dataAprovacao: string | null;
  dataInstalacao: string | null;
  potenciaKwp: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProjetoResumo {
  id: number;
  clienteId: number;
  clienteNome: string;
  tipoProjeto: TipoProjeto;
  status: StatusProjeto;
  analistaResponsavelId: number | null;
  analistaResponsavelNome: string | null;
  dataRecebimento: string | null;
  dataEncaminhado: string | null;
  dataAprovacao: string | null;
  dataInstalacao: string | null;
  potenciaKwp: number | null;
}

// ---------- Formas de lista usadas pelas telas ----------

/**
 * As listagens da API devolvem o cliente achatado (`clienteId` + `clienteNome`) para não
 * repetir o objeto inteiro em cada linha. As telas, porém, precisam de cidade, vendedor e UC —
 * então o `AppContext` recompõe a forma aninhada juntando com a lista de clientes que já
 * carrega de qualquer jeito. Dado idêntico, uma requisição a menos por linha.
 */
export interface PendenciaLista {
  id: number;
  cliente: Cliente;
  tipo: TipoPendencia;
  status: StatusPendencia;
  solicitadoEm: string;
  resolvidoEm: string | null;
  responsavel: UsuarioResumo | null;
}

export interface ProjetoLista {
  id: number;
  cliente: Cliente;
  tipoProjeto: TipoProjeto;
  status: StatusProjeto;
  analistaResponsavel: UsuarioResumo | null;
  dataRecebimento: string | null;
  dataEncaminhado: string | null;
  dataAprovacao: string | null;
  dataInstalacao: string | null;
  potenciaKwp: number | null;
}

// ---------- Vistoria ----------

export type StatusVistoria = 'SOLICITADA' | 'APROVADA' | 'REPROVADA';

export interface Vistoria {
  id: number;
  projetoId: number;
  cliente: ClienteResumo;
  dataSolicitacao: string;
  status: StatusVistoria;
  dataResultado: string | null;
  dataInstalacaoDoProjeto: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Unificação ----------

export interface Unificacao {
  id: number;
  cliente: ClienteResumo;
  cidade: string | null;
  projetista: UsuarioResumo | null;
  informacoes: string | null;
  feita: boolean;
  desligamento: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Histórico ----------

export type EntidadeTipo =
  | 'CLIENTE'
  | 'PENDENCIA'
  | 'DEBITO'
  | 'PROJETO'
  | 'VISTORIA'
  | 'UNIFICACAO';

export interface HistoricoStatus {
  id: number;
  entidadeTipo: EntidadeTipo;
  entidadeId: number;
  statusAnterior: string | null;
  statusNovo: string;
  ocorridoEm: string;
  usuarioId: number | null;
}

// ---------- Envelope de paginação ----------

export interface Pagina<T> {
  conteudo: T[];
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}

// ---------- Dashboard ----------

/**
 * Achatado a partir do `DashboardResponse` da API, que agrupa em `temposMediosEmDias` e
 * `quantitativos`. Os tempos são `number | null`: **nulo significa "não houve caso no
 * período"**, e não zero — mostrar 0 faria o gestor ler "instantâneo" onde não há dado.
 */
export interface KPIStats {
  tempoMedioSemMexerDias: number | null;
  tempoMedioResolucaoPendenciaDias: number | null;
  tempoMedioRecebimentoEnvioDias: number | null;
  tempoMedioParaAprovacaoDias: number | null;
  tempoMedioParadoDebitoDias: number | null;
  tempoMedioInstalacaoVistoriaDias: number | null;
  tempoMedioCicloCompletoDias: number | null;

  pendenciasAbertasNoPeriodo: number;
  pendenciasResolvidas: number;
  projetosEncaminhados: number;
  projetosReencaminhados: number;
  projetosAprovados: number;
  projetosReprovados: number;
  clientesComDebitoParado: number;
  clientesDebitoQuitado: number;
  vistoriasSolicitadas: number;
  vistoriasAprovadas: number;
  vistoriasReprovadas: number;
  unificacoesPendentes: number;
}

export interface PeriodoDashboard {
  de?: string;
  ate?: string;
}

// ---------- Navegação ----------

export type ModuloNavegacao =
  | 'dashboard'
  | 'pendencias'
  | 'debitos'
  | 'projetos'
  | 'vistoria'
  | 'unificacao';

// ---------- Rótulos ----------

/** Os enums da API são chaves; o que o usuário lê fica aqui, num lugar só. */
export const ROTULO_TIPO_PENDENCIA: Record<TipoPendencia, string> = {
  TROCA_TITULARIDADE: 'Troca de Titularidade',
  LIGACAO_NOVA: 'Ligação Nova',
  EXTENSAO_REDE: 'Extensão de Rede',
  OUTRA: 'Outra',
};

export const ROTULO_STATUS_PENDENCIA: Record<StatusPendencia, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

export const ROTULO_TIPO_PROJETO: Record<TipoProjeto, string> = {
  PADRAO: 'Padrão',
  AMPLIACAO: 'Ampliação',
  AUMENTO_POTENCIA: 'Aumento de Potência',
  MUDANCA_INVERSOR: 'Mudança de Inversor',
  PROJETO_UMA_PLACA_A_MAIS: 'Uma Placa a Mais',
  INVERSORES_SEPARADOS: 'Inversores Separados',
};

export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  RECEBIDO: 'Recebido',
  AGUARDANDO_ENVIO: 'Aguardando envio',
  ENCAMINHADO: 'Encaminhado',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  REENCAMINHADO: 'Reencaminhado',
};

export const ROTULO_STATUS_VISTORIA: Record<StatusVistoria, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REPROVADA: 'Reprovada',
};

export const ROTULO_STATUS_DEBITO: Record<StatusDebito, string> = {
  ATIVO: 'Ativo',
  QUITADO: 'Quitado',
};
