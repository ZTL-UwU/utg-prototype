import { useEffect, useState } from 'react';

import { engine } from '../engine/getEngine';
import { getResolution } from '../engine/utils/getResolution';

const SAMPLE_INTERVAL_MS = 500;

/** Dev-only readout of the Pixi ticker's frame rate. */
export function FpsCounter() {
  const [fps, setFps] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number | null>(null);

  useEffect(() => {
    setResolution(getResolution());
    const id = setInterval(() => {
      // The ticker only exists once the engine has finished `init`.
      const ticker = engine()?.ticker;
      if (ticker) setFps(Math.round(ticker.FPS));
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (fps === null) return null;

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-xs text-white">
      Res {resolution}x | {fps} FPS
    </div>
  );
}
