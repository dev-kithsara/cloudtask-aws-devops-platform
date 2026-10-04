/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { cloud: { 50: '#f5f7ff', 600: '#4f46e5', 700: '#4338ca', 950: '#17152f' } },
    },
  },
  plugins: [],
};
