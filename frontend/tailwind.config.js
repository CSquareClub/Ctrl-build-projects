/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#0d1117',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
        },
      },
    },
  },
  plugins: [],
};
