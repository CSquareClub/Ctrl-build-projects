/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg:      '#0d1117',
          surface: '#161b22',
          border:  '#1a3320',
          text:    '#22c55e',
          bright:  '#4ade80',
          muted:   '#4a7c59',
          dim:     '#1a4a2a',
          amber:   '#f59e0b',
          red:     '#f87171',
          cyan:    '#34d399',
        },
        // keep for any leftover references
        github: {
          bg:     '#000000',
          border: '#1a3320',
          text:   '#22c55e',
          muted:  '#4a7c59',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
      animation: {
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
