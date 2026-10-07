import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import '@pixi/layout';

import './index.css';
import { FpsCounter } from './components/FpsCounter';
import { MobileBlockerBanner } from './components/MobileBlockerBanner';
import { queryClient } from './components/queryClient';
import { ScreenOverlay } from './components/ScreenOverlay';
import { CreationEngine } from './engine/engine';
import { setEngine } from './engine/getEngine';
import { bootstrapRemoteData } from './lib/bootstrapRemoteData';

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

      const { router } = await import('./router');
      await router.start(engine.navigation);
    };

    void init();

    return () => {
      void import('./router').then(({ router }) => router.stop());
    };
  }, []);

  return (
    <>
      <MobileBlockerBanner />
      <div id="pixi-container" />
      {import.meta.env.DEV && <FpsCounter />}
      <QueryClientProvider client={queryClient}>
        <ScreenOverlay />
      </QueryClientProvider>
    </>
  );
}
