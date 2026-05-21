/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#4285F4',
          red: '#EA4335',
          yellow: '#FBBC05',
          green: '#34A853',
          'blue-light': '#D2E3FC',
          'red-light': '#FAD2CF',
          'yellow-light': '#FDE293',
          'green-light': '#CEEAD6',
        },
        surface: {
          main: '#F8F9FA',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#202124',
          secondary: '#5F6368',
        },
      },
      fontFamily: {
        google: ['Google Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'google-card': '0 4px 20px rgba(0,0,0,0.08)',
        'google-card-hover': '0 8px 30px rgba(0,0,0,0.12)',
      },
      animation: {
        'gdg-spin': 'gdg-spin 1.2s linear infinite',
      },
      keyframes: {
        'gdg-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
