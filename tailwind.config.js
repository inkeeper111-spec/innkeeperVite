/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orvelle: {
          primary: '#3B241A',
          dark: '#291810',
          sidebar: '#321F17',
          champagne: '#D6B477',
          champagneLight: '#E8D2A6',
          amber: '#C58A32',
          amberDark: '#A96F20',
          ivory: '#FAF7F0',
          cream: '#F1E7D6',
          text: '#30231D',
          muted: '#786B60',
          border: '#E5D9C8',
          success: '#347451',
          warning: '#B7791F',
          error: '#B54747'
        },
        brand: {
          50: '#FAF7F0',
          100: '#F1E7D6',
          200: '#E5D9C8',
          300: '#E8D2A6',
          400: '#D6B477',
          500: '#C58A32',
          600: '#3B241A',
          700: '#291810',
          800: '#321F17',
          900: '#291810',
          950: '#1D100B',
        },
        gold: {
          400: '#E8D2A6',
          500: '#D6B477',
          600: '#C58A32',
        },
        slate: {
          50: '#FAF7F0',
          100: '#F1E7D6',
          200: '#E5D9C8',
          300: '#D6C8B5',
          400: '#A99A8C',
          500: '#786B60',
          600: '#5C4B40',
          700: '#49372D',
          800: '#3B241A',
          900: '#321F17',
          950: '#291810'
        },
        amber: {
          50: '#F9F0DE',
          100: '#F1E1BC',
          200: '#E8D2A6',
          300: '#D6B477',
          400: '#D6B477',
          500: '#C58A32',
          600: '#A96F20',
          700: '#895A18'
        },
        emerald: {
          50: '#EAF3ED',
          100: '#D7E8DD',
          200: '#B8D5C2',
          500: '#347451',
          600: '#347451',
          700: '#285B3E'
        },
        rose: {
          50: '#FAEDED',
          100: '#F4DADA',
          200: '#E8BABA',
          400: '#C76A6A',
          500: '#B54747',
          600: '#B54747',
          700: '#8D3636',
          800: '#713030'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

