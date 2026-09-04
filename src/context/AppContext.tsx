import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import {
  clientesApi,
  dashboardApi,
  debitosApi,
  pendenciasApi,
  projetosApi,
  unificacoesApi,
  usuariosApi,
  vistoriasApi,
} from '../api/recursos';
import {
  Cliente,
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

  criarCliente: (dados: Partial<Cliente>) => Promise<void>;

  criarPendencia: (dados: {
    clienteId: number;
    tipo: TipoPendencia;
    responsavelId?: number | null;
    observacao?: string | null;
  }) => Promise<void>;
  iniciarPendencia: (id: number) => Promise<void>;
  resolverPendencia: (id: number, observacao?: string) => Promise<void>;
  cancelarPendencia: (id: number, motivo: string) => Promise<void>;
  reabrirPendencia: (id: number) => Promise<void>;

  registrarConsultaDebito: (clienteId: number, status: StatusDebito) => Promise<void>;

  criarProjeto: (dados: {
    clienteId: number;
    tipoProjeto: TipoProjeto;
    analistaResponsavelId?: number | null;
    potenciaKwp?: number | null;
  }) => Promise<void>;
  aguardarEnvioProjeto: (id: number) => Promise<void>;
  encaminharProjeto: (id: number, dataArt?: string | null) => Promise<void>;
  reencaminharProjeto: (id: number) => Promise<void>;
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

  const [moduloAtivo, setModuloAtivoState] = useState<ModuloNavegacao>(
    temPapel('GESTOR', 'ADMINISTRADOR') ? 'dashboard' : 'pendencias',
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
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

  const podeVerDashboard = temPapel('GESTOR', 'ADMINISTRADOR');

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
      ] = await Promise.all([
        clientesApi.listar(),
        usuariosApi.lookup(),
        pendenciasApi.listar(),
        debitosApi.listar(),
        projetosApi.listar(),
        vistoriasApi.listar(),
        unificacoesApi.listar(),
      ]);

      const clientesCarregados = respostaClientes.conteudo;
      const porClienteId = new Map(clientesCarregados.map((c) => [c.id, c]));
      const porUsuarioId = new Map(respostaUsuarios.map((u) => [u.id, u]));

      /** Cliente que a listagem referencia mas que não veio na página de clientes. */
      const clienteDe = (id: number, nome: string): Cliente =>
        porClienteId.get(id) ?? {
          id,
          nome,
          cidade: null,
          vendedor: null,
          dataPagamento: null,
          ucCoelba: null,
          telefone: null,
        };

      setClientes(clientesCarregados);
      setUsuarios(respostaUsuarios);
      setPendencias(
        respostaPendencias.conteudo.map((p: PendenciaResumo) => ({
          id: p.id,
          cliente: clienteDe(p.clienteId, p.clienteNome),
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
          cliente: clienteDe(p.clienteId, p.clienteNome),
          tipoProjeto: p.tipoProjeto,
          status: p.status,
          analistaResponsavel: p.analistaResponsavelId
            ? porUsuarioId.get(p.analistaResponsavelId) ?? null
            : null,
          dataRecebimento: p.dataRecebimento,
          dataEncaminhado: p.dataEncaminhado,
          dataAprovacao: p.dataAprovacao,
          dataInstalacao: p.dataInstalacao,
          potenciaKwp: p.potenciaKwp,
        })),
      );
      setVistorias(respostaVistorias.conteudo);
      setUnificacoes(respostaUnificacoes.conteudo);

      // O dashboard é restrito: para ANALISTA a API responde 403, então nem pedimos.
      if (podeVerDashboard) {
        setKpis(await dashboardApi.metricas(periodoDashboard));
      } else {
        setKpis(null);
      }
    } catch (e) {
      const mensagem =
        e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível carregar os dados';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }, [podeVerDashboard, periodoDashboard]);

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

  const setModuloAtivo = (modulo: ModuloNavegacao) => {
    if (modulo === 'dashboard' && !podeVerDashboard) {
      mostrarToast('Acesso ao Dashboard restrito a Gestor e Administrador', 'alerta');
      return;
    }
    setModuloAtivoState(modulo);
  };

  const valor: AppContextType = {
    papel,
    moduloAtivo,
    setModuloAtivo,

    clientes,
    usuarios,
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

    criarPendencia: (dados) =>
      executar(() => pendenciasApi.criar(dados), 'Pendência aberta'),
    iniciarPendencia: (id) =>
      executar(() => pendenciasApi.iniciar(id), 'Pendência em andamento'),
    resolverPendencia: (id, observacao) =>
      executar(
        () => pendenciasApi.resolver(id, observacao),
        'Pendência resolvida — o projeto do cliente foi criado automaticamente',
      ),
    cancelarPendencia: (id, motivo) =>
      executar(() => pendenciasApi.cancelar(id, motivo), 'Pendência cancelada'),
    reabrirPendencia: (id) =>
      executar(() => pendenciasApi.reabrir(id), 'Pendência reaberta'),

    registrarConsultaDebito: (clienteId, status) =>
      executar(
        () => debitosApi.registrarConsulta(clienteId, status),
        status === 'ATIVO' ? 'Débito registrado' : 'Débito quitado',
      ),

    criarProjeto: (dados) => executar(() => projetosApi.criar(dados), 'Projeto criado'),
    aguardarEnvioProjeto: (id) =>
      executar(() => projetosApi.aguardarEnvio(id), 'Projeto aguardando envio'),
    encaminharProjeto: (id, dataArt) =>
      executar(() => projetosApi.encaminhar(id, dataArt), 'Projeto encaminhado à Coelba'),
    reencaminharProjeto: (id) =>
      executar(() => projetosApi.reencaminhar(id), 'Projeto reencaminhado'),
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
