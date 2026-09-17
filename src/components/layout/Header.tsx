import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Shield, LogOut, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const { moduloAtivo } = useApp();
  const { usuario, papel, sair } = useAuth();
  const { tema, alternarTema } = useTheme();

  // Sem numeração de etapa nos títulos (pedido do usuário em 16/09/2026): o nome do módulo já
  // diz onde a pessoa está, e "Etapa 2 & 3" descrevia o desenho do processo, não o trabalho.
  const titulosModulo: Record<string, { titulo: string; descricao: string }> = {
    dashboard: {
      titulo: 'Dashboard Gerencial & KPIs',
      descricao: 'Visão consolidada de tempos de ciclo, gargalos e indicadores de homologação',
    },
    clientes: {
      titulo: 'Cadastro de Clientes',
      descricao: 'Base do fluxo: nome, UC Coelba, vendedor e data de pagamento do cliente validado pelo financeiro',
    },
    pendencias: {
      titulo: 'Pendências Coelba',
      descricao: 'Trocas de titularidade, ligações novas e extensões de rede antes do envio do projeto',
    },
    debitos: {
      titulo: 'Consulta e Regularização de Débitos',
      descricao: 'Quem está travado na Agência Virtual, o que o débito trava e há quanto tempo',
    },
    projetos: {
      titulo: 'Homologação de Projetos',
      descricao: 'Controle de ART, envio à concessionária, aprovações e tratamento de reprovas',
    },
    vistoria: {
      titulo: 'Vistorias Técnicas Pós-Instalação',
      descricao: 'Projetos aprovados esperando vistoria, registro da instalação e resultado da concessionária',
    },
    unificacao: {
      titulo: 'Unificações e Desligamentos',
      descricao: 'Controle de unificação de contas contrato e desligamento físico de medidores',
    },
    usuarios: {
      titulo: 'Usuários & Acesso',
      descricao: 'Quem entra no sistema, com que papel e com o acesso ativo ou cortado',
    },
  };

  const infoAtual = titulosModulo[moduloAtivo] || {
    titulo: 'SolarSync',
    descricao: 'Gestão de Homologação Solar',
  };

  return (
    // Sem sombra, como os cards: só a borda separa do conteúdo.
    <header className="bg-superficie border-b border-borda dark:border-transparent sticky top-0 z-20 px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
      {/* Module Title & Context */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#149911] dark:text-emerald-400 uppercase tracking-wider">
            ConectSol Homologação
          </span>
          <span className="text-slate-300 dark:text-texto-apagado">/</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-texto-suave bg-slate-100 dark:bg-white/[0.04] border border-transparent px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1EFC1E] dark:bg-emerald-400 dark:shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Dados ao vivo
          </span>
        </div>
        <h2 className="text-lg font-medium text-slate-800 dark:text-texto tracking-tight mt-0.5">
          {infoAtual.titulo}
        </h2>
        <p className="text-xs text-[#424342] dark:text-texto-suave hidden sm:block">
          {infoAtual.descricao}
        </p>
      </div>

      {/* Right Controls: Current Role & User Profile */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Toggle Modo Escuro */}
        <button
          onClick={alternarTema}
          title={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          className="p-2 rounded-xl border border-slate-200 dark:border-transparent bg-slate-50 dark:bg-superficie-sutil hover:bg-slate-100 dark:hover:bg-superficie-elevada text-slate-600 dark:text-texto-suave hover:text-slate-900 dark:hover:text-texto transition-colors flex items-center justify-center shadow-sm dark:shadow-none"
        >
          {tema === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Current Role Box */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-superficie-sutil border border-slate-200 dark:border-transparent rounded-xl px-3 py-1.5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-1.5 text-xs text-[#424342] dark:text-texto-suave">
            <Shield className="w-3.5 h-3.5 text-[#149911] dark:text-emerald-400" />
            <span className="font-normal">Papel:</span>
          </div>
          <span className="text-xs font-medium text-slate-800 dark:text-texto">{papel}</span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-transparent">
          <div className="w-8 h-8 rounded-full bg-[#244F26] dark:bg-emerald-950/80 text-white dark:text-emerald-300 text-xs font-medium flex items-center justify-center border border-emerald-600/30 dark:border-transparent shadow-sm dark:shadow-none">
            {(usuario?.nome ?? '')
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-medium text-slate-800 dark:text-texto leading-tight">
              {usuario?.nome}
            </div>
            <div className="text-[10px] text-[#424342] dark:text-texto-apagado leading-tight flex items-center gap-1">
              <span>{usuario?.email}</span>
            </div>
          </div>

          <button
            onClick={sair}
            title="Sair do sistema"
            className="p-1.5 text-slate-500 dark:text-texto-apagado hover:text-slate-800 dark:hover:text-texto hover:bg-slate-100 dark:hover:bg-superficie-sutil rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
