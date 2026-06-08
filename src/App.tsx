import { useEffect, useRef } from 'react';
import '@pixi/layout';

import './index.css';
import { HomeScreen } from './app/screens/home';
import { MobileBlockerBanner } from './components/MobileBlockerBanner';
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

      // Show the main screen once the load screen is dismissed
      await engine.navigation.showScreen(HomeScreen);
    };

    void init();
  }, []);

  return (
    <>
      <MobileBlockerBanner />
      <div id="pixi-container" />
    </>
  );
}
