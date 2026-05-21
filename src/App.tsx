import { useEffect, useRef } from 'react';

import './index.css';
import { KeyboardLayout } from './components/KeyboardLayout';
import { SceneManager } from './sceneManager';
import { HomeScene } from './scenes/home';
import { LayerSelectScene } from './scenes/layer_select';
import { LevelScene } from './scenes/level';
import { useKeyboardStore } from './zustand_stores/keyboardStore';

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { showKeyboard, setShowKeyboard } = useKeyboardStore();

  useEffect(() => {
    const host = hostRef.current;
    const manager = new SceneManager();
    const goToLevel = async () => {
      setShowKeyboard(true);
      await manager.goTo(LevelScene, { onHome: () => void goToHome() });
    };
    const goToLayerSelect = async () => {
      await manager.showOverlay(LayerSelectScene, {
        onClose: () => void manager.hideOverlay(),
        onLayerButtonClick: async () => {
          await manager.hideOverlay();
          await goToLevel();
        },
      });
    };
    const goToHome = async () => {
      setShowKeyboard(false);
      await manager.goTo(HomeScene, { onPlay: () => void goToLayerSelect() });
    };
    if (!host) return;

    let cancelled = false;

    void manager.init(host).then(async () => {
      if (cancelled) {
        manager.destroy();
        return;
      }

      manager.register(HomeScene, LevelScene, LayerSelectScene);
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
      {/* {showLayerSelect && <LayerSelect onClose={() => setShowLayerSelect(false)} goToLevel={goToLevel} />} */}
    </>
  );
}
