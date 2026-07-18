import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    'apps/game/**': 'vp run --filter @utg/game lint:fix',
    'apps/admin/**': 'vp run --filter @utg/admin lint:fix',
    'packages/level-types/**': 'vp run --filter @utg/level-types lint:fix',
    '*': 'vp check --fix',
  },
  fmt: {
    ignorePatterns: ['.agents/**'],
    singleQuote: true,
    sortImports: true,
  },
  lint: {
    ignorePatterns: ['.agents/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
