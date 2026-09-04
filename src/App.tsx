import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardModule } from './components/modules/DashboardModule';
import { PendenciasModule } from './components/modules/PendenciasModule';
import { DebitosModule } from './components/modules/DebitosModule';
import { ProjetosModule } from './components/modules/ProjetosModule';
import { VistoriaModule } from './components/modules/VistoriaModule';
import { UnificacaoModule } from './components/modules/UnificacaoModule';
import { ToastContainer } from './components/common/Toast';

const MainContent: React.FC = () => {
  const { moduloAtivo, papel } = useApp();

  const renderModulo = () => {
    switch (moduloAtivo) {
      case 'dashboard':
        if (papel === 'ANALISTA') {
          return <PendenciasModule />;
        }
        return <DashboardModule />;
      case 'pendencias':
        return <PendenciasModule />;
      case 'debitos':
        return <DebitosModule />;
      case 'projetos':
        return <ProjetosModule />;
      case 'vistoria':
        return <VistoriaModule />;
      case 'unificacao':
        return <UnificacaoModule />;
      default:
        return <PendenciasModule />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
      {/* Fixed Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Sticky Topbar */}
        <Header />

        {/* Dynamic Page Container */}
        <main className="p-6 md:p-8 max-w-[1440px] w-full mx-auto flex-1">
          {renderModulo()}
        </main>
      </div>

      {/* Realtime Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
