/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0b0f1a',
        surface:  '#111827',
        surface2: '#1a2236',
        border:   '#1f2d45',
        accent:   '#00e5ff',
        green:    '#10b981',
        purple:   '#7c3aed',
        amber:    '#f59e0b',
        red:      '#ef4444',
        'text-primary': '#e2e8f0',
        'text-muted':   '#64748b',
      },
      fontFamily: {
        syne:    ['Syne', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
