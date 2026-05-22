import { useEffect } from 'react';

import './index.css';
import { LoadScreen } from './app/screens/LoadScreen';
import { MainScreen } from './app/screens/main/MainScreen';
import { userSettings } from './app/utils/userSettings';
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
      });

      // Initialize the user settings
      userSettings.init();

      // Show the load screen
      await engine.navigation.showScreen(LoadScreen);
      // Show the main screen once the load screen is dismissed
      await engine.navigation.showScreen(MainScreen);
    };

    void init();
  }, []);

  return (
    <>
      <div id="pixi-container" className="absolute inset-0 h-screen w-screen" />
      {showKeyboard && <KeyboardLayout />}
    </>
  );
}
