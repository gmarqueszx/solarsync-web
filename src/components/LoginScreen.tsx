import React, { useState } from 'react';
import { Sun, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { entrar, erroLogin } = useAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-solar-bg px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-solar-primary flex items-center justify-center">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-solar-darkest">SolarSync</h1>
            <p className="text-sm text-solar-neutral">ConectSol</p>
          </div>
        </div>

        <form
          onSubmit={enviar}
          className="bg-white rounded-card shadow-card p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-solar-neutral mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-solar-primary/30
                         focus:border-solar-primary transition"
              placeholder="voce@conectsol.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-solar-neutral mb-1.5">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-solar-primary/30
                         focus:border-solar-primary transition"
              placeholder="••••••••"
            />
          </div>

          {erroLogin && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-red-700 bg-red-50
                         border border-red-100 rounded-lg px-3 py-2.5"
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
            O login com Google já existe na API (POST /api/auth/login/google), mas depende de um
            Client ID do Google Cloud que ainda não foi criado. Quando existir, entra aqui um
            botão do Google Identity Services chamando entrarComGoogle(idToken).
          */}
          <p className="text-xs text-solar-neutral text-center pt-1">
            O acesso é criado pelo administrador. Login com Google chega quando a conta do
            Google Cloud estiver configurada.
          </p>
        </form>
      </div>
    </div>
  );
};
