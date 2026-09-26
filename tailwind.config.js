/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#eee9dc',
          dim: '#e2ddce',
        },
        ink: {
          DEFAULT: '#1b1e1c',
          soft: '#2a2e2a',
        },
        moss: {
          DEFAULT: '#4b6357',
          dark: '#364a40',
        },
        yellow: {
          DEFAULT: '#eab308',
          accent: '#ca8a04',
          light: '#fef08a',
          gold: '#f59e0b',
        },
        brass: '#a67c3d',
        rust: '#8b4a3f',
        steel: {
          DEFAULT: '#6b6f68',
          light: '#d8d2c2',
        },
        white: '#fbfaf6',
      },
    },
  },
  plugins: [],
}
