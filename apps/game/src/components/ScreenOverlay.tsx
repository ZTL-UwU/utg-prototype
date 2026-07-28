import { useMutation } from '@tanstack/react-query';
import { FetchError } from 'ofetch';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { engine } from '../engine/getEngine';
import { api } from '../lib/api';
import {
  clearPasswordResetUrl,
  getPasswordResetParams,
  type PasswordResetParams,
} from '../lib/passwordReset';
import { useAuthStore, type AuthUser } from '../zustandStores/auth';
import { useOverlayStore } from '../zustandStores/overlayStore';
import { AuthParent, type SignUpData } from './auth';
import { YoutubeEmbedOverlay } from './YoutubeEmbedOverlay';

function dismissAuthOverlay() {
  useOverlayStore.getState().hide();
}

/** Backing out of auth returns to the regular home screen. */
function goToHomeScreen() {
  clearPasswordResetUrl();
  dismissAuthOverlay();
  void import('../app/screens/home').then(({ HomeScreen }) =>
    engine().navigation.showScreen(HomeScreen),
  );
}

/** Getting through auth continues into the game. */
function goToLayerSelectScreen() {
  clearPasswordResetUrl();
  dismissAuthOverlay();
  void import('../app/screens/layer-select').then(({ LayerSelectScreen }) =>
    engine().navigation.showScreen(LayerSelectScreen),
  );
}

/** A fresh signup picks an avatar before continuing into the game. */
function goToAvatarSelectScreen() {
  dismissAuthOverlay();
  void import('../app/screens/avatar-select').then(({ AvatarSelectScreen }) =>
    engine().navigation.showScreen(AvatarSelectScreen),
  );
}

/** After auth, users without a chosen avatar must pick one before playing. */
function continueAfterLogin(user: AuthUser) {
  if (user.avatar == null) goToAvatarSelectScreen();
  else goToLayerSelectScreen();
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

function alertApiError(error: unknown, fallback: string) {
  const detail = error instanceof FetchError ? error.data?.detail : undefined;
  window.alert(typeof detail === 'string' ? detail : fallback);
}

export function ScreenOverlay() {
  const activeOverlay = useOverlayStore((state) => state.activeOverlay);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [resetParams, setResetParams] = useState<PasswordResetParams | null>(() =>
    getPasswordResetParams(),
  );

  useEffect(() => {
    if (resetParams !== null) {
      useOverlayStore.getState().show('auth');
    }
  }, [resetParams]);

  const { mutateAsync: login } = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
      continueAfterLogin(data.user);
    },
    onError: () => {
      useAuthStore.getState().clearTokens();
      useOverlayStore.getState().show('auth');
      window.alert('Login failed. Please log in again.');
    },
  });

  const { mutateAsync: signUp } = useMutation({
    mutationFn: async (data: SignUpData) => {
      return api<AuthTokens>('/user/register', {
        method: 'POST',
        body: {
          name: data.username,
          email: data.email,
          password: data.password,
        },
      });
    },
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
    },
    onError: (error) => {
      alertApiError(error, 'Sign up failed. Please try again.');
    },
  });

  const { mutateAsync: requestPasswordReset } = useMutation({
    mutationFn: async (email: string) => {
      return api<{ detail: string }>('/user/password-reset/request', {
        method: 'POST',
        body: { email },
      });
    },
    onError: (error) => {
      alertApiError(error, 'Could not send reset email. Please try again.');
    },
  });

  const { mutateAsync: confirmPasswordReset } = useMutation({
    mutationFn: async ({ uid, token, password }: PasswordResetParams & { password: string }) => {
      return api<AuthTokens>('/user/password-reset/confirm', {
        method: 'POST',
        body: { uid, token, password },
      });
    },
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.user);
      clearPasswordResetUrl();
      setResetParams(null);
    },
    onError: (error) => {
      alertApiError(error, 'Could not reset password. Please try again.');
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
          initialView={resetParams !== null ? 'reset' : 'login'}
          backdrop
          onClose={goToHomeScreen}
          onPlay={goToAvatarSelectScreen}
          onLogin={async (credentials) => {
            await login(credentials);
          }}
          onSignUp={async (data) => {
            // Rejecting here is what keeps AuthParent off the success screen.
            await signUp(data);
          }}
          onForgotPassword={async (email) => {
            await requestPasswordReset(email);
          }}
          onResetPassword={async (password) => {
            if (resetParams === null) {
              throw new Error('Missing reset link.');
            }
            await confirmPasswordReset({ ...resetParams, password });
          }}
        />
      </div>
    );
  }

  return null;
}
