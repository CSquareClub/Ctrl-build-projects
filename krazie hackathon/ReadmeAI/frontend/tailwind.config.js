/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy': '#0F172A',
        'card': '#1E293B',
        'sky': '#38BDF8',
        'purple': '#A78BFA',
        'pink': '#F472B6',
        'glass': 'rgba(30,41,59,0.7)',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-button': 'linear-gradient(135deg, #38BDF8 0%, #A78BFA 100%)',
        'gradient-purple': 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
        'gradient-pink': 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
        'glassmorphism': 'linear-gradient(120deg, rgba(30,41,59,0.7) 60%, rgba(56,189,248,0.08) 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 32px 0 #38BDF8aa',
        'glow-purple': '0 0 32px 0 #A78BFAaa',
        'glow-pink': '0 0 32px 0 #F472B6aa',
      },
      blur: {
        xs: '2px',
      },
      transitionProperty: {
        'spacing': 'margin, padding',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both',
      },
    },
  },
  plugins: [],
}
