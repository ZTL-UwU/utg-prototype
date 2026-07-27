import { useMutation } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { z } from 'zod';

import { engine } from '../engine/getEngine';
import { api } from '../lib/api';
import { useAuthStore, type AuthUser } from '../zustandStores/auth';
import { useOverlayStore } from '../zustandStores/overlayStore';
import { AuthParent, type SignUpData } from './auth';
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
const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

type AuthTokens = {
  access: string;
  refresh: string;
  user: AuthUser;
};

// shared by login and signup
function loginRequest(values: LoginValues) {
  return api<AuthTokens>('/user/login', {
    method: 'POST',
    body: values,
  });
}

export function ScreenOverlay() {
  const activeOverlay = useOverlayStore((state) => state.activeOverlay);
  const setAuth = useAuthStore((state) => state.setAuth);

  const { mutateAsync: login } = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
      goToLayerSelectScreen();
    },
    onError: () => {
      useAuthStore.getState().clearTokens();
      useOverlayStore.getState().show('auth');
      window.alert('Login failed. Please log in again.');
    },
  });

  const { mutateAsync: signUp } = useMutation({
    mutationFn: async (data: SignUpData) => {
      await api<AuthUser>('/user/register', {
        method: 'POST',
        body: {
          name: data.username,
          email: data.email,
          password: data.password,
        },
      });
      // Register hands back the user
      return loginRequest({ email: data.email, password: data.password });
    },
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
    },
    onError: (error) => {
      const detail = error instanceof FetchError ? error.data?.detail : undefined;
      window.alert(typeof detail === 'string' ? detail : 'Sign up failed. Please try again.');
    },
  });

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
          onLogin={async (credentials) => {
            await login({
              email: credentials.username,
              password: credentials.password,
            });
          }}
          onSignUp={async (data) => {
            // Rejecting here is what keeps AuthParent off the success screen.
            await signUp(data);
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
