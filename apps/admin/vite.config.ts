import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  root: import.meta.dirname,
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    ignorePatterns: ['app/components/ui/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ['app/components/ui/**'],
    singleQuote: true,
    sortImports: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), reactRouter()],
});
