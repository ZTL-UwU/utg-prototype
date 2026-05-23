import { useEffect } from 'react';
import '@pixi/layout';

import './index.css';
import { HomeScreen } from './app/screens/home';
import { KeyboardLayout } from './components/KeyboardLayout';
import { CreationEngine } from './engine/engine';
import { setEngine } from './engine/getEngine';
import { useKeyboardStore } from './zustand_stores/keyboardStore';

export default function App() {
  const { showKeyboard } = useKeyboardStore();

  const engine = new CreationEngine();
  setEngine(engine);

  useEffect(() => {
    const init = async () => {
      await engine.init({
        background: '#1E1E1E',
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
      <div id="pixi-container" />
      {showKeyboard && <KeyboardLayout />}
    </>
  );
}
