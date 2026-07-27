export type AuthView = 'login' | 'signup' | 'forgot' | 'forgot-sent' | 'reset' | 'success';

export type AvatarVariant = 'outline' | 'filled';

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
  onSignUp?: (data: SignUpData) => void | Promise<void>;
  onForgotPassword?: (email: string) => void | Promise<void>;
  onResetPassword?: (password: string) => void | Promise<void>;
  /** Success CTA. Falls back to `onClose`. */
  onPlay?: () => void;
  /** Dim the game behind the card. Defaults to `false`. */
  backdrop?: boolean;
}
