import type { AssetPackConfig } from '@assetpack/core';
import { AssetPack } from '@assetpack/core';
import { pixiPipes } from '@assetpack/core/pixi';
import { webfont } from '@assetpack/core/webfont';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
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
    ignorePatterns: ['src/paraglide/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ['src/paraglide/**'],
    singleQuote: true,
    sortImports: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    assetpackPlugin(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // Real files, the same ones `vp run i18n` writes, so type checking works without a dev server.
      outputStructure: 'message-modules',
      emitTsDeclarations: true,
      // A saved pick from the profile popup wins, then the device language, then English.
      // Keep in sync with the `i18n` script in package.json.
      strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
    }),
  ],
});
