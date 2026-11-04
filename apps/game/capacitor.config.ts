import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.codhers.sozlerseylisi',
  appName: 'Sozler Seylisi',
  webDir: 'dist',
  //   server : {
  //     url : 'https://sozlerseylisi.codhers.ca'
  //   }
  plugins: {
    // Fullscreen: the status bar would otherwise draw over the game's top corners.
    SystemBars: { hidden: true },
  },
};

export default config;
