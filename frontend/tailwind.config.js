/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', 
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        palmier: {
          50:  '#f0f7f0',
          100: '#dcebdc',
          200: '#b9d7b9',
          300: '#8fbc8f',
          400: '#6a9e6a',
          500: '#4a7c4a',
          600: '#2d5e2d',
          700: '#1a472a',
          800: '#0f331f',
          900: '#072014',
          950: '#03120a',
        },
        sable: {
          50:  '#fdf8f0',
          100: '#f5ede0',
          200: '#e8d9c4',
          300: '#d4bea0',
          400: '#c0a380',
          500: '#a88868',
          600: '#8c7050',
          700: '#705838',
          800: '#544020',
          900: '#382810',
          950: '#1c1408',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-delayed': 'fadeIn 0.8s ease-out 0.3s forwards',
        'fade-in-delayed-2': 'fadeIn 0.8s ease-out 0.6s forwards',
        'scale-in': 'scaleIn 0.6s ease-out 0.3s forwards',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'floatDelayed 8s ease-in-out infinite',
        'sway-gentle': 'swayGentle 4s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'sparkle': 'sparkle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        floatDelayed: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(20px) rotate(-5deg)' },
        },
        swayGentle: {
          '0%, 100%': { transform: 'rotate(-3deg) translateX(-2px)' },
          '50%': { transform: 'rotate(3deg) translateX(2px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.05)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%) rotate(45deg)' },
          '100%': { transform: 'translateX(100%) rotate(45deg)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: '0.5', transform: 'scale(1.2) rotate(180deg)' },
        },
      },
    },
  },
  plugins: [],
};