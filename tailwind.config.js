/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        solar: {
          primary: '#149911',
          'primary-hover': '#256D1B',
          dark: '#244F26',
          sidebar: '#244F26',
          neutral: '#424342',
          accent: '#1EFC1E', // Only for active indicators, dots, "NOVO" badges
          surface: '#FFFFFF',
          bg: '#F4F6F8',
          darkest: '#13151A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'card': '14px',
      }
    },
  },
  plugins: [],
}
