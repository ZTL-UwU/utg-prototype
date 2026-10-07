import { engine } from '../engine/getEngine';
import type { AuthUser } from '../zustandStores/auth';

/**
 * Route an authenticated user into the game: no avatar yet → avatar select, else `returnTo`
 * (the page that sent them to log in) or the layer select.
 */
export function continueIntoGame(user: AuthUser, returnTo?: string) {
  if (user.avatar == null) {
    void import('../app/screens/avatar-select').then(({ AvatarSelectScreen }) =>
      engine().navigation.showScreen(AvatarSelectScreen, { returnTo }),
    );
    return;
  }
  enterGame(returnTo);
}

/** A player with a session and an avatar goes back to `returnTo`, or to the layer select. */
export function enterGame(returnTo?: string) {
  if (returnTo) {
    void import('../router').then(({ router }) => router.open(returnTo));
    return;
  }
  void import('../app/screens/layer-select').then(({ LayerSelectScreen }) =>
    engine().navigation.showScreen(LayerSelectScreen),
  );
}
