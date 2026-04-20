/** @type {import('tailwindcss').Config} */
export default {
  // `dark:` usa la clase `dark` en <html> (theme/appTheme.ts). Migrar vistas a `dark:bg-slate-900` etc. poco a poco.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./formkit.config.js"
  ],
  theme: {
    extend: {
      screens: {
        'md-lg': '900px'
      }
    },
  },
  plugins: [],
}

