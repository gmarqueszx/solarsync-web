import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import {
  clientesApi,
  dashboardApi,
  debitosApi,
  pendenciasApi,
  projetosApi,
  Referencias,
  referenciasApi,
  unificacoesApi,
  usuariosApi,
  vistoriasApi,
} from '../api/recursos';
import {
  Cliente,
  DadosCliente,
  DadosPrioridade,
  Debito,
  KPIStats,
  ModuloNavegacao,
  Papel,
  PendenciaLista,
  PendenciaResumo,
  PeriodoDashboard,
  ProjetoLista,
  ProjetoResumo,
  StatusDebito,
  TipoDebito,
  TipoPendencia,
  TipoProjeto,
  Unificacao,
  UsuarioResumo,
  Vistoria,
} from '../types';
import { useAuth } from './AuthContext';

interface ToastInfo {
  id: string;
  tipo: 'sucesso' | 'info' | 'alerta';
  mensagem: string;
}

interface AppContextType {
  papel: Papel;
  moduloAtivo: ModuloNavegacao;
  setModuloAtivo: (modulo: ModuloNavegacao) => void;

  clientes: Cliente[];
  usuarios: UsuarioResumo[];
  /** Listas fechadas do cadastro (municípios da Bahia, vendedores), servidas pelo backend. */
  referencias: Referencias;
  pendencias: PendenciaLista[];
  debitos: Debito[];
  projetos: ProjetoLista[];
  vistorias: Vistoria[];
  unificacoes: Unificacao[];
  kpis: KPIStats | null;

  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  periodoDashboard: PeriodoDashboard;
  setPeriodoDashboard: (periodo: PeriodoDashboard) => void;

  criarCliente: (dados: DadosCliente) => Promise<void>;
  atualizarCliente: (id: number, dados: DadosCliente) => Promise<void>;
  marcarSemPendencia: (id: number) => Promise<void>;
  reverificarCliente: (id: number) => Promise<void>;
  /**
   * Adianta o cliente. Chamar de novo revisa o motivo — não é preciso remover antes. Com motivo
   * `INSTALACAO_ADIANTADA` a data vai junto e vira a `dataInstalacao` do projeto, que é o que a
   * etapa de vistoria exige; não é um segundo campo de data.
   */
  marcarPrioridade: (id: number, dados: DadosPrioridade) => Promise<void>;
  removerPrioridade: (id: number) => Promise<void>;

  criarPendencia: (dados: {
    clienteId: number;
    tipo: TipoPendencia;
    responsavelId?: number | null;
    observacao?: string | null;
  }) => Promise<void>;
  /**
   * Edita os dados da pendência — na prática, a observação. Vale em **qualquer** status: a
   * observação é o parecer do que aconteceu na Coelba, e travá-la depois de resolver faria o
   * registro parar de contar a história justamente quando ela fica completa.
   */
  atualizarPendencia: (
    id: number,
    dados: { tipo: TipoPendencia; responsavelId?: number | null; observacao?: string | null },
  ) => Promise<void>;
  resolverPendencia: (id: number, observacao?: string) => Promise<void>;
  cancelarPendencia: (id: number, motivo: string) => Promise<void>;
  reabrirPendencia: (id: number) => Promise<void>;

  /**
   * `proximoVencimento` só acompanha a quitação: é a data da próxima conta vista na mesma
   * consulta. O servidor a ignora com débito ATIVO, porque aí não há "próxima" — há a atual.
   */
  registrarConsultaDebito: (
    clienteId: number,
    tipo: TipoDebito,
    status: StatusDebito,
    proximoVencimento?: string | null,
  ) => Promise<void>;

  criarProjeto: (dados: {
    clienteId: number;
    tipoProjeto: TipoProjeto;
    analistaResponsavelId?: number | null;
    potenciaKwp?: number | null;
  }) => Promise<void>;
  aguardarEnvioProjeto: (id: number) => Promise<void>;
  /**
   * O `numeroSolicitacao` vem **antes** da `dataArt` e não é opcional de propósito: ele é
   * obrigatório na API desde 17/09/2026 (é a chave que casa o retorno por e-mail da Coelba com
   * o projeto), e assim o próprio TypeScript recusa a chamada sem ele — em vez de descobrirmos
   * com um 400 em produção.
   */
  encaminharProjeto: (
    id: number,
    numeroSolicitacao: string,
    dataArt?: string | null,
  ) => Promise<void>;
  reencaminharProjeto: (id: number, numeroSolicitacao: string) => Promise<void>;
  aprovarProjeto: (id: number) => Promise<void>;
  reprovarProjeto: (id: number, motivo: string) => Promise<void>;
  registrarInstalacao: (id: number, dataInstalacao: string) => Promise<void>;

  solicitarVistoria: (projetoId: number) => Promise<void>;
  aprovarVistoria: (id: number) => Promise<void>;
  reprovarVistoria: (id: number) => Promise<void>;
  resolicitarVistoria: (id: number, projetoId: number) => Promise<void>;

  criarUnificacao: (dados: {
    clienteId: number;
    projetistaId?: number | null;
    informacoes?: string | null;
  }) => Promise<void>;
  concluirUnificacao: (id: number) => Promise<void>;
  reabrirUnificacao: (id: number) => Promise<void>;
  solicitarDesligamento: (id: number) => Promise<void>;
  abrirOrdemDeServico: (id: number) => Promise<void>;
  concluirDesligamento: (id: number) => Promise<void>;

  toasts: ToastInfo[];
  removerToast: (id: string) => void;
  mostrarToast: (mensagem: string, tipo?: 'sucesso' | 'info' | 'alerta') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { papel, temPapel } = useAuth();

  /**
   * Só a tela de entrada muda por papel: o gestor abre no dashboard, o analista na fila de
   * pendências, que é o trabalho dele. **Não é restrição** — o dashboard é aberto a todos
   * desde 09/09/2026, e o analista chega nele pela sidebar como em qualquer outro módulo.
   */
  const [moduloAtivo, setModuloAtivoState] = useState<ModuloNavegacao>(
    temPapel('GESTOR', 'ADMINISTRADOR') ? 'dashboard' : 'pendencias',
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  /**
   * Listas fechadas do cadastro, servidas pelo backend. Vinham de `src/data/constantes.ts`;
   * passaram para o servidor porque a importação do Nectar normaliza cidade e vendedor contra o
   * mesmo padrão, e duas cópias divergem. Vazias até a primeira carga — os campos de seleção
   * aparecem sem opção por um instante, o que é melhor que uma cópia local que envelhece.
   */
  const [referencias, setReferencias] = useState<Referencias>({
    municipios: [],
    vendedores: [],
  });
  const [pendencias, setPendencias] = useState<PendenciaLista[]>([]);
  const [debitos, setDebitos] = useState<Debito[]>([]);
  const [projetos, setProjetos] = useState<ProjetoLista[]>([]);
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [unificacoes, setUnificacoes] = useState<Unificacao[]>([]);
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [periodoDashboard, setPeriodoDashboard] = useState<PeriodoDashboard>({});

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const mostrarToast = useCallback(
    (mensagem: string, tipo: 'sucesso' | 'info' | 'alerta' = 'sucesso') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, tipo, mensagem }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    },
    [],
  );

  const removerToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /**
   * Carrega tudo de uma vez e guarda em memória, mantendo o modelo do protótipo (listas no
   * contexto) — as telas do SolarSync são filas de trabalho de dezenas a centenas de linhas,
   * não catálogos. Se o volume crescer a ponto de incomodar, o caminho é paginar por módulo.
   */
  const recarregar = useCallback(async () => {
    setErro(null);
    try {
      const [
        respostaClientes,
        respostaUsuarios,
        respostaPendencias,
        respostaDebitos,
        respostaProjetos,
        respostaVistorias,
        respostaUnificacoes,
        respostaReferencias,
      ] = await Promise.all([
        clientesApi.listar(),
        usuariosApi.lookup(),
        pendenciasApi.listar(),
        debitosApi.listar(),
        projetosApi.listar(),
        vistoriasApi.listar(),
        unificacoesApi.listar(),
        referenciasApi.listar(),
      ]);

      const clientesCarregados = respostaClientes.conteudo;
      const porClienteId = new Map(clientesCarregados.map((c) => [c.id, c]));
      const porUsuarioId = new Map(respostaUsuarios.map((u) => [u.id, u]));

      /**
       * Cliente que a listagem referencia mas que não veio na página de clientes.
       *
       * `prioritario` e `banco` chegam achatados na própria linha da listagem, então o palpite
       * some justamente para as duas coisas que mudam o comportamento da tela — a posição na fila
       * e a etapa de destino no Nectar.
       */
      const clienteDe = (
        id: number,
        nome: string,
        prioritario = false,
        banco = false,
      ): Cliente =>
        porClienteId.get(id) ?? {
          id,
          nome,
          cidade: null,
          vendedor: null,
          dataPagamento: null,
          ucCoelba: null,
          telefone: null,
          etiquetas: banco ? ['BANCO'] : [],
          prioridade: prioritario,
          prioridadeMotivo: null,
          prioridadeObservacao: null,
          prioridadeDefinidaEm: null,
          prioridadeDefinidaPor: null,
          prioridadeDataInstalacao: null,
          // Sem a página do cliente não se sabe se o fluxo dele é curto; `false` é o palpite que
          // não esconde etapa nenhuma de ninguém.
          somentePendencia: false,
          banco,
          // Cliente fora da página carregada: não se sabe a triagem dele. COM_PENDENCIA é o
          // palpite honesto — ele aparece numa listagem de pendência/projeto, então foi
          // checado —, e nunca o coloca por engano na fila de "falta checar".
          statusTriagem: 'COM_PENDENCIA',
          // Cliente que não veio na página: não se sabe a procedência, e MANUAL é o palpite que
          // não afirma nada de errado — o selo de CRM só aparece quando há o id do Nectar.
          origem: 'MANUAL',
          nectarOportunidadeId: null,
        };

      setClientes(clientesCarregados);
      setUsuarios(respostaUsuarios);
      setReferencias(respostaReferencias);
      setPendencias(
        respostaPendencias.conteudo.map((p: PendenciaResumo) => ({
          id: p.id,
          cliente: clienteDe(p.clienteId, p.clienteNome, p.clientePrioritario),
          tipo: p.tipo,
          status: p.status,
          solicitadoEm: p.solicitadoEm,
          resolvidoEm: p.resolvidoEm,
          responsavel: p.responsavelId ? porUsuarioId.get(p.responsavelId) ?? null : null,
        })),
      );
      setDebitos(respostaDebitos.conteudo);
      setProjetos(
        respostaProjetos.conteudo.map((p: ProjetoResumo) => ({
          id: p.id,
          cliente: clienteDe(p.clienteId, p.clienteNome, p.clientePrioritario, p.clienteBanco),
          tipoProjeto: p.tipoProjeto,
          status: p.status,
          analistaResponsavel: p.analistaResponsavelId
            ? porUsuarioId.get(p.analistaResponsavelId) ?? null
            : null,
          dataRecebimento: p.dataRecebimento,
          dataEncaminhado: p.dataEncaminhado,
          numeroSolicitacao: p.numeroSolicitacao,
          dataAprovacao: p.dataAprovacao,
          dataInstalacao: p.dataInstalacao,
          potenciaKwp: p.potenciaKwp,
        })),
      );
      setVistorias(respostaVistorias.conteudo);
      setUnificacoes(respostaUnificacoes.conteudo);

      // O dashboard é aberto a todos os papéis desde 09/09/2026: pedimos sempre.
      setKpis(await dashboardApi.metricas(periodoDashboard));
    } catch (e) {
      const mensagem =
        e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível carregar os dados';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }, [periodoDashboard]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /**
   * Toda mutação recarrega os dados depois. É deliberadamente simples: uma ação pode ter efeito
   * em cascata que só o servidor conhece — resolver pendência cria projeto, quitar débito
   * libera o envio —, e atualizar só a linha alterada deixaria a tela mentindo sobre o resto.
   */
  const executar = useCallback(
    async (acao: () => Promise<unknown>, mensagemSucesso: string) => {
      try {
        await acao();
        await recarregar();
        mostrarToast(mensagemSucesso);
      } catch (e) {
        // As regras de negócio chegam como 409 com mensagem pronta (cliente com débito,
        // projeto sem instalação, transição inválida). Mostrá-las cruas é melhor do que
        // traduzir: é o servidor explicando por que a ação não pôde acontecer.
        const mensagem =
          e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível concluir a ação';
        mostrarToast(mensagem, 'alerta');
        throw e;
      }
    },
    [recarregar, mostrarToast],
  );

  const setModuloAtivo = setModuloAtivoState;

  const valor: AppContextType = {
    papel,
    moduloAtivo,
    setModuloAtivo,

    clientes,
    usuarios,
    referencias,
    pendencias,
    debitos,
    projetos,
    vistorias,
    unificacoes,
    kpis,

    carregando,
    erro,
    recarregar,
    periodoDashboard,
    setPeriodoDashboard,

    criarCliente: (dados) =>
      executar(() => clientesApi.criar(dados), 'Cliente cadastrado'),
    atualizarCliente: (id, dados) =>
      executar(() => clientesApi.atualizar(id, dados), 'Cadastro do cliente atualizado'),
    marcarSemPendencia: (id) =>
      executar(
        () => clientesApi.marcarSemPendencia(id),
        'Cliente sem pendência na Coelba — o projeto foi criado e ele entrou na fila de '
          + 'consulta de débito',
      ),
    reverificarCliente: (id) =>
      executar(() => clientesApi.reverificar(id), 'Cliente devolvido à fila de verificação'),

    marcarPrioridade: (id, dados) =>
      executar(
        () => clientesApi.marcarPrioridade(id, dados),
        dados.motivo === 'INSTALACAO_ADIANTADA'
          ? 'Prioridade registrada — a data de instalação foi para o projeto e a vistoria já '
            + 'pode ser solicitada quando ele for aprovado'
          : 'Prioridade registrada — o cliente sobe ao topo da fila em que estiver',
      ),
    removerPrioridade: (id) =>
      executar(
        () => clientesApi.removerPrioridade(id),
        'Prioridade encerrada — o cliente volta à ordem normal',
      ),

    criarPendencia: (dados) =>
      // "Aberta" já é "em andamento": apontar a pendência na triagem é iniciar a solicitação.
      executar(() => pendenciasApi.criar(dados), 'Pendência aberta — solicitação em andamento'),
    atualizarPendencia: (id, dados) =>
      executar(() => pendenciasApi.atualizar(id, dados), 'Observações salvas'),
    resolverPendencia: (id, observacao) =>
      executar(
        () => pendenciasApi.resolver(id, observacao),
        'Pendência resolvida — o projeto do cliente foi criado automaticamente',
      ),
    cancelarPendencia: (id, motivo) =>
      executar(() => pendenciasApi.cancelar(id, motivo), 'Pendência cancelada'),
    reabrirPendencia: (id) =>
      executar(() => pendenciasApi.reabrir(id), 'Pendência reaberta'),

    registrarConsultaDebito: (clienteId, tipo, status, proximoVencimento) =>
      executar(
        () => debitosApi.registrarConsulta(clienteId, tipo, status, undefined, proximoVencimento),
        status === 'ATIVO'
          ? `Débito registrado — ${
              tipo === 'PENDENCIA' ? 'trava a pendência' : 'trava a homologação'
            }`
          : 'Débito quitado',
      ),

    criarProjeto: (dados) => executar(() => projetosApi.criar(dados), 'Projeto criado'),
    aguardarEnvioProjeto: (id) =>
      executar(() => projetosApi.aguardarEnvio(id), 'Projeto aguardando envio'),
    encaminharProjeto: (id, numeroSolicitacao, dataArt) =>
      executar(
        () => projetosApi.encaminhar(id, dataArt, undefined, numeroSolicitacao),
        'Projeto encaminhado à Coelba',
      ),
    reencaminharProjeto: (id, numeroSolicitacao) =>
      executar(
        () => projetosApi.reencaminhar(id, undefined, numeroSolicitacao),
        'Projeto reencaminhado',
      ),
    aprovarProjeto: (id) => executar(() => projetosApi.aprovar(id), 'Projeto aprovado'),
    reprovarProjeto: (id, motivo) =>
      executar(() => projetosApi.reprovar(id, motivo), 'Reprova registrada'),
    registrarInstalacao: (id, dataInstalacao) =>
      executar(
        () => projetosApi.registrarInstalacao(id, dataInstalacao),
        'Instalação registrada',
      ),

    solicitarVistoria: (projetoId) =>
      executar(() => vistoriasApi.solicitar(projetoId), 'Vistoria solicitada'),
    aprovarVistoria: (id) => executar(() => vistoriasApi.aprovar(id), 'Vistoria aprovada'),
    reprovarVistoria: (id) => executar(() => vistoriasApi.reprovar(id), 'Vistoria reprovada'),
    resolicitarVistoria: (id, projetoId) =>
      executar(() => vistoriasApi.resolicitar(id, projetoId), 'Vistoria solicitada novamente'),

    criarUnificacao: (dados) =>
      executar(() => unificacoesApi.criar(dados), 'Unificação registrada'),
    concluirUnificacao: (id) =>
      executar(() => unificacoesApi.concluir(id), 'Unificação concluída'),
    reabrirUnificacao: (id) =>
      executar(() => unificacoesApi.reabrir(id), 'Unificação reaberta'),
    solicitarDesligamento: (id) =>
      executar(
        () => unificacoesApi.solicitarDesligamento(id),
        'Desligamento solicitado — aguardando a equipe de campo',
      ),
    abrirOrdemDeServico: (id) =>
      executar(() => unificacoesApi.abrirOrdemDeServico(id), 'O.S. registrada'),
    concluirDesligamento: (id) =>
      executar(() => unificacoesApi.concluirDesligamento(id), 'Medidor desligado'),

    toasts,
    removerToast,
    mostrarToast,
  };

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const contexto = useContext(AppContext);
  if (!contexto) throw new Error('useApp precisa estar dentro de AppProvider');
  return contexto;
};
