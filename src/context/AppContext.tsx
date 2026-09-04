import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  Cliente,
  Debito,
  KPIStats,
  ModuloNavegacao,
  Papel,
  Pendencia,
  Projeto,
  StatusDebito,
  StatusPendencia,
  StatusProjeto,
  StatusVistoria,
  Unificacao,
  Usuario,
  Vistoria,
} from '../types';
import {
  MOCK_CLIENTES,
  MOCK_DEBITOS,
  MOCK_PENDENCIAS,
  MOCK_PROJETOS,
  MOCK_UNIFICACOES,
  MOCK_USUARIOS,
  MOCK_VISTORIAS,
} from '../data/mockData';

interface ToastInfo {
  id: string;
  tipo: 'sucesso' | 'info' | 'alerta';
  mensagem: string;
}

interface AppContextType {
  papel: Papel;
  usuarioAtual: Usuario;
  trocarPapel: (novoPapel: Papel) => void;
  moduloAtivo: ModuloNavegacao;
  setModuloAtivo: (modulo: ModuloNavegacao) => void;
  
  // Entities
  clientes: Cliente[];
  pendencias: Pendencia[];
  debitos: Debito[];
  projetos: Projeto[];
  vistorias: Vistoria[];
  unificacoes: Unificacao[];

  // Mutations
  adicionarPendencia: (p: Omit<Pendencia, 'id'>) => void;
  atualizarStatusPendencia: (id: string, novoStatus: StatusPendencia, resolvidoEm?: string) => void;
  atualizarPendencia: (p: Pendencia) => void;

  alternarStatusDebito: (id: string) => void;
  atualizarDebito: (d: Debito) => void;

  adicionarProjeto: (proj: Omit<Projeto, 'id'>) => void;
  atualizarStatusProjeto: (id: string, status: StatusProjeto, motivoReprova?: string | null, dataAprovacao?: string | null) => void;
  atualizarProjeto: (proj: Projeto) => void;

  adicionarVistoria: (v: Omit<Vistoria, 'id'>) => void;
  atualizarStatusVistoria: (id: string, status: StatusVistoria, dataResultado?: string | null) => void;
  atualizarVistoria: (v: Vistoria) => void;

  alternarUnificacaoFeita: (id: string) => void;
  alternarUnificacaoDesligamento: (id: string) => void;
  atualizarUnificacao: (u: Unificacao) => void;
  adicionarUnificacao: (u: Omit<Unificacao, 'id'>) => void;

  // KPIs
  kpis: KPIStats;

  // Feedback Toast
  toasts: ToastInfo[];
  removerToast: (id: string) => void;
  mostrarToast: (mensagem: string, tipo?: 'sucesso' | 'info' | 'alerta') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [papel, setPapel] = useState<Papel>('GESTOR');
  const [moduloAtivo, setModuloAtivoState] = useState<ModuloNavegacao>('dashboard');

  const [clientes] = useState<Cliente[]>(MOCK_CLIENTES);
  const [pendencias, setPendencias] = useState<Pendencia[]>(MOCK_PENDENCIAS);
  const [debitos, setDebitos] = useState<Debito[]>(MOCK_DEBITOS);
  const [projetos, setProjetos] = useState<Projeto[]>(MOCK_PROJETOS);
  const [vistorias, setVistorias] = useState<Vistoria[]>(MOCK_VISTORIAS);
  const [unificacoes, setUnificacoes] = useState<Unificacao[]>(MOCK_UNIFICACOES);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'info' | 'alerta' = 'sucesso') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, tipo, mensagem }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removerToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const usuarioAtual = useMemo(() => {
    const usuario = MOCK_USUARIOS.find(u => u.papel === papel);
    return usuario || MOCK_USUARIOS[1]; // fallback Igor (GESTOR)
  }, [papel]);

  const trocarPapel = (novoPapel: Papel) => {
    setPapel(novoPapel);
    if (novoPapel === 'ANALISTA' && moduloAtivo === 'dashboard') {
      setModuloAtivoState('pendencias');
    }
    mostrarToast(`Papel alterado para: ${novoPapel}`, 'info');
  };

  const setModuloAtivo = (modulo: ModuloNavegacao) => {
    if (papel === 'ANALISTA' && modulo === 'dashboard') {
      mostrarToast('Acesso ao Dashboard restrito a Gestor e Administrador', 'alerta');
      return;
    }
    setModuloAtivoState(modulo);
  };

  // Mutations
  const adicionarPendencia = (nova: Omit<Pendencia, 'id'>) => {
    const id = `pen-${Date.now()}`;
    setPendencias(prev => [{ id, ...nova }, ...prev]);
    mostrarToast(`Pendência cadastrada para ${nova.cliente.nome}!`);
  };

  const atualizarStatusPendencia = (id: string, novoStatus: StatusPendencia, resolvidoEm?: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    setPendencias(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              status: novoStatus,
              resolvido_em: novoStatus === 'RESOLVIDA' ? (resolvidoEm || hoje) : null,
            }
          : p
      )
    );
    mostrarToast(`Status da pendência atualizado para ${novoStatus}`);
  };

  const atualizarPendencia = (p: Pendencia) => {
    setPendencias(prev => prev.map(item => (item.id === p.id ? p : item)));
    mostrarToast('Pendência atualizada com sucesso!');
  };

  const alternarStatusDebito = (id: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    setDebitos(prev =>
      prev.map(d => {
        if (d.id === id) {
          const novoStatus: StatusDebito = d.status === 'ATIVO' ? 'QUITADO' : 'ATIVO';
          const novoValor = novoStatus === 'QUITADO' ? 0 : (d.valor_debito || 1200);
          return {
            ...d,
            status: novoStatus,
            valor_debito: novoValor,
            ultima_consulta_em: hoje,
          };
        }
        return d;
      })
    );
    mostrarToast('Status de débito atualizado na agência virtual Coelba');
  };

  const atualizarDebito = (d: Debito) => {
    setDebitos(prev => prev.map(item => (item.id === d.id ? d : item)));
    mostrarToast('Registro de débito atualizado!');
  };

  const adicionarProjeto = (novo: Omit<Projeto, 'id'>) => {
    const id = `proj-${Date.now()}`;
    setProjetos(prev => [{ id, ...novo }, ...prev]);
    mostrarToast(`Projeto cadastrado para ${novo.cliente.nome}!`);
  };

  const atualizarStatusProjeto = (
    id: string,
    status: StatusProjeto,
    motivoReprova?: string | null,
    dataAprovacao?: string | null
  ) => {
    const hoje = new Date().toISOString().split('T')[0];
    setProjetos(prev =>
      prev.map(proj => {
        if (proj.id === id) {
          return {
            ...proj,
            status,
            motivo_reprova: status === 'REPROVADO' ? (motivoReprova || 'Exigência técnica Coelba') : null,
            data_aprovacao: status === 'APROVADO' ? (dataAprovacao || hoje) : null,
          };
        }
        return proj;
      })
    );
    mostrarToast(`Projeto marcado como ${status}`);
  };

  const atualizarProjeto = (p: Projeto) => {
    setProjetos(prev => prev.map(item => (item.id === p.id ? p : item)));
    mostrarToast('Dados do projeto atualizados!');
  };

  const adicionarVistoria = (novo: Omit<Vistoria, 'id'>) => {
    const id = `vis-${Date.now()}`;
    setVistorias(prev => [{ id, ...novo }, ...prev]);
    mostrarToast(`Vistoria solicitada para ${novo.cliente.nome}!`);
  };

  const atualizarStatusVistoria = (id: string, status: StatusVistoria, dataResultado?: string | null) => {
    const hoje = new Date().toISOString().split('T')[0];
    setVistorias(prev =>
      prev.map(v => {
        if (v.id === id) {
          return {
            ...v,
            status,
            data_resultado: status !== 'SOLICITADA' ? (dataResultado || hoje) : null,
          };
        }
        return v;
      })
    );
    mostrarToast(`Vistoria atualizada para ${status}`);
  };

  const atualizarVistoria = (v: Vistoria) => {
    setVistorias(prev => prev.map(item => (item.id === v.id ? v : item)));
    mostrarToast('Vistoria atualizada!');
  };

  const alternarUnificacaoFeita = (id: string) => {
    setUnificacoes(prev =>
      prev.map(u => (u.id === id ? { ...u, feita: !u.feita } : u))
    );
    mostrarToast('Status de unificação alterado!');
  };

  const alternarUnificacaoDesligamento = (id: string) => {
    setUnificacoes(prev =>
      prev.map(u => (u.id === id ? { ...u, desligamento: !u.desligamento } : u))
    );
    mostrarToast('Status de desligamento de medidor alterado!');
  };

  const atualizarUnificacao = (u: Unificacao) => {
    setUnificacoes(prev => prev.map(item => (item.id === u.id ? u : item)));
    mostrarToast('Dados de unificação atualizados!');
  };

  const adicionarUnificacao = (novo: Omit<Unificacao, 'id'>) => {
    const id = `uni-${Date.now()}`;
    setUnificacoes(prev => [{ id, ...novo }, ...prev]);
    mostrarToast(`Registro de unificação cadastrado para ${novo.cliente.nome}!`);
  };

  // Dynamic calculated KPIs
  const kpis = useMemo<KPIStats>(() => {
    const pendenciasResolvidas = pendencias.filter(p => p.status === 'RESOLVIDA').length;
    const pendenciasTotal = pendencias.length;

    const projetosAprovados = projetos.filter(p => p.status === 'APROVADO').length;
    const projetosReprovados = projetos.filter(p => p.status === 'REPROVADO').length;
    const projetosEncaminhados = projetos.filter(p => p.status === 'ENCAMINHADO').length;
    const projetosReencaminhados = projetos.filter(p => p.status === 'REENCAMINHADO').length;

    const clientesComDebitoParado = debitos.filter(d => d.status === 'ATIVO').length;
    const clientesDebitoQuitado = debitos.filter(d => d.status === 'QUITADO').length;

    const vistoriasSolicitadas = vistorias.filter(v => v.status === 'SOLICITADA').length;
    const vistoriasAprovadas = vistorias.filter(v => v.status === 'APROVADA').length;
    const vistoriasReprovadas = vistorias.filter(v => v.status === 'REPROVADA').length;

    const unificacoesPendentes = unificacoes.filter(u => !u.feita).length;

    return {
      tempoMedioSemMexerDias: 1.8,
      tempoMedioResolucaoPendenciaDias: 4.6,
      tempoMedioRecebimentoEnvioDias: 3.2,
      tempoMedioParaAprovacaoDias: 14.1,
      tempoMedioParadoDebitoDias: 6.5,
      tempoMedioCicloCompletoDias: 29.4,
      pendenciasResolvidas,
      pendenciasTotal,
      projetosAprovados,
      projetosReprovados,
      projetosEncaminhados,
      projetosReencaminhados,
      clientesComDebitoParado,
      clientesDebitoQuitado,
      vistoriasSolicitadas,
      vistoriasAprovadas,
      vistoriasReprovadas,
      unificacoesPendentes,
    };
  }, [pendencias, debitos, projetos, vistorias, unificacoes]);

  return (
    <AppContext.Provider
      value={{
        papel,
        usuarioAtual,
        trocarPapel,
        moduloAtivo,
        setModuloAtivo,
        clientes,
        pendencias,
        debitos,
        projetos,
        vistorias,
        unificacoes,
        adicionarPendencia,
        atualizarStatusPendencia,
        atualizarPendencia,
        alternarStatusDebito,
        atualizarDebito,
        adicionarProjeto,
        atualizarStatusProjeto,
        atualizarProjeto,
        adicionarVistoria,
        atualizarStatusVistoria,
        atualizarVistoria,
        alternarUnificacaoFeita,
        alternarUnificacaoDesligamento,
        atualizarUnificacao,
        adicionarUnificacao,
        kpis,
        toasts,
        removerToast,
        mostrarToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
