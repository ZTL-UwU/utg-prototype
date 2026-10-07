import { AuthScreen } from '../app/screens/home/auth';
import { engine } from '../engine/getEngine';
import { useAuthStore } from '../zustandStores/auth';
import { useLevelProgress } from '../zustandStores/levelProgressStore';
import { useUserRewardStore } from '../zustandStores/userRewardStore';

/** End the session, drop what it owned on this device, and land on the auth screen. */
export async function signOut() {
  // Dismiss first: hide() unwinds the blur on `navigation.currentScreen`, which is the
  // wrong screen once showScreen has swapped it.
  await engine().navigation.hideAllPopups();

  useAuthStore.getState().clearTokens();
  useUserRewardStore.getState().clearRewards();
  useLevelProgress.getState().resetAllAttempts();

  await engine().navigation.showScreen(AuthScreen);
}
