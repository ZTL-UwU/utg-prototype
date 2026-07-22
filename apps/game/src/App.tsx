import { useEffect, useRef } from 'react';
import '@pixi/layout';

import './index.css';
import { MobileBlockerBanner } from './components/MobileBlockerBanner';
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

      if (import.meta.env.DEV) {
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
      <ScreenOverlay />
    </>
  );
}
