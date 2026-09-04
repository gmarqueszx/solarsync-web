import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, armazenamentoDeToken, registrarPerdaDeSessao } from '../api/client';
import { authApi } from '../api/recursos';
import { Papel, UsuarioLogado } from '../types';

interface AuthContextType {
  usuario: UsuarioLogado | null;
  /** Papel de maior alcance do usuário — decide o que a sidebar mostra. */
  papel: Papel;
  carregando: boolean;
  erroLogin: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  entrarComGoogle: (idToken: string) => Promise<void>;
  sair: () => void;
  temPapel: (...papeis: Papel[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Da mais alta para a mais baixa: um ADMINISTRADOR também enxerga o que o GESTOR enxerga. */
const PRECEDENCIA: Papel[] = ['ADMINISTRADOR', 'GESTOR', 'ANALISTA'];

function papelPrincipal(usuario: UsuarioLogado | null): Papel {
  if (!usuario) return 'ANALISTA';
  return PRECEDENCIA.find((p) => usuario.papeis.includes(p)) ?? 'ANALISTA';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const sair = useCallback(() => {
    // Não há logout no servidor: a API é stateless, o cliente descarta os tokens.
    armazenamentoDeToken.limpar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    registrarPerdaDeSessao(() => setUsuario(null));
  }, []);

  /**
   * Na abertura, valida o token guardado chamando /auth/eu em vez de confiar no que está no
   * localStorage: o usuário pode ter sido desativado desde o último acesso, e aí o certo é cair
   * na tela de login em vez de mostrar uma interface que vai dar 401 em cada clique.
   */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!armazenamentoDeToken.access()) {
        setCarregando(false);
        return;
      }
      try {
        const eu = await authApi.eu();
        if (!cancelado) setUsuario(eu);
      } catch {
        armazenamentoDeToken.limpar();
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const aplicarLogin = (resposta: Awaited<ReturnType<typeof authApi.login>>) => {
    armazenamentoDeToken.guardar(resposta.accessToken, resposta.refreshToken);
    setUsuario(resposta.usuario);
    setErroLogin(null);
  };

  const entrar = async (email: string, senha: string) => {
    setErroLogin(null);
    try {
      aplicarLogin(await authApi.login(email, senha));
    } catch (erro) {
      // A API devolve a mesma mensagem para todos os motivos, de propósito: diferenciar
      // permitiria descobrir quais e-mails têm conta.
      setErroLogin(
        erro instanceof ApiError ? erro.mensagemAmigavel : 'Não foi possível entrar',
      );
      throw erro;
    }
  };

  const entrarComGoogle = async (idToken: string) => {
    setErroLogin(null);
    try {
      aplicarLogin(await authApi.loginGoogle(idToken));
    } catch (erro) {
      setErroLogin(
        erro instanceof ApiError ? erro.mensagemAmigavel : 'Não foi possível entrar',
      );
      throw erro;
    }
  };

  const papel = papelPrincipal(usuario);
  const temPapel = (...papeis: Papel[]) =>
    !!usuario && papeis.some((p) => usuario.papeis.includes(p));

  return (
    <AuthContext.Provider
      value={{ usuario, papel, carregando, erroLogin, entrar, entrarComGoogle, sair, temPapel }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return contexto;
};
