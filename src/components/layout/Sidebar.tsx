import React from 'react';
import { useApp } from '../../context/AppContext';
import { ModuloNavegacao } from '../../types';
import {
  LayoutDashboard,
  AlertCircle,
  CreditCard,
  FolderGit2,
  CheckSquare,
  Network,
  SunMedium,
  ShieldCheck,
  Building2,
  Users,
  UserCog,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { papel, moduloAtivo, setModuloAtivo, clientes, pendencias, debitos, projetos, vistorias, unificacoes } = useApp();

  /** Fila da etapa 1: cliente que ninguém checou na Coelba ainda. */
  const clientesAguardandoVerificacao = clientes.filter(
    c => c.statusTriagem === 'AGUARDANDO_VERIFICACAO',
  ).length;

  const pendenciasAtivas = pendencias.filter(
    p => p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO',
  ).length;
  /**
   * Clientes travados, não linhas de débito: com um registro por etapa, um cliente devendo nas
   * duas contaria duas vezes e o badge diria o dobro do trabalho que existe.
   */
  const clientesComDebitoAtivo = new Set(
    debitos.filter(d => d.status === 'ATIVO').map(d => d.cliente.id),
  ).size;

  const projetosEmAndamento = projetos.filter(p => p.status !== 'APROVADO').length;

  /**
   * O badge da vistoria soma as duas filas: a que já foi pedida e aguarda a Coelba, e a dos
   * projetos aprovados que ainda nem chegaram a ser solicitados. A segunda é a que se perdia
   * de vista — não aparecia em lugar nenhum antes.
   */
  const vistoriasPendentes =
    vistorias.filter(v => v.status === 'SOLICITADA').length
    + projetos.filter(
      p => p.status === 'APROVADO' && !vistorias.some(v => v.projetoId === p.id),
    ).length;

  const unificacoesPendentes = unificacoes.filter(u => !u.feita).length;

  interface NavItem {
    id: ModuloNavegacao;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'warning' | 'danger' | 'info' | 'default';
    /** Item de administração, fora do fluxo de trabalho. */
    administracao?: boolean;
  }

  /**
   * A ordem é a do trabalho, e a consulta de débito vem logo depois da triagem do cliente
   * (pedido do usuário em 16/09/2026): na prática se checa a agência virtual assim que o
   * cliente entra, e o resultado é o que decide se a pendência anda e se o projeto pode ser
   * enviado. Deixá-la depois de Pendências sugeria uma ordem que a operação não segue.
   *
   * Sem rótulo de etapa: numerar os módulos ("Etapa 2 & 3") descrevia o desenho do processo,
   * não o que a pessoa vai fazer ali.
   */
  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Gerencial',
      icon: LayoutDashboard,
    },
    {
      // Antes de tudo: todos os outros módulos pedem um cliente já cadastrado.
      // O badge é a fila da triagem, não o total — badge aqui significa trabalho a fazer.
      id: 'clientes',
      label: 'Clientes & Triagem',
      icon: Users,
      badge: clientesAguardandoVerificacao,
      badgeVariant: 'warning',
    },
    {
      id: 'debitos',
      label: 'Consulta de Débitos',
      icon: CreditCard,
      badge: clientesComDebitoAtivo,
      badgeVariant: 'danger',
    },
    {
      id: 'pendencias',
      label: 'Pendências Coelba',
      icon: AlertCircle,
      badge: pendenciasAtivas,
      badgeVariant: 'warning',
    },
    {
      id: 'projetos',
      label: 'Homologação de Projetos',
      icon: FolderGit2,
      badge: projetosEmAndamento,
      badgeVariant: 'info',
    },
    {
      id: 'vistoria',
      label: 'Vistorias Técnicas',
      icon: CheckSquare,
      badge: vistoriasPendentes,
      badgeVariant: 'info',
    },
    {
      id: 'unificacao',
      label: 'Unificações & Medição',
      icon: Network,
      badge: unificacoesPendentes,
      badgeVariant: 'warning',
    },
    {
      // Único item restrito da navegação: a API responde 403 para ANALISTA em tudo que a tela
      // faz, então mostrá-la a ele seria oferecer uma porta que não abre.
      id: 'usuarios',
      label: 'Usuários & Acesso',
      icon: UserCog,
      administracao: true,
    },
  ];

  const podeGerenciarUsuarios = papel === 'ADMINISTRADOR' || papel === 'GESTOR';
  const itensVisiveis = items.filter(
    item => !item.administracao || podeGerenciarUsuarios,
  );
  const itensDoFluxo = itensVisiveis.filter(item => !item.administracao);
  const itensDeAdministracao = itensVisiveis.filter(item => item.administracao);

  const renderizarItem = (item: NavItem) => {
    const Icon = item.icon;
    const isAtivo = moduloAtivo === item.id;

    return (
      <button
        key={item.id}
        onClick={() => setModuloAtivo(item.id)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all group ${
          isAtivo
            ? 'bg-solar-primary text-white dark:bg-white/10 dark:text-white'
            : 'text-white/75 hover:bg-white/10 hover:text-white dark:text-texto-suave dark:hover:text-white dark:hover:bg-white/[0.04]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isAtivo
                ? 'text-white dark:text-emerald-400'
                : 'text-white/60 group-hover:text-white dark:text-texto-apagado dark:group-hover:text-white'
            }`}
          />
          <span className="block truncate">{item.label}</span>
        </div>

        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums shrink-0 transition-colors ${
              isAtivo
                ? 'bg-white/90 text-solar-sidebar dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-black/25 text-white/85 group-hover:bg-black/40 dark:bg-white/[0.06] dark:text-texto-suave'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    // Sem sombra: a separação vem da borda, no estilo elegante do Metric.
    <aside className="w-64 bg-solar-sidebar dark:bg-[#0E0F12] text-white flex flex-col shrink-0 h-screen sticky top-0 border-r border-black/25 dark:border-transparent z-30 select-none transition-colors">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-[#1d401f]/80 dark:border-transparent flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#149911] to-[#256D1B] dark:from-emerald-500/25 dark:to-emerald-600/10 flex items-center justify-center text-white shadow-md">
          <SunMedium className="w-5 h-5 text-amber-300 animate-girar-lento" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold text-base tracking-tight text-white">SolarSync</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E] dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.7)]" title="Sistema Ativo" />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/70 dark:text-texto-suave font-normal">
            <Building2 className="w-3 h-3" />
            <span>ConectSol</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-2 pb-2 text-[10px] font-medium tracking-wider text-white/50 dark:text-texto-apagado uppercase">
          Módulos do Fluxo
        </div>

        {itensDoFluxo.map(renderizarItem)}

        {itensDeAdministracao.length > 0 && (
          <>
            <div className="px-2 pt-5 pb-2 text-[10px] font-medium tracking-wider text-white/50 dark:text-texto-apagado uppercase">
              Administração
            </div>
            {itensDeAdministracao.map(renderizarItem)}
          </>
        )}
      </div>

      {/* Footer / Context Info */}
      <div className="p-3 border-t border-[#1d401f]/80 dark:border-transparent bg-[#1e4320]/60 dark:bg-transparent text-xs">
        <div className="p-2.5 rounded-lg bg-black/20 dark:bg-superficie-sutil text-white/80 dark:text-texto-suave flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-medium text-white/50 dark:text-texto-apagado">API SolarSync</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E] dark:bg-emerald-400 dark:shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              Conectada
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/90 dark:text-texto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Papel: <strong className="text-white dark:text-texto font-medium">{papel}</strong></span>
          </div>
        </div>
      </div>
    </aside>
  );
};
