import { useEffect, useRef } from 'react';

import './index.css';
import { KeyboardLayout } from './components/KeyboardLayout';
import { SceneManager } from './sceneManager';
import { HomeScene } from './scenes/home';
import { LayerSelectScene } from './scenes/layer_select';
import { LevelScene } from './scenes/level';
import { LevelMapScene } from './scenes/levelMap';
import { useKeyboardStore } from './zustand_stores/keyboardStore';

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { showKeyboard, setShowKeyboard } = useKeyboardStore();

  useEffect(() => {
    const host = hostRef.current;
    const manager = new SceneManager();
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
    const goToLayerSelect = async () => {
      await manager.showOverlay(LayerSelectScene, {
        onClose: () => void manager.hideOverlay(),
        onLayerButton: async () => {
          await manager.hideOverlay();
          await goToLevelMap();
        },
      });
    };
    const goToHome = async () => {
      await manager.goTo(HomeScene, { onPlay: () => void goToLayerSelect() });
      setShowKeyboard(false);
    };
    if (!host) return;

    let cancelled = false;

    void manager.init(host).then(async () => {
      if (cancelled) {
        manager.destroy();
        return;
      }

      manager.register(HomeScene, LevelScene, LayerSelectScene, LevelMapScene);
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
