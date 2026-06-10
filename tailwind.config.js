/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        slate: {
          750: '#243347',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.pt-safe-top': {
          paddingTop: 'env(safe-area-inset-top, 0px)',
        },
        '.pb-safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        },
        '.pb-nav': {
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        },
        '.min-h-dvh': {
          minHeight: ['100vh', '100dvh'],
        },
      })
    }
  ],
}
