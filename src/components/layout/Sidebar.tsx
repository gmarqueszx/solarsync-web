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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { papel, moduloAtivo, setModuloAtivo, pendencias, debitos, projetos, vistorias, unificacoes } = useApp();

  const pendenciasAtivas = pendencias.filter(p => p.status !== 'RESOLVIDA').length;
  const debitosAtivos = debitos.filter(d => d.status === 'ATIVO').length;
  const projetosEmAndamento = projetos.filter(p => p.status !== 'APROVADO').length;
  const vistoriasPendentes = vistorias.filter(v => v.status === 'SOLICITADA').length;
  const unificacoesPendentes = unificacoes.filter(u => !u.feita).length;

  interface NavItem {
    id: ModuloNavegacao;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'warning' | 'danger' | 'info' | 'default';
    etapa?: string;
    restritoGestor?: boolean;
  }

  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Gerencial',
      icon: LayoutDashboard,
      restritoGestor: true,
    },
    {
      id: 'pendencias',
      label: 'Pendências Coelba',
      icon: AlertCircle,
      badge: pendenciasAtivas,
      badgeVariant: 'warning',
      etapa: 'Etapa 1',
    },
    {
      id: 'debitos',
      label: 'Consulta de Débitos',
      icon: CreditCard,
      badge: debitosAtivos,
      badgeVariant: 'danger',
      etapa: 'Etapa 2',
    },
    {
      id: 'projetos',
      label: 'Homologação de Projetos',
      icon: FolderGit2,
      badge: projetosEmAndamento,
      badgeVariant: 'info',
      etapa: 'Etapas 2 & 3',
    },
    {
      id: 'vistoria',
      label: 'Vistorias Técnicas',
      icon: CheckSquare,
      badge: vistoriasPendentes,
      badgeVariant: 'info',
      etapa: 'Etapa 4',
    },
    {
      id: 'unificacao',
      label: 'Unificações & Medição',
      icon: Network,
      badge: unificacoesPendentes,
      badgeVariant: 'warning',
      etapa: 'Etapa 4',
    },
  ];

  // Filter items based on role (ANALISTA does not see dashboard)
  const itensVisiveis = items.filter(item => {
    if (item.restritoGestor && papel === 'ANALISTA') {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-[#244F26] text-white flex flex-col shrink-0 h-screen sticky top-0 border-r border-[#1d401f] shadow-xl z-30 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-[#1d401f]/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#149911] to-[#256D1B] flex items-center justify-center text-white shadow-md border border-white/20">
          <SunMedium className="w-5 h-5 text-amber-300 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold text-base tracking-tight text-white">SolarSync</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E]" title="Sistema Ativo" />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/70 font-normal">
            <Building2 className="w-3 h-3" />
            <span>ConectSol · Coelba</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-2 pb-2 text-[10px] font-medium tracking-wider text-white/50 uppercase">
          Módulos do Fluxo
        </div>

        {itensVisiveis.map(item => {
          const Icon = item.icon;
          const isAtivo = moduloAtivo === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setModuloAtivo(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all group ${
                isAtivo
                  ? 'bg-[#149911] text-white shadow-sm'
                  : 'text-white/80 hover:bg-[#256D1B] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isAtivo ? 'text-white' : 'text-white/70 group-hover:text-white'
                  }`}
                />
                <div className="truncate">
                  <span className="block truncate">{item.label}</span>
                  {item.etapa && (
                    <span className="text-[10px] opacity-70 block font-normal leading-tight">
                      {item.etapa}
                    </span>
                  )}
                </div>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isAtivo
                      ? 'bg-white text-[#244F26]'
                      : 'bg-black/25 text-white/90 group-hover:bg-black/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Context Info */}
      <div className="p-3 border-t border-[#1d401f]/80 bg-[#1e4320]/60 text-xs">
        <div className="p-2.5 rounded-lg bg-black/20 text-white/80 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-medium text-white/50">Conexão Coelba</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E]" />
              Mock Ativo
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/90">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Papel: <strong className="text-white font-medium">{papel}</strong></span>
          </div>
        </div>
      </div>
    </aside>
  );
};
