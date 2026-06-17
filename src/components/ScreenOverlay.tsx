import { useOverlayStore } from '../zustandStores/overlayStore';
import { YoutubeEmbedOverlay } from './YoutubeEmbedOverlay';

export function ScreenOverlay() {
  const activeOverlay = useOverlayStore((state) => state.activeOverlay);

  if (activeOverlay === 'youtube-embeds') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <YoutubeEmbedOverlay />
      </div>
    );
  }

  return null;
}
