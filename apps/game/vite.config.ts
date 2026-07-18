import type { AssetPackConfig } from '@assetpack/core';
import { AssetPack } from '@assetpack/core';
import { pixiPipes } from '@assetpack/core/pixi';
import { webfont } from '@assetpack/core/webfont';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ResolvedConfig } from 'vite';
import { defineConfig } from 'vite-plus';

function assetpackPlugin() {
  const apConfig = {
    entry: './assets',
    pipes: [
      ...pixiPipes({
        cacheBust: false,
        manifest: {
          output: './src/manifest.json',
        },
      }),
      webfont(),
    ],
  } as AssetPackConfig;
  let mode: ResolvedConfig['command'];
  let ap: AssetPack | undefined;

  return {
    name: 'vite-plugin-assetpack',
    configResolved(resolvedConfig) {
      mode = resolvedConfig.command;
      if (!resolvedConfig.publicDir) return;
      if (apConfig.output) return;
      // remove the root from the public dir
      const publicDir = resolvedConfig.publicDir.replace(process.cwd(), '');

      if (process.platform === 'win32') {
        apConfig.output = `${publicDir}/assets/`;
      } else {
        apConfig.output = `.${publicDir}/assets/`;
      }
    },
    buildStart: async () => {
      if (mode === 'serve') {
        if (ap) return;
        ap = new AssetPack(apConfig);
        await ap.watch();
      } else {
        await new AssetPack(apConfig).run();
      }
    },
    buildEnd: async () => {
      if (ap) {
        await ap.stop();
        ap = undefined;
      }
    },
  } as Plugin;
}

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName ? `/${repoName}/` : '/';

export default defineConfig({
  base,
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
  plugins: [react(), tailwindcss(), assetpackPlugin()],
});
