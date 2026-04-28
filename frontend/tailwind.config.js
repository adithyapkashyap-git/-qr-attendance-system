/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15, 23, 42, 0.08)',
        lift: '0 22px 55px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
