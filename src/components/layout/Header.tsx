import React from 'react';
import { useApp } from '../../context/AppContext';
import { Papel } from '../../types';
import { Shield, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { papel, trocarPapel, usuarioAtual, moduloAtivo } = useApp();

  const titulosModulo: Record<string, { titulo: string; descricao: string }> = {
    dashboard: {
      titulo: 'Dashboard Gerencial & KPIs',
      descricao: 'Visão consolidada de tempos de ciclo, gargalos e indicadores de homologação',
    },
    pendencias: {
      titulo: 'Etapa 1 — Entrada e Pendências Coelba',
      descricao: 'Trocas de titularidade, ligações novas e extensões de rede antes do envio do projeto',
    },
    debitos: {
      titulo: 'Etapa 2 — Consulta e Regularização de Débitos',
      descricao: 'Validação na Agência Virtual Coelba para liberação da ART',
    },
    projetos: {
      titulo: 'Etapa 2 & 3 — Homologação de Projetos',
      descricao: 'Controle de ART, envio à concessionária, aprovações e tratamento de reprovas',
    },
    vistoria: {
      titulo: 'Etapa 4 — Vistorias Técnicas Pós-Instalação',
      descricao: 'Acompanhamento do resultado de vistoria e liberação para troca de medidor / pós-venda',
    },
    unificacao: {
      titulo: 'Etapa 4 — Unificações e Desligamentos',
      descricao: 'Controle de unificação de contas contrato e desligamento físico de medidores',
    },
  };

  const infoAtual = titulosModulo[moduloAtivo] || {
    titulo: 'SolarSync',
    descricao: 'Gestão de Homologação Solar',
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
      {/* Module Title & Context */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#149911] uppercase tracking-wider">
            ConectSol Homologação
          </span>
          <span className="text-slate-300">/</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E]" />
            Protótipo UI/UX
          </span>
        </div>
        <h2 className="text-lg font-medium text-slate-800 tracking-tight mt-0.5">
          {infoAtual.titulo}
        </h2>
        <p className="text-xs text-[#424342] hidden sm:block">
          {infoAtual.descricao}
        </p>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Role Selector Box */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#424342]">
            <Shield className="w-3.5 h-3.5 text-[#149911]" />
            <span className="font-normal">Simular Papel:</span>
          </div>

          <div className="relative">
            <select
              value={papel}
              onChange={(e) => trocarPapel(e.target.value as Papel)}
              className="appearance-none bg-white text-xs font-medium text-slate-800 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-[#149911] focus:border-[#149911] cursor-pointer"
            >
              <option value="GESTOR">GESTOR (Visão Total + KPIs)</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR (Total)</option>
              <option value="ANALISTA">ANALISTA (Operacional)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#244F26] text-white text-xs font-medium flex items-center justify-center border border-emerald-600/30 shadow-xs">
            {usuarioAtual.nome
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-800 leading-tight">
              {usuarioAtual.nome}
            </div>
            <div className="text-[10px] text-[#424342] leading-tight flex items-center gap-1">
              <span>{usuarioAtual.cargo}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
