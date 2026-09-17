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
      keyframes: {
        'girar-lento': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'surgir': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        /** O sol da sidebar. Antes a classe existia sem keyframes e não fazia nada. */
        'girar-lento': 'girar-lento 18s linear infinite',
        'surgir': 'surgir 180ms ease-out',
      },
    },
  },
  plugins: [],
}
