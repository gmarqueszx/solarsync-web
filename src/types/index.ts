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

/**
 * Cadastro completo, da tela de Usuários. Diferente de `UsuarioResumo`, que é só o que os
 * seletores de responsável precisam e é liberado a todos os papéis.
 *
 * `temSenha` vem do backend em vez do hash (que nunca sai da API): serve para a tela avisar
 * quem ainda não consegue entrar. Desde a remoção do login Google, a senha é obrigatória no
 * cadastro, então só contas antigas aparecem sem ela.
 */
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  temSenha: boolean;
  papeis: Papel[];
}

/**
 * Resultado da checagem de pendência na Coelba (etapa 1). `AGUARDANDO_VERIFICACAO` é a fila de
 * trabalho: "sem pendência" precisa ser um fato registrado, senão não se distingue de
 * "ninguém olhou ainda".
 */
export type StatusTriagem = 'AGUARDANDO_VERIFICACAO' | 'COM_PENDENCIA' | 'SEM_PENDENCIA';

/**
 * De onde o cadastro veio. A triagem mostra isso porque a confiança nos dados é diferente: o
 * cliente do CRM chega com cidade e vendedor normalizados contra as listas do cadastro, e o que
 * não casou chega **nulo** — campo vazio ali significa "o CRM não sabia" e pede o preenchimento
 * de alguém. Num cadastro manual, campo vazio é esquecimento.
 */
export type OrigemCliente = 'MANUAL' | 'CRM_NECTAR';

/**
 * Os selos ao lado do nome do cliente. Vêm **prontos do backend**, derivados da origem e da flag
 * de banco — a tela não os monta. É o que garante, por construção, que rodar a importação de novo
 * não duplica etiqueta: uma lista calculada a cada leitura não tem como acumular repetição.
 */
export type EtiquetaCliente = 'CRM' | 'BANCO';

/**
 * Por que o cliente foi posto na frente. `INSTALACAO_ADIANTADA` é o único que exige data: a usina
 * já está montada, e a data informada vira a `dataInstalacao` do projeto — que é o que a etapa de
 * vistoria lê e exige. Os outros são pedidos de pressa, sem fato de campo associado.
 */
export type MotivoPrioridade =
  | 'INSTALACAO_ADIANTADA'
  | 'PRAZO_CONTRATUAL'
  | 'PRAZO_DO_CLIENTE'
  | 'OUTRO';

export interface Cliente {
  id: number;
  nome: string;
  cidade: string | null;
  vendedor: string | null;
  dataPagamento: string | null;
  ucCoelba: string | null;
  telefone: string | null;
  statusTriagem: StatusTriagem;
  origem: OrigemCliente;
  /** Id da oportunidade no Nectar; serve para achar o negócio no CRM. Nulo no cadastro manual. */
  nectarOportunidadeId: string | null;
  /** Derivadas no servidor; a tela só desenha. */
  etiquetas: EtiquetaCliente[];
  /** Sobe o cliente ao topo da fila da etapa em que ele estiver, e das seguintes. */
  prioridade: boolean;
  prioridadeMotivo: MotivoPrioridade | null;
  prioridadeObservacao: string | null;
  prioridadeDefinidaEm: string | null;
  prioridadeDefinidaPor: UsuarioResumo | null;
  /** Só com motivo `INSTALACAO_ADIANTADA`. Já copiada para o projeto do cliente. */
  prioridadeDataInstalacao: string | null;
  /** Fluxo curto: entrada → pendência → resolvida → fim. Nenhum projeto nasce. */
  somentePendencia: boolean;
  /** Projeto pago por financiamento: muda só a etapa de destino no Nectar. */
  banco: boolean;
}

export interface ClienteResumo {
  id: number;
  nome: string;
  cidade: string | null;
  ucCoelba: string | null;
  /** As duas do resumo que mudam o que a tela **faz** com a linha, não só o que mostra. */
  prioridade: boolean;
  somentePendencia: boolean;
}

/**
 * O que o formulário de cliente envia — o mesmo corpo no POST e no PUT. Só `nome` é obrigatório
 * no contrato; o resto o analista costuma descobrir depois, e exigir tudo na criação travaria o
 * cadastro do cliente que acabou de chegar do comercial.
 *
 * Fora do tipo: `id`, atribuído pela API, e `statusTriagem`, que só muda pelos endpoints de
 * ação (`/sem-pendencia`, `/reverificar`) — corrigir o telefone não pode, de passagem, apagar
 * o fato de que a Coelba já foi consultada. Fora também `origem` e `nectarOportunidadeId`, que
 * são a procedência do registro: editar o cadastro não pode fazer um cliente do CRM passar por
 * cadastro manual.
 */
export type DadosCliente = Pick<
  Cliente,
  | 'nome'
  | 'cidade'
  | 'vendedor'
  | 'dataPagamento'
  | 'ucCoelba'
  | 'telefone'
  | 'somentePendencia'
  | 'banco'
>;

/**
 * O corpo de `POST /api/clientes/{id}/prioridade`. `dataInstalacao` é obrigatória só com
 * `INSTALACAO_ADIANTADA` — a API responde 409 `PRIORIDADE_SEM_INSTALACAO` sem ela, e o formulário
 * a exige antes de chegar lá.
 */
export interface DadosPrioridade {
  motivo: MotivoPrioridade;
  observacao?: string | null;
  dataInstalacao?: string | null;
}

// ---------- Pendência ----------

export type TipoPendencia =
  | 'TROCA_TITULARIDADE'
  | 'LIGACAO_NOVA'
  | 'EXTENSAO_REDE'
  | 'AUMENTO_CARGA'
  | 'MUDANCA_PADRAO'
  | 'DESMEMBRAMENTO'
  | 'REGULARIZACAO_CADASTRAL'
  | 'DEBITO_VINCULADO'
  | 'ADEQUACAO_TECNICA'
  | 'OUTRA';

/**
 * Um único estado ativo. Apontar a pendência na triagem do cliente já é iniciá-la — não existe
 * pendência identificada que ainda não foi solicitada —, então o antigo `EM_ANDAMENTO` e o
 * botão de "play" que levava até ele saíram: era um clique que não mudava nada, já que o tempo
 * de resolução sempre saiu de `solicitadoEm`, gravado na criação.
 */
export type StatusPendencia = 'ABERTA' | 'RESOLVIDA' | 'CANCELADA';

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
  clientePrioritario: boolean;
  tipo: TipoPendencia;
  status: StatusPendencia;
  solicitadoEm: string;
  resolvidoEm: string | null;
  responsavelId: number | null;
  responsavelNome: string | null;
}

// ---------- Débito ----------

export type StatusDebito = 'ATIVO' | 'QUITADO';

/**
 * Que etapa o débito trava — não a natureza da dívida. São registros separados: o cliente pode
 * estar quitado para a pendência e devendo para a homologação, e é essa distinção que diz ao
 * financeiro onde atacar. Um cliente tem no máximo um registro de cada tipo.
 */
export type TipoDebito = 'PENDENCIA' | 'HOMOLOGACAO';

export interface Debito {
  id: number;
  cliente: ClienteResumo;
  tipo: TipoDebito;
  status: StatusDebito;
  ultimaConsultaEm: string | null;
  /** Quando o débito foi constatado; é o começo do relógio de `diasParado`. */
  detectadoEm: string | null;
  quitadoEm: string | null;
  /**
   * Vencimento da próxima conta, informado na consulta que constatou a quitação. Nulo é
   * **"não informado"**, que é diferente de "não existe próxima" — a tela diz isso por extenso em
   * vez de inventar uma data.
   */
  proximoVencimento: string | null;
  /** Nulo quando não está ATIVO — nulo é "não está parado", não "parado há zero dias". */
  diasParado: number | null;
  consultadoPor: UsuarioResumo | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Projeto ----------

/** Só três na operação real; os outros da planilha eram casos operacionais, não tipos. */
export type TipoProjeto = 'PROJETO_INICIAL' | 'AMPLIACAO' | 'CORRECAO';

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
  /** Número que a Coelba devolve ao receber o projeto; casa o retorno por e-mail. */
  numeroSolicitacao: string | null;
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
  clientePrioritario: boolean;
  clienteBanco: boolean;
  tipoProjeto: TipoProjeto;
  status: StatusProjeto;
  analistaResponsavelId: number | null;
  analistaResponsavelNome: string | null;
  dataRecebimento: string | null;
  dataEncaminhado: string | null;
  numeroSolicitacao: string | null;
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
  numeroSolicitacao: string | null;
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

/**
 * O desligamento do medidor unificado é um ciclo de solicitar e aguardar retorno, não um
 * liga-desliga: terminada a instalação, confere-se a unificação e, se houve, pede-se o
 * desligamento. `OS_ABERTA` é o desvio para quando a equipe de campo não realiza.
 */
export type StatusDesligamento = 'NAO_SOLICITADO' | 'SOLICITADO' | 'OS_ABERTA' | 'CONCLUIDO';

export interface Unificacao {
  id: number;
  cliente: ClienteResumo;
  cidade: string | null;
  projetista: UsuarioResumo | null;
  informacoes: string | null;
  feita: boolean;
  desligamentoStatus: StatusDesligamento;
  desligamentoSolicitadoEm: string | null;
  desligamentoConcluidoEm: string | null;
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
  /** Recorte por pessoa que a API aplicou; nulo é a equipe inteira. */
  analistaId: number | null;
  analistaNome: string | null;
  tempoMedioSemMexerDias: number | null;
  tempoMedioResolucaoPendenciaDias: number | null;
  tempoMedioRecebimentoEnvioDias: number | null;
  tempoMedioParaAprovacaoDias: number | null;
  tempoMedioParadoDebitoDias: number | null;
  tempoMedioInstalacaoVistoriaDias: number | null;
  tempoMedioEsperaDesligamentoDias: number | null;
  tempoMedioCicloCompletoDias: number | null;

  pendenciasAbertasNoPeriodo: number;
  pendenciasResolvidas: number;
  projetosEncaminhados: number;
  projetosReencaminhados: number;
  projetosAprovados: number;
  projetosReprovados: number;
  clientesComDebitoParado: number;
  clientesTravadosNaPendencia: number;
  clientesTravadosNaHomologacao: number;
  clientesDebitoQuitado: number;
  vistoriasSolicitadas: number;
  vistoriasAprovadas: number;
  vistoriasReprovadas: number;
  unificacoesPendentes: number;
  desligamentosAguardando: number;
  desligamentosComOsAberta: number;
  desligamentosConcluidos: number;

  /** Nulo só quando a API ainda não devolve a seção (backend anterior a 30/09/2026). */
  situacaoPorEtapa: SituacaoPorEtapa | null;
}

/**
 * Quantos estão parados em cada etapa **agora**, na ordem do fluxo. Ignora o período e o
 * analista: é a fila de todos, e metade das etapas (a triagem, principalmente) não tem dono.
 */
export interface SituacaoPorEtapa {
  triagem: number;
  pendencias: number;
  projetosAFazer: number;
  projetosAguardandoEnvio: number;
  projetosEmAnalise: number;
  projetosEmCorrecao: number;
  aguardandoVistoria: number;
  vistoriasEmAnalise: number;
}

/**
 * Recortes do dashboard. `de`/`ate` são datas puras (`YYYY-MM-DD`), como o input nativo entrega.
 * `analistaId` ausente é a equipe inteira.
 */
export interface PeriodoDashboard {
  de?: string;
  ate?: string;
  analistaId?: number;
}

// ---------- Navegação ----------

export type ModuloNavegacao =
  | 'dashboard'
  | 'clientes'
  | 'pendencias'
  | 'debitos'
  | 'projetos'
  | 'vistoria'
  | 'unificacao'
  /** Só ADMINISTRADOR e GESTOR: é o único caminho de entrada de gente no sistema. */
  | 'usuarios';

// ---------- Rótulos ----------

/** Os enums da API são chaves; o que o usuário lê fica aqui, num lugar só. */
export const ROTULO_STATUS_TRIAGEM: Record<StatusTriagem, string> = {
  AGUARDANDO_VERIFICACAO: 'Falta checar',
  COM_PENDENCIA: 'Com pendência',
  SEM_PENDENCIA: 'Sem pendência',
};

export const ROTULO_TIPO_PENDENCIA: Record<TipoPendencia, string> = {
  TROCA_TITULARIDADE: 'Troca de Titularidade',
  LIGACAO_NOVA: 'Ligação Nova',
  EXTENSAO_REDE: 'Extensão de Rede',
  AUMENTO_CARGA: 'Aumento de Carga',
  MUDANCA_PADRAO: 'Reforma / Mudança de Padrão',
  DESMEMBRAMENTO: 'Desmembramento',
  REGULARIZACAO_CADASTRAL: 'Regularização Cadastral',
  DEBITO_VINCULADO: 'Débito Vinculado',
  ADEQUACAO_TECNICA: 'Vistoria Reprovada / Adequação Técnica',
  OUTRA: 'Outra',
};

export const ROTULO_STATUS_PENDENCIA: Record<StatusPendencia, string> = {
  ABERTA: 'Aberta',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

export const TIPOS_PROJETO: TipoProjeto[] = ['PROJETO_INICIAL', 'AMPLIACAO', 'CORRECAO'];

export const ROTULO_TIPO_PROJETO: Record<TipoProjeto, string> = {
  PROJETO_INICIAL: 'Projeto Inicial',
  AMPLIACAO: 'Ampliação de Projeto Existente',
  CORRECAO: 'Correção de Projeto',
};

export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  RECEBIDO: 'Recebido',
  AGUARDANDO_ENVIO: 'Feito, aguardando envio',
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

export const ROTULO_TIPO_DEBITO: Record<TipoDebito, string> = {
  PENDENCIA: 'Trava a pendência',
  HOMOLOGACAO: 'Trava a homologação',
};

/** Versão curta, para caber na coluna da tabela ao lado do nome do cliente. */
export const ROTULO_TIPO_DEBITO_CURTO: Record<TipoDebito, string> = {
  PENDENCIA: 'Pendência',
  HOMOLOGACAO: 'Homologação',
};

export const TIPOS_DEBITO: TipoDebito[] = ['PENDENCIA', 'HOMOLOGACAO'];

export const MOTIVOS_PRIORIDADE: MotivoPrioridade[] = [
  'INSTALACAO_ADIANTADA',
  'PRAZO_CONTRATUAL',
  'PRAZO_DO_CLIENTE',
  'OUTRO',
];

export const ROTULO_MOTIVO_PRIORIDADE: Record<MotivoPrioridade, string> = {
  INSTALACAO_ADIANTADA: 'Instalação adiantada',
  PRAZO_CONTRATUAL: 'Prazo menor em contrato',
  PRAZO_DO_CLIENTE: 'Prazo específico do cliente',
  OUTRO: 'Outra situação',
};

export const ROTULO_ETIQUETA_CLIENTE: Record<EtiquetaCliente, string> = {
  CRM: 'CRM',
  BANCO: 'Banco',
};

export const ROTULO_STATUS_DESLIGAMENTO: Record<StatusDesligamento, string> = {
  NAO_SOLICITADO: 'A solicitar',
  SOLICITADO: 'Aguardando equipe',
  OS_ABERTA: 'O.S. aberta',
  CONCLUIDO: 'Desligado',
};
