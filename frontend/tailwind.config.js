/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: 'var(--color-brand-deep)',
          primary: 'var(--color-brand-primary)',
          medium: 'var(--color-brand-medium)',
          light: 'var(--color-brand-light)',
          accent: 'var(--color-brand-accent)',
          yellow: 'var(--color-brand-yellow)',
        },
        paper: 'var(--color-paper)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'border-muted': 'var(--color-border-muted)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
