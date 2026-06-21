/** @type {import('tailwindcss').Config} */
export default {
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
        },
        paper: '#f8fafc',
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
