import React, { useEffect, useState } from 'react';
import { Sun, Moon, ArrowRight, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/**
 * A tela de login é o único momento do produto sem sidebar nem topbar, e a primeira coisa que
 * qualquer pessoa vê do sistema. Por isso ela tem cenário próprio — sol baixo, malha de painel,
 * grão — e tipografia de marca (Fraunces) que não aparece em nenhuma outra tela. Os campos, os
 * rótulos e o botão continuam em Inter, no mesmo vocabulário das outras oito telas: o caráter
 * está na moldura, não no formulário.
 *
 * Os tokens `--login-*` vivem em `src/index.css`, escopados em `.tela-login`, e trocam de valor
 * no `.dark`. Nada aqui usa hex cru.
 */

/** "2 min 30 s" ou "45 s" — o suficiente para a pessoa decidir se espera ou vai tomar um café. */
function tempoLegivel(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
}

/**
 * As quatro macro-etapas do fluxo real, nas palavras da operação — as mesmas que a sidebar usa
 * depois do login. Não é texto de vitrine: é o que o sistema faz, e é o que dá à tela um assunto
 * próprio em vez de um card solto no vazio.
 */
const ETAPAS = [
  { n: '01', titulo: 'Triagem', texto: 'Pendência na Coelba conferida e registrada.' },
  { n: '02', titulo: 'Débito', texto: 'Agência virtual consultada antes de cada etapa.' },
  { n: '03', titulo: 'Homologação', texto: 'Projeto enviado, acompanhado e aprovado.' },
  { n: '04', titulo: 'Vistoria', texto: 'Instalação, vistoria e unificação de medidores.' },
];

/** Raios do sol: doze linhas saindo do mesmo centro dos arcos. */
const RAIOS = Array.from({ length: 12 }, (_, i) => {
  const angulo = (i * Math.PI * 2) / 12;
  return {
    x1: 300 + Math.cos(angulo) * 130,
    y1: 300 + Math.sin(angulo) * 130,
    x2: 300 + Math.cos(angulo) * 292,
    y2: 300 + Math.sin(angulo) * 292,
  };
});

export const LoginScreen: React.FC = () => {
  const { entrar, erroLogin, bloqueadoAte } = useAuth();
  const { tema, alternarTema } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  /**
   * O relógio só corre enquanto há bloqueio — um intervalo permanente redesenharia a tela de
   * login a cada segundo pelo resto da sessão sem nada mudar.
   */
  useEffect(() => {
    if (!bloqueadoAte) return;
    setAgora(Date.now());
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [bloqueadoAte]);

  const segundosRestantes = bloqueadoAte
    ? Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000))
    : 0;
  const bloqueado = segundosRestantes > 0;

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

  const classesCampo =
    'w-full rounded-xl border border-[var(--login-campo-borda)] bg-[var(--login-campo)] '
    + 'px-3.5 py-3 text-sm text-[var(--login-tinta)] placeholder:text-[var(--login-tinta-apagada)] '
    + 'transition-[box-shadow,border-color] duration-200 focus:outline-none '
    + 'focus:border-solar-primary focus:ring-[3px] focus:ring-solar-primary/25';

  return (
    <div className="tela-login relative min-h-screen overflow-hidden bg-[var(--login-tela)] text-[var(--login-tinta)]">
      {/* ---- Cenário. Puramente decorativo, fora da árvore de acessibilidade. ---- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="login-halo absolute inset-0 animate-login-halo" />
        <div className="login-malha absolute inset-0" />
        {/* O sol nasce cortado pela quina inferior esquerda: horizonte, não ícone centralizado. */}
        <svg
          viewBox="0 0 600 600"
          fill="none"
          className="absolute -bottom-56 -left-52 h-[560px] w-[560px] animate-login-sol text-[var(--login-linha)] lg:-bottom-64 lg:-left-56 lg:h-[780px] lg:w-[780px]"
        >
          <circle cx="300" cy="300" r="118" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="300" cy="300" r="196" stroke="currentColor" strokeWidth="1" strokeDasharray="2 12" />
          <circle cx="300" cy="300" r="272" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          {RAIOS.map((raio, i) => (
            <line
              key={i}
              x1={raio.x1}
              y1={raio.y1}
              x2={raio.x2}
              y2={raio.y2}
              stroke="currentColor"
              strokeWidth="1"
              opacity={i % 2 === 0 ? 0.5 : 0.22}
            />
          ))}
        </svg>
        <div className="login-grao absolute inset-0" />
      </div>

      {/* ---- Alternador de tema ---- */}
      <button
        onClick={alternarTema}
        type="button"
        title={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        className="absolute right-5 top-5 z-30 flex h-10 w-10 items-center justify-center rounded-full
                   border border-[var(--login-vidro-borda)] bg-[var(--login-vidro)] backdrop-blur
                   text-[var(--login-tinta-suave)] transition-colors hover:text-[var(--login-tinta)]
                   animate-login-sobe [animation-delay:700ms] sm:right-8 sm:top-8"
      >
        {tema === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4" />}
      </button>

      {/*
        Composição assimétrica: a coluna editorial ocupa a maior parte, e o cartão do formulário
        avança para dentro dela (-ml-24 no desktop), passando por cima dos filetes das etapas.
        É a sobreposição que tira o ar de "retângulo centralizado no vazio".
      */}
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.1fr_minmax(420px,0.9fr)]">
        {/* ---- Coluna editorial ---- */}
        <section className="flex flex-col justify-between px-6 pb-10 pt-12 sm:px-12 lg:px-20 lg:py-16 lg:pr-36">
          <div className="animate-login-sobe">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--login-tinta-suave)]">
              ConectSol · Homologação Coelba
            </p>
            <div className="mt-3 flex items-end gap-2.5">
              <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.03em] sm:text-[56px] lg:text-[64px]">
                SolarSync
              </span>
              {/* O mesmo ponto de "sistema ativo" da sidebar — é o único uso do verde-destaque. */}
              <span className="mb-2.5 h-2 w-2 shrink-0 rounded-full bg-solar-primary shadow-[0_0_0_4px_rgba(30,252,30,0.22)] dark:bg-[#1EFC1E]" />
            </div>
          </div>

          <div className="mt-8 max-w-xl sm:mt-12 lg:mt-0">
            <h1 className="animate-login-sobe [animation-delay:120ms] font-display text-[28px] font-light italic leading-[1.2] tracking-[-0.01em] sm:text-[38px] lg:text-[44px]">
              Do aceite do financeiro
              <br className="hidden sm:block" /> à vistoria aprovada.
            </h1>
            <p className="animate-login-sobe [animation-delay:200ms] mt-4 max-w-md text-sm leading-relaxed text-[var(--login-tinta-suave)]">
              Homologação de projetos solares na Coelba, acompanhada etapa por etapa — com o tempo
              de cada uma medido, e ninguém esquecido no meio do caminho.
            </p>

            {/*
              As etapas e o rodapé só aparecem do lg para cima: no telefone elas empurrariam o
              formulário para baixo da dobra, e quem abre a tela vem para entrar, não para ler.
            */}
            <ul className="mt-10 hidden max-w-lg lg:block">
              {ETAPAS.map((etapa, i) => (
                <li key={etapa.n}>
                  {/* O filete se desenha da esquerda para a direita, um a cada 90 ms. */}
                  <div
                    aria-hidden="true"
                    className="animate-login-risco h-px origin-left bg-[var(--login-vidro-borda)]"
                    style={{ animationDelay: `${240 + i * 90}ms` }}
                  />
                  <div
                    className="animate-login-sobe flex items-baseline gap-4 py-3.5"
                    style={{ animationDelay: `${280 + i * 90}ms` }}
                  >
                    <span className="w-5 shrink-0 font-display text-sm tabular-nums text-[var(--login-tinta-apagada)]">
                      {etapa.n}
                    </span>
                    <span className="w-28 shrink-0 text-sm font-medium">{etapa.titulo}</span>
                    <span className="text-xs leading-relaxed text-[var(--login-tinta-suave)]">
                      {etapa.texto}
                    </span>
                  </div>
                </li>
              ))}
              {/* Fecha a lista; o traço segue por baixo do cartão. */}
              <li
                aria-hidden="true"
                className="animate-login-risco [animation-delay:600ms] h-px origin-left bg-[var(--login-vidro-borda)]"
              />
            </ul>
          </div>

          <p className="animate-login-sobe [animation-delay:760ms] mt-12 hidden text-[11px] text-[var(--login-tinta-apagada)] lg:mt-0 lg:block">
            Acesso restrito à equipe da ConectSol.
          </p>
        </section>

        {/* ---- Coluna do formulário ---- */}
        <section className="flex items-center justify-center px-5 pb-14 sm:px-12 lg:z-20 lg:-ml-24 lg:px-0 lg:pb-0">
          <div
            className="animate-login-cartao [animation-delay:180ms] w-full max-w-[420px] rounded-[22px]
                       border border-[var(--login-vidro-borda)] bg-[var(--login-vidro)] p-7
                       shadow-[var(--login-sombra)] backdrop-blur-xl sm:p-9"
          >
            <h2 className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">
              Entrar
            </h2>
            <p className="mt-2 text-xs text-[var(--login-tinta-suave)]">
              E-mail e senha da sua conta ConectSol.
            </p>

            <form onSubmit={enviar} className="mt-7">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--login-tinta-suave)]"
                  >
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={classesCampo}
                    placeholder="voce@conectsol.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="senha"
                    className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--login-tinta-suave)]"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={`${classesCampo} pr-11`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(v => !v)}
                      title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center
                                 rounded-lg text-[var(--login-tinta-apagada)] transition-colors hover:text-[var(--login-tinta)]"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/*
                O bloqueio por tentativas tem aviso próprio, em âmbar e não em vermelho: não é erro
                de quem está digitando, é o servidor dizendo "espere". Mostrado no lugar do erro de
                credencial porque, enquanto dura, a senha nem chega a ser avaliada — dizer "senha
                incorreta" aqui faria a pessoa tentar de novo achando que errou a digitação.
              */}
              {bloqueado ? (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10
                             px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
                >
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Tentativas demais. Aguarde{' '}
                    <strong className="font-medium tabular-nums">{tempoLegivel(segundosRestantes)}</strong>{' '}
                    para tentar de novo. Insistir agora não adianta e não aumenta a espera.
                  </span>
                </div>
              ) : (
                erroLogin && (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10
                               px-3.5 py-3 text-xs leading-relaxed text-rose-800 dark:text-rose-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{erroLogin}</span>
                  </div>
                )
              )}

              <button
                type="submit"
                disabled={enviando || bloqueado}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-solar-primary
                           px-4 py-3 text-sm font-medium text-white shadow-[0_14px_30px_-16px_rgba(20,153,17,0.95)]
                           transition-colors hover:bg-solar-primary-hover
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solar-primary/50
                           focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--login-tela)]
                           disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
              >
                {bloqueado ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span className="tabular-nums">Aguarde {tempoLegivel(segundosRestantes)}</span>
                  </>
                ) : (
                  <>
                    {enviando ? 'Entrando…' : 'Entrar'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/*
              Não há botão de cadastro, e é de propósito: o único caminho de entrada de gente no
              sistema é a tela de Usuários, usada por administrador e gestor. Uma tela de login
              com "criar conta" convidaria a um auto-cadastro que a API recusa.
            */}
            <p className="mt-6 border-t border-[var(--login-vidro-borda)] pt-5 text-[11px] leading-relaxed text-[var(--login-tinta-apagada)]">
              O acesso é criado pelo administrador ou pelo gestor. Esqueceu a senha? Peça a
              redefinição a um deles.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
