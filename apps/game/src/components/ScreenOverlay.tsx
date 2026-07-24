import { engine } from '../engine/getEngine';
import { useOverlayStore } from '../zustandStores/overlayStore';
import { AuthParent } from './auth';
import { YoutubeEmbedOverlay } from './YoutubeEmbedOverlay';

/** Leaving auth always lands on the regular home screen. */
function goToHomeScreen() {
  void import('../app/screens/home').then(({ HomeScreen }) =>
    engine().navigation.showScreen(HomeScreen),
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
          onPlay={goToHomeScreen}
          onLogin={(credentials) => {
            console.log('login', credentials);
            goToHomeScreen();
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
