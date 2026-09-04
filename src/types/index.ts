export type Papel = 'ADMINISTRADOR' | 'GESTOR' | 'ANALISTA';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  cargo: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cidade: string;
  vendedor: string;
  data_pagamento: string; // YYYY-MM-DD
  telefone?: string;
  uc_coelba?: string; // Unidade Consumidora Coelba
}

export type TipoPendencia = 
  | 'Troca de Titularidade'
  | 'Ligação Nova'
  | 'Extensão de Rede'
  | 'Adequação de Padrão'
  | 'Ajuste Cadastral Coelba'
  | 'Documentação Pendente';

export type StatusPendencia = 'PENDENTE' | 'EM_ANDAMENTO' | 'RESOLVIDA';

export interface Pendencia {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  tipo: TipoPendencia | string;
  status: StatusPendencia;
  solicitado_em: string;
  resolvido_em: string | null;
  responsavel: string;
  observacao: string;
}

export type StatusDebito = 'ATIVO' | 'QUITADO';

export interface Debito {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  status: StatusDebito;
  ultima_consulta_em: string;
  valor_debito?: number;
  observacao?: string;
}

export type TipoProjeto =
  | 'PADRAO'
  | 'AMPLIACAO'
  | 'AUMENTO_POTENCIA'
  | 'MUDANCA_INVERSOR'
  | 'UMA_PLACA_A_MAIS'
  | 'INVERSORES_SEPARADOS';

export type StatusProjeto = 'ENCAMINHADO' | 'APROVADO' | 'REPROVADO' | 'REENCAMINHADO';

export interface Projeto {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  tipo_projeto: TipoProjeto;
  analista_responsavel: string;
  potencia_kwp: number;
  data_recebimento: string;
  data_art: string | null;
  data_encaminhado: string | null;
  status: StatusProjeto;
  motivo_reprova: string | null;
  data_aprovacao: string | null;
}

export type StatusVistoria = 'SOLICITADA' | 'APROVADA' | 'REPROVADA';

export interface Vistoria {
  id: string;
  projeto_id: string;
  cliente: Cliente;
  tipo_projeto: TipoProjeto;
  data_solicitacao: string;
  status: StatusVistoria;
  data_resultado: string | null;
  observacao?: string;
}

export interface Unificacao {
  id: string;
  cliente_id: string;
  cliente: Cliente;
  cidade: string;
  projetista: string;
  informacoes: string;
  feita: boolean;
  desligamento: boolean;
}

export type ModuloNavegacao = 
  | 'dashboard'
  | 'pendencias'
  | 'debitos'
  | 'projetos'
  | 'vistoria'
  | 'unificacao';

export interface KPIStats {
  tempoMedioSemMexerDias: number;
  tempoMedioResolucaoPendenciaDias: number;
  tempoMedioRecebimentoEnvioDias: number;
  tempoMedioParaAprovacaoDias: number;
  tempoMedioParadoDebitoDias: number;
  tempoMedioCicloCompletoDias: number;
  // Counters
  pendenciasResolvidas: number;
  pendenciasTotal: number;
  projetosAprovados: number;
  projetosReprovados: number;
  projetosEncaminhados: number;
  projetosReencaminhados: number;
  clientesComDebitoParado: number;
  clientesDebitoQuitado: number;
  vistoriasSolicitadas: number;
  vistoriasAprovadas: number;
  vistoriasReprovadas: number;
  unificacoesPendentes: number;
}
