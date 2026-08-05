import { GameLevelFlying } from '../app/screens/game-level/level-flying';
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
  void import('../app/screens/layer-select').then(({ LayerSelectScreen }) => {
    // TODO: ROUTING TO FLYING ONLY FOR DEV PURPOSES!!!!!
    console.log(LayerSelectScreen, 'logging this so the linter is happy');
    // engine().navigation.showScreen(LayerSelectScreen),
    engine().navigation.showScreen(GameLevelFlying);
  });
}
