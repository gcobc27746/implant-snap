/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'bg-light': '#f6f7f8',
        'bg-dark': '#101922'
      },
      fontFamily: {
        display: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}
