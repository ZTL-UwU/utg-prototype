import { QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
      window.__trace?.('engine.init start');
      await engine.init({
        background: '#000000',
        resizeOptions: { minWidth: 768, minHeight: 1024, letterbox: false },
        antialias: true,
      });
      window.__trace?.('engine.init done');

      bootstrapRemoteData();
      window.__trace?.('bootstrapRemoteData done');

      const { router } = await import('./router');
      window.__trace?.('router.start');
      await router.start(engine.navigation);
      window.__trace?.('router.start done');
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
      <SpeedInsights />
    </>
  );
}
