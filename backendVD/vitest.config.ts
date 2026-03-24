import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Hace que describe / it / expect / vi estén disponibles globalmente
    // sin necesidad de importarlos en cada archivo de test.
    globals: true,

    // Entorno Node.js (no jsdom): la API de Jest/Vitest sin simulación de DOM.
    environment: "node",

    // Archivo de setup global: se ejecuta ANTES de cada suite de tests.
    // Se usa para configurar variables de entorno y mocks globales.
    setupFiles: ["./src/__tests__/setup.ts"],

    // Patrones de archivo de test: unit y de integración.
    include: ["src/__tests__/**/*.test.ts"],

    // Excluir node_modules y dist.
    exclude: ["node_modules", "dist"],

    coverage: {
      // Proveedor v8: usa la instrumentación nativa de Node (más rápido que istanbul).
      provider: "v8",

      // Archivos a reportar (solo src, excluir __tests__ y config).
      include: ["src/**/*.ts"],
      exclude: [
        "src/__tests__/**",
        "src/config/**",
        "src/server.ts",
        "src/app.ts",
        // Infraestructura Prisma: difícil de probar sin BD real.
        "src/infrastructure/repositories/**",
      ],

      // Umbrales mínimos del 80 % para considerar el build "cubierto".
      thresholds: {
        lines:     80,
        functions: 80,
        branches:  70,
        statements: 80,
      },

      reporter: ["text", "html", "lcov"],
    },
  },
});
