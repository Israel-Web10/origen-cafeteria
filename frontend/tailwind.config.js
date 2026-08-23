/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: {
          DEFAULT: '#2A1A12',
          light: '#3D2A1E',
        },
        cream: {
          DEFAULT: '#F6EFE4',
          dark: '#EFE4D2',
        },
        almond: '#E4D5BE',
        gold: {
          DEFAULT: '#B98A3E',
          dark: '#96702F',
          light: '#D4A85F',
        },
        olive: {
          DEFAULT: '#4A5A3A',
          dark: '#3A4830',
        },
        charcoal: '#3A2E26',
        rose: '#A63D40',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '0.75rem',
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(42, 26, 18, 0.18)',
        lift: '0 12px 32px -12px rgba(42, 26, 18, 0.35)',
      },
      backgroundImage: {
        'ring-motif': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Ccircle cx='200' cy='200' r='180' fill='none' stroke='%23B98A3E' stroke-width='1' opacity='0.15'/%3E%3Ccircle cx='200' cy='200' r='140' fill='none' stroke='%23B98A3E' stroke-width='1' opacity='0.12'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
