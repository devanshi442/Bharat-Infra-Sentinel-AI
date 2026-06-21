/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — "Civic Command Centre" direction:
        // deep navy base (not generic SaaS blue), signal-orange for
        // alerts/priority, a muted teal for "healthy/resolved" states.
        ink: {
          950: '#0a0e17',
          900: '#0f1521',
          800: '#161d2c',
          700: '#202940',
          600: '#2d3855',
        },
        signal: {
          50: '#fff4ed',
          100: '#ffe4d1',
          400: '#ff8a3d',
          500: '#f4670e',
          600: '#d9540a',
        },
        sentinel: {
          50: '#ecfdf6',
          400: '#2dd4a7',
          500: '#14b890',
          600: '#0f9a78',
        },
        paper: '#f6f4ef',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
