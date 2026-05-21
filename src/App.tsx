import { useEffect, useRef, useState } from 'react';

import './index.css';
import { KeyboardLayout } from './components/KeyboardLayout';
import { SceneManager } from './sceneManager';
import { HomeScene } from './scenes/home';
import { LevelScene } from './scenes/level';
import { LevelMapScene } from './scenes/levelMap';

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const manager = new SceneManager();
    let cancelled = false;

    const goToLevel = async () => {
      await manager.goTo(LevelScene, { onBack: () => void goToLevelMap() });
      setShowKeyboard(true);
    };

    const goToLevelMap = async () => {
      await manager.goTo(LevelMapScene, {
        onHome: () => void goToHome(),
        onLevel: () => void goToLevel(),
      });
      setShowKeyboard(false);
    };

    const goToHome = async () => {
      await manager.goTo(HomeScene, { onPlay: () => void goToLevelMap() });
      setShowKeyboard(false);
    };

    void manager.init(host).then(async () => {
      if (cancelled) {
        manager.destroy();
        return;
      }

      manager.register(HomeScene, LevelScene);
      await goToHome();

      if (cancelled) {
        manager.destroy();
      }
    });

    return () => {
      cancelled = true;
      manager.destroy();
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0 h-screen w-screen" />
      {showKeyboard && <KeyboardLayout />}
    </>
  );
}
