/** @type {import('tailwindcss').Config} */

/**
 * Duas famílias de cor, com papéis diferentes:
 *
 * - `solar.*` — a **marca**: a escala verde derivada de #149911. Fixa nos dois temas, porque
 *   verde de marca não muda de identidade no escuro.
 * - `superficie / borda / texto / fundo` — a **interface**: apontam para variáveis CSS
 *   definidas em `index.css`, que trocam de valor no `.dark`. É o que permite escrever
 *   `bg-superficie` uma vez e funcionar nos dois temas.
 *
 * Antes, os componentes escreviam o hex cru (`bg-[#149911]`, `bg-white`) e o modo escuro era
 * um bloco de ~165 linhas de `html.dark .bg-\[\#F4F6F8\] { ... !important }` casando com o
 * texto literal da classe — qualquer refatoração o quebrava em silêncio.
 */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        solar: {
          50: '#f0fdf1',
          100: '#dcfce0',
          200: '#bbf7c3',
          300: '#86ef96',
          400: '#4ade62',
          500: '#22c53f',
          // A cor da marca. 600 porque é o ponto da escala com contraste AA em fundo claro.
          600: '#149911',
          700: '#1b7d18',
          800: '#256D1B',
          900: '#244F26',
          950: '#0c3b10',
          primary: '#149911',
          'primary-hover': '#256D1B',
          dark: '#244F26',
          sidebar: '#244F26',
          neutral: '#424342',
          /** Só indicador ativo e badge "novo" — nunca fundo de botão nem texto. */
          accent: '#1EFC1E',
          surface: '#FFFFFF',
          bg: '#F4F6F8',
          darkest: '#13151A',
        },

        fundo: 'var(--fundo)',
        superficie: {
          DEFAULT: 'var(--superficie)',
          elevada: 'var(--superficie-elevada)',
          sutil: 'var(--superficie-sutil)',
        },
        borda: {
          DEFAULT: 'var(--borda)',
          forte: 'var(--borda-forte)',
        },
        texto: {
          DEFAULT: 'var(--texto)',
          suave: 'var(--texto-suave)',
          apagado: 'var(--texto-apagado)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        /**
         * Fonte de marca, não de interface: só a tela de login a usa (wordmark e chamada).
         * O resto do sistema continua em Inter — trocar a tipografia de uma tabela de
         * trabalho por serifa seria personalidade no lugar errado.
         */
        display: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontSize: {
        /** Rótulo de KPI e legenda de linha: menor que o `text-xs` do Tailwind. */
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        /** O número dos cards de KPI. */
        kpi: ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        /**
         * Sombra quase invisível. A hierarquia vem da borda de 1px, não da elevação — é o que
         * dá o ar de painel de dados em vez de cartão flutuante.
         */
        'card': '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card-hover': '0 2px 8px 0 rgba(16, 24, 40, 0.06)',
      },
      borderRadius: {
        'card': '14px',
      },
      /**
       * Curvas de movimento, num lugar só.
       *
       * `suave` é a curva de saída rápida usada em tudo que **entra** (card, tela, modal): sai
       * do lugar depressa e desacelera no fim, que é o que o olho lê como "assentou" em vez de
       * "parou". `saida` é a inversa, para o que some — sumir devagar é o que faz uma interface
       * parecer travada.
       */
      transitionTimingFunction: {
        suave: 'cubic-bezier(0.22, 1, 0.36, 1)',
        saida: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        // Os três tempos do sistema: toque, transição de estado, entrada de tela.
        120: '120ms',
        180: '180ms',
        320: '320ms',
      },
      keyframes: {
        'girar-lento': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'surgir': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },

        /* --- Movimento do painel (ver src/index.css, seção "Movimento") --- */
        'esmaecer': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sair-esmaecer': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        /** Troca de módulo: o conteúdo sobe um passo curto enquanto aparece. */
        'entrar-tela': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        /*
          `entrar-cartao` não está aqui de propósito: quem a usa é a classe `.escalonar` do
          index.css, e o Tailwind só emite `@keyframes` de animações citadas no markup por uma
          utilitária `animate-*`. Declará-la aqui daria a impressão de que funciona. Os
          keyframes dela ficam no index.css, ao lado da regra que os consome.
        */
        /** Diálogo: cresce do centro, nunca desliza de fora da tela. */
        'entrar-dialogo': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sair-dialogo': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
        },
        /** Aviso: entra pela direita, de onde ele fica. */
        'entrar-aviso': {
          from: { opacity: '0', transform: 'translateX(18px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sair-aviso': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateX(18px) scale(0.98)' },
        },
        /**
         * A linha do gráfico se desenha da esquerda para a direita. Depende de `pathLength={1}`
         * no `<path>`: sem isso o `stroke-dasharray` estaria em unidades de comprimento real e
         * cada série precisaria de um valor diferente.
         */
        'desenhar': {
          from: { strokeDasharray: '1', strokeDashoffset: '1' },
          to: { strokeDasharray: '1', strokeDashoffset: '0' },
        },
        /** Barra que cresce do zero. `origin-left` fica na classe, não aqui. */
        'crescer-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        /** Troca do ícone sol/lua no botão de tema. */
        'girar-entrada': {
          from: { opacity: '0', transform: 'rotate(-90deg) scale(0.6)' },
          to: { opacity: '1', transform: 'none' },
        },

        /* --- Entrada da tela de login (ver src/index.css, seção `.tela-login`) --- */
        'login-sobe': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'login-cartao': {
          from: { opacity: '0', transform: 'translateY(26px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        /** Os filetes das etapas se desenham da esquerda para a direita. */
        'login-risco': {
          from: { opacity: '0', transform: 'scaleX(0)' },
          to: { opacity: '1', transform: 'scaleX(1)' },
        },
        'login-halo': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        /** O sol da sidebar. Antes a classe existia sem keyframes e não fazia nada. */
        'girar-lento': 'girar-lento 18s linear infinite',
        'surgir': 'surgir 180ms ease-out',

        'esmaecer': 'esmaecer 200ms ease-out both',
        'sair-esmaecer': 'sair-esmaecer 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'entrar-tela': 'entrar-tela 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'entrar-dialogo': 'entrar-dialogo 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sair-dialogo': 'sair-dialogo 150ms cubic-bezier(0.4, 0, 1, 1) both',
        'entrar-aviso': 'entrar-aviso 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sair-aviso': 'sair-aviso 180ms cubic-bezier(0.4, 0, 1, 1) both',
        'desenhar': 'desenhar 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'crescer-x': 'crescer-x 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'girar-entrada': 'girar-entrada 260ms cubic-bezier(0.22, 1, 0.36, 1) both',

        /**
         * `both` é o que importa: com fill-mode nos dois lados, o elemento já nasce no estado
         * inicial durante o `animation-delay` — sem isso ele pisca visível antes de começar.
         */
        'login-sobe': 'login-sobe 760ms cubic-bezier(0.16, 0.84, 0.34, 1) both',
        'login-cartao': 'login-cartao 880ms cubic-bezier(0.16, 0.84, 0.34, 1) both',
        'login-risco': 'login-risco 900ms cubic-bezier(0.16, 0.84, 0.34, 1) both',
        'login-halo': 'login-halo 1600ms ease-out both',
        /** O sol da tela de login: a mesma volta da sidebar, quase parada. */
        'login-sol': 'girar-lento 180s linear infinite',
      },
    },
  },
  plugins: [],
}
