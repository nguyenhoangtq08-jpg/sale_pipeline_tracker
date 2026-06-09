/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        accent: '#6366f1',
        green: '#10b981',
        amber: '#f59e0b',
        red: '#ef4444',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        'bg-page': '#f0f2f7',
        'bg-card': '#ffffff',
        'bg-sidebar': '#0f172a',
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
