/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#0F172A',
          cyan: '#22D3EE',
          violet: '#8B5CF6',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(34, 211, 238, 0.28)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

