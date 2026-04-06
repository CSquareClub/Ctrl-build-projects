/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0969DA',
        'primary-dark': '#033D8B',
        'accent': '#FFA500',
        'accent-light': '#FFD700',
        'success': '#1a7f37',
        'warning': '#FB8500',
        'danger': '#DA3633',
        'bg-light': '#FFFFFF',
        'bg-subtle': '#F6F8FA',
        'bg-muted': '#EAEEF2',
        'border': '#D0D7DE',
        'border-subtle': '#E5EBF0',
        'text-primary': '#0D1117',
        'text-secondary': '#57606A',
        'text-muted': '#848D97',
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0969DA 0%, #033D8B 100%)',
        'gradient-accent': 'linear-gradient(135deg, #FFA500 0%, #FFD700 100%)',
        'gradient-glow': 'radial-gradient(circle, rgba(9, 105, 218, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {\n        'glow-primary': '0 0 40px 0 rgba(9, 105, 218, 0.3)',\n        'glow-accent': '0 0 40px 0 rgba(255, 165, 0, 0.25)',\n        'elevation-sm': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',\n        'elevation-md': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',\n        'elevation-lg': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',\n      },\n      keyframes: {\n        'fade-in': {\n          '0%': { opacity: 0, transform: 'translateY(20px)' },\n          '100%': { opacity: 1, transform: 'translateY(0)' },\n        },\n        'slide-up': {\n          '0%': { opacity: 0, transform: 'translateY(40px)' },\n          '100%': { opacity: 1, transform: 'translateY(0)' },\n        },\n        'slide-in-right': {\n          '0%': { opacity: 0, transform: 'translateX(100%)' },\n          '100%': { opacity: 1, transform: 'translateX(0)' },\n        },\n        'glow-pulse': {\n          '0%, 100%': { opacity: 1 },\n          '50%': { opacity: 0.5 },\n        },\n        'float': {\n          '0%, 100%': { transform: 'translateY(0px)' },\n          '50%': { transform: 'translateY(-20px)' },\n        },\n      },\n      animation: {\n        'fade-in': 'fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)',\n        'slide-up': 'slide-up 0.7s cubic-bezier(0.4, 0, 0.2, 1)',\n        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1)',\n        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',\n        'float': 'float 6s ease-in-out infinite',\n      },\n    },\n  },\n  plugins: [],\n}
