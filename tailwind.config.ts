import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'room-bg': '#101828',
        'page-bg': '#0d1117',
      },
    },
  },
  plugins: [],
} satisfies Config
