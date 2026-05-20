import { useEffect, useRef } from 'react';

import './index.css';
import { SceneManager } from './sceneManager';
import { HomeScene } from './scenes/home';

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const manager = new SceneManager();
    let cancelled = false;

    void manager.init(host).then(async () => {
      if (cancelled) {
        manager.destroy();
        return;
      }

      manager.register(HomeScene);
      await manager.goTo(HomeScene);

      if (cancelled) {
        manager.destroy();
      }
    });

    return () => {
      cancelled = true;
      manager.destroy();
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 w-screen h-screen" />;
}
