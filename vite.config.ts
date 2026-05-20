import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Pixi splits renderers into async chunks that import back into the main graph.
        // That cycle can leave `undefined` in `extensions.add(...)` → "Invalid extension type".
        manualChunks(id) {
          if (id.includes('node_modules/pixi.js/')) {
            return 'pixi';
          }
        },
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    singleQuote: true,
    sortImports: true,
  },
  plugins: [react(), tailwindcss()],
});
