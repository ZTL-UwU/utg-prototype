import { useEffect, useRef } from 'react';
import '@pixi/layout';

import './index.css';
import { HomeScreen } from './app/screens/home';
import { mapUnitStore } from './app/screens/level-map/units';
import { MobileBlockerBanner } from './components/MobileBlockerBanner';
import { ScreenOverlay } from './components/ScreenOverlay';
import { CreationEngine } from './engine/engine';
import { setEngine } from './engine/getEngine';

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

      // TODO: remove — temporary debug shortcut to level 6 via ?debug-level=6
      const debugLevel = new URLSearchParams(window.location.search).get('debug-level');
      if (debugLevel === '6') {
        const mapUnit = mapUnitStore['education-map-2'];
        const level = mapUnit.levels.find((candidate) => candidate.id === 6);
        await engine.navigation.showScreen(level!.screen!, mapUnit);
      } else {
        await engine.navigation.showScreen(HomeScreen);
      }
    };

    void init();
  }, []);

  return (
    <>
      <MobileBlockerBanner />
      <div id="pixi-container" />
      <ScreenOverlay />
    </>
  );
}
