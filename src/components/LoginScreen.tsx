import React, { useState } from 'react';
import { Sun, Moon, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { entrar, erroLogin } = useAuth();
  const { tema, alternarTema } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch {
      // A mensagem já vem do contexto; aqui só liberamos o botão.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-solar-bg px-4 relative">
      <button
        onClick={alternarTema}
        type="button"
        title={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        className="absolute top-4 right-4 p-2.5 rounded-xl border border-slate-200 dark:border-borda bg-white dark:bg-superficie text-slate-600 dark:text-texto-suave hover:text-slate-900 dark:hover:text-texto shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-superficie-elevada transition-colors"
      >
        {tema === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-solar-primary flex items-center justify-center shadow-sm">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-solar-darkest dark:text-texto tracking-tight">SolarSync</h1>
            <p className="text-sm text-solar-neutral dark:text-texto-suave">ConectSol</p>
          </div>
        </div>

        <form
          onSubmit={enviar}
          className="bg-white dark:bg-superficie rounded-card shadow-card dark:shadow-none border border-slate-200/80 dark:border-borda p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-solar-neutral dark:text-texto-suave mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-borda bg-white dark:bg-superficie-sutil text-sm text-slate-800 dark:text-texto
                         focus:outline-none focus:ring-2 focus:ring-solar-primary/30
                         focus:border-solar-primary transition"
              placeholder="voce@conectsol.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-solar-neutral dark:text-texto-suave mb-1.5">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-borda bg-white dark:bg-superficie-sutil text-sm text-slate-800 dark:text-texto
                         focus:outline-none focus:ring-2 focus:ring-solar-primary/30
                         focus:border-solar-primary transition"
              placeholder="••••••••"
            />
          </div>

          {erroLogin && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10
                         border border-rose-200/80 dark:border-rose-500/20 rounded-lg px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erroLogin}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 bg-solar-primary
                       hover:bg-solar-primary-hover disabled:opacity-60
                       disabled:cursor-not-allowed text-white font-medium text-sm
                       rounded-lg px-4 py-2.5 transition"
          >
            <LogIn className="w-4 h-4" />
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          {/*
            Não há botão de cadastro, e é de propósito: o único caminho de entrada de gente no
            sistema é a tela de Usuários, usada por administrador e gestor. Uma tela de login
            com "criar conta" convidaria a um auto-cadastro que a API recusa.
          */}
          <p className="text-xs text-solar-neutral text-center pt-1">
            O acesso é criado pelo administrador ou pelo gestor. Esqueceu a senha? Peça a
            redefinição a um deles.
          </p>
        </form>
      </div>
    </div>
  );
};
