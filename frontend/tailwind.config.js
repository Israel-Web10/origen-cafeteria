/** @type {import('tailwindcss').Config} */
// Los colores apuntan a variables CSS (src/index.css) para que el gerente pueda
// elegir entre paletas predefinidas con contraste verificado, sin romper la UI.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: { DEFAULT: v('espresso'), light: v('espresso-light') },
        cream: { DEFAULT: v('cream'), dark: v('cream-dark') },
        almond: v('almond'),
        gold: { DEFAULT: v('gold'), dark: v('gold-dark'), light: v('gold-light') },
        olive: { DEFAULT: v('olive'), dark: v('olive-dark') },
        charcoal: v('charcoal'),
        rose: v('rose'),
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '1rem' },
      boxShadow: {
        soft: '0 4px 24px -8px rgb(var(--c-espresso) / 0.18)',
        lift: '0 18px 40px -16px rgb(var(--c-espresso) / 0.45)',
        glow: '0 0 60px -10px rgb(var(--c-gold) / 0.55)',
      },
      keyframes: {
        steam: {
          '0%': { transform: 'translate3d(0, 0, 0) scaleY(0.8)', opacity: '0' },
          '25%': { opacity: '0.55' },
          '100%': { transform: 'translate3d(12px, -120px, 0) scaleY(1.3)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translate3d(0, -14px, 0) rotate(calc(var(--r, 0deg) + 6deg))' },
        },
        flicker: {
          '0%, 100%': { opacity: '0.85' },
          '45%': { opacity: '1' },
          '55%': { opacity: '0.75' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        steam: 'steam 4.5s ease-out infinite',
        float: 'float 7s ease-in-out infinite',
        flicker: 'flicker 5s ease-in-out infinite',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
