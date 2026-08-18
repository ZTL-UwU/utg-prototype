import { useState } from 'react';

import { AuthCard } from './AuthCard';
import { AuthSuccess } from './screens/AuthSuccess';
import { ForgotPasswordForm } from './screens/ForgotPasswordForm';
import { ForgotPasswordSent } from './screens/ForgotPasswordSent';
import { LoginForm } from './screens/LoginForm';
import { ResetPasswordForm } from './screens/ResetPasswordForm';
import { SignUpForm } from './screens/SignUpForm';
import type { AuthParentProps, AuthView, LoginCredentials, SignUpData } from './types';

/**
 * Owns which auth screen is showing and what comes next. The child screens keep
 * their own field state and only report up through callbacks.
 */
export function AuthParent({
  initialView = 'login',
  onClose,
  onLogin,
  onGuest,
  onSignUp,
  onForgotPassword,
  onResetPassword,
  onPlay,
  backdrop = false,
}: AuthParentProps) {
  const [view, setView] = useState<AuthView>(initialView);

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      await onLogin?.(credentials);
    } catch {
      // The caller reports the failure; swallowing keeps the form's submit
      // state from unwinding through an unhandled rejection.
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    try {
      await onSignUp?.(data);
    } catch {
      // A rejected sign-up stays on the form instead of advancing to success.
      return;
    }
    setView('success');
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await onForgotPassword?.(email);
    } catch {
      return;
    }
    setView('forgot-sent');
  };

  const handleResetPassword = async (password: string) => {
    try {
      await onResetPassword?.(password);
    } catch {
      return;
    }
    setView('success');
  };

  const handlePlay = onPlay ?? onClose ?? (() => {});

  const renderScreen = () => {
    switch (view) {
      case 'signup':
        return <SignUpForm onSubmit={handleSignUp} />;
      case 'forgot':
        return (
          <ForgotPasswordForm onSubmit={handleForgotPassword} onBack={() => setView('login')} />
        );
      case 'forgot-sent':
        return <ForgotPasswordSent onBack={() => setView('login')} />;
      case 'reset':
        return <ResetPasswordForm onSubmit={handleResetPassword} />;
      case 'success':
        return <AuthSuccess onPlay={handlePlay} />;
      case 'login':
      default:
        return (
          <LoginForm
            onSubmit={handleLogin}
            onGuest={() => onGuest?.()}
            onForgot={() => setView('forgot')}
            onSignUpNav={() => setView('signup')}
          />
        );
    }
  };

  return (
    <div
      className={
        backdrop
          ? 'fixed inset-0 grid place-items-center bg-black/40 p-4'
          : 'fixed inset-0 grid place-items-center p-4'
      }
    >
      <AuthCard
        avatarVariant={view === 'success' || view === 'forgot-sent' ? 'filled' : 'outline'}
        onClose={onClose}
      >
        <div key={view} className="auth-screen-enter">
          {renderScreen()}
        </div>
      </AuthCard>
    </div>
  );
}
