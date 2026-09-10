import type { AvatarVariant } from '../ui/Avatar';

export type { AvatarVariant };

export type AuthView =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'forgot-sent'
  | 'reset'
  | 'success'
  | 'tester';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
}

export interface AuthParentProps {
  /** Screen shown first. Defaults to `'login'`. */
  initialView?: AuthView;
  /** Fired by the X in the card corner. */
  onClose?: () => void;
  onLogin?: (credentials: LoginCredentials) => void | Promise<void>;
  /** Play without an account; progression is stored on this device. */
  onGuest?: () => void;
  /** Password-gated guest session with cheat access. Returns whether the password was accepted. */
  onTester?: (password: string) => boolean;
  onSignUp?: (data: SignUpData) => void | Promise<void>;
  onForgotPassword?: (email: string) => void | Promise<void>;
  onResetPassword?: (password: string) => void | Promise<void>;
  /** Success CTA. Falls back to `onClose`. */
  onPlay?: () => void;
  /** Dim the game behind the card. Defaults to `false`. */
  backdrop?: boolean;
}
