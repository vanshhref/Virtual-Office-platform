/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4F46E5',
        'brand-secondary': '#10B981',
        'brand-accent': '#F59E0B',
        'brand-background': '#1F2937',
        'brand-text': '#F9FAFB',
      },
    },
  },
  plugins: [],
}
