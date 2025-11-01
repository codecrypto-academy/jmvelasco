module.exports = {
  // NOTA:
  // En TailwindCSS v4+ con Vite y PostCSS v8+, el plugin oficial de Tailwind para PostCSS se ha movido a '@tailwindcss/postcss'.
  // Por eso, la configuración correcta es usar '@tailwindcss/postcss' como plugin en vez de 'tailwindcss'.
  // Si se usa 'tailwindcss' directamente, se obtiene un error de incompatibilidad.
  // Más info: https://github.com/tailwindlabs/tailwindcss/discussions/12205
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
