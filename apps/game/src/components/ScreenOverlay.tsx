import { engine } from '../engine/getEngine';
import { useOverlayStore } from '../zustandStores/overlayStore';
import { AuthParent } from './auth';
import { YoutubeEmbedOverlay } from './YoutubeEmbedOverlay';

/** Backing out of auth returns to the regular home screen. */
function goToHomeScreen() {
  void import('../app/screens/home').then(({ HomeScreen }) =>
    engine().navigation.showScreen(HomeScreen),
  );
}

/** Getting through auth continues into the game. */
function goToLayerSelectScreen() {
  void import('../app/screens/layer-select').then(({ LayerSelectScreen }) =>
    engine().navigation.showScreen(LayerSelectScreen),
  );
}

export function ScreenOverlay() {
  const activeOverlay = useOverlayStore((state) => state.activeOverlay);

  if (activeOverlay === 'youtube-embeds') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <YoutubeEmbedOverlay />
      </div>
    );
  }

  if (activeOverlay === 'auth') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <AuthParent
          onClose={goToHomeScreen}
          onPlay={goToLayerSelectScreen}
          onLogin={(credentials) => {
            console.log('login', credentials);
            goToLayerSelectScreen();
          }}
          onSignUp={(data) => {
            console.log('sign up', data);
          }}
          onForgotPassword={(email) => {
            console.log('forgot password', email);
          }}
        />
      </div>
    );
  }

  return null;
}
