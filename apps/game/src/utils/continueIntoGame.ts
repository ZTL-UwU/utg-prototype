import { engine } from '../engine/getEngine';
import type { AuthUser } from '../zustandStores/auth';

/** Route an authenticated user into the game: no avatar yet → avatar select, else layer select. */
export function continueIntoGame(user: AuthUser) {
  if (user.avatar == null) {
    void import('../app/screens/avatar-select').then(({ AvatarSelectScreen }) =>
      engine().navigation.showScreen(AvatarSelectScreen),
    );
    return;
  }
  void import('../app/screens/layer-select').then(({ LayerSelectScreen }) =>
    engine().navigation.showScreen(LayerSelectScreen),
  );
}
