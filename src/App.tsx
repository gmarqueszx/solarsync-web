import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardModule } from './components/modules/DashboardModule';
import { ClientesModule } from './components/modules/ClientesModule';
import { PendenciasModule } from './components/modules/PendenciasModule';
import { DebitosModule } from './components/modules/DebitosModule';
import { ProjetosModule } from './components/modules/ProjetosModule';
import { VistoriaModule } from './components/modules/VistoriaModule';
import { UnificacaoModule } from './components/modules/UnificacaoModule';
import { UsuariosModule } from './components/modules/UsuariosModule';
import { ToastContainer } from './components/common/Toast';

const MainContent: React.FC = () => {
  const { moduloAtivo, carregando, erro, recarregar } = useApp();

  const renderModulo = () => {
    switch (moduloAtivo) {
      case 'dashboard':
        return <DashboardModule />;
      case 'clientes':
        return <ClientesModule />;
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
      case 'usuarios':
        return <UsuariosModule />;
      default:
        return <PendenciasModule />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <main className="p-6 md:p-8 max-w-[1440px] w-full mx-auto flex-1">
          {carregando ? (
            <div className="flex items-center justify-center py-24 text-solar-neutral text-sm">
              Carregando dados…
            </div>
          ) : erro ? (
            <div className="bg-white rounded-card shadow-card p-8 text-center">
              <p className="text-sm text-red-700 mb-4">{erro}</p>
              <button
                onClick={() => recarregar()}
                className="text-sm font-medium text-solar-primary hover:text-solar-primary-hover"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            renderModulo()
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

/** Só monta o AppProvider depois de autenticado: sem token, toda chamada tomaria 401. */
const Autenticado: React.FC = () => {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-solar-bg
                   text-solar-neutral text-sm"
      >
        Verificando sessão…
      </div>
    );
  }

  if (!usuario) return <LoginScreen />;

  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <Autenticado />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
