/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: { 950: '#071429', 900: '#0b1f3f', 800: '#102a52', 700: '#1a3a6b' },
        brand: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        slot: { available: '#16a34a', occupied: '#dc2626', reserved: '#f97316', maintenance: '#64748b' },
      },
    },
  },
  plugins: [],
};
