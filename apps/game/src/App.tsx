import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import '@pixi/layout';

import './index.css';
import { MobileBlockerBanner } from './components/MobileBlockerBanner';
import { queryClient } from './components/queryClient';
import { ScreenOverlay } from './components/ScreenOverlay';
import { CreationEngine } from './engine/engine';
import { setEngine } from './engine/getEngine';
import { bootstrapRemoteData } from './lib/bootstrapRemoteData';
import { getPasswordResetParams } from './lib/passwordReset';

export default function App() {
  const engineRef = useRef<CreationEngine | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new CreationEngine();
    setEngine(engineRef.current);
  }

  useEffect(() => {
    const engine = engineRef.current!;

    const init = async () => {
      await engine.init({
        background: '#000000',
        resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
        antialias: true,
      });

      bootstrapRemoteData();

      if (getPasswordResetParams() !== null) {
        const { AuthScreen } = await import('./app/screens/home/auth');
        await engine.navigation.showScreen(AuthScreen);
      } else if (import.meta.env.DEV) {
        const { debugScreenRouter } = await import('./debug/screen-router');
        await debugScreenRouter.start(engine.navigation);
      } else {
        const { HomeScreen } = await import('./app/screens/home');
        await engine.navigation.showScreen(HomeScreen);
      }
    };

    void init();

    return () => {
      if (import.meta.env.DEV) {
        void import('./debug/screen-router').then(({ debugScreenRouter }) => {
          debugScreenRouter.stop();
        });
      }
    };
  }, []);

  return (
    <>
      <MobileBlockerBanner />
      <div id="pixi-container" />
      <QueryClientProvider client={queryClient}>
        <ScreenOverlay />
      </QueryClientProvider>
    </>
  );
}
