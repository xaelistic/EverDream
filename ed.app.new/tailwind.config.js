/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf8f5',
        parchment: '#f3eee6',
        ink: '#2b2928',
        muted: '#6b6560',
        line: '#e6dfd4',
        sage: '#6d8b74',
        sageDark: '#4f6654',
        dusk: '#9b8fc9',
        duskDeep: '#6b5b95',
        blush: '#e8d5d0',
        moon: '#c4bdd4',
        cream: '#fffefb',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 1px 3px rgba(43, 41, 40, 0.06), 0 8px 24px rgba(43, 41, 40, 0.04)',
        lift: '0 4px 14px rgba(43, 41, 40, 0.08)',
      },
    },
  },
  plugins: [],
};
