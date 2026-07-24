import { useState } from 'react';

import { AuthCard } from './AuthCard';
import { AuthSuccess } from './screens/AuthSuccess';
import { ForgotPasswordForm } from './screens/ForgotPasswordForm';
import { LoginForm } from './screens/LoginForm';
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
  onSignUp,
  onForgotPassword,
  onPlay,
  backdrop = false,
}: AuthParentProps) {
  const [view, setView] = useState<AuthView>(initialView);

  const handleLogin = async (credentials: LoginCredentials) => {
    await onLogin?.(credentials);
  };

  const handleSignUp = async (data: SignUpData) => {
    await onSignUp?.(data);
    setView('success');
  };

  const handleForgotPassword = async (email: string) => {
    await onForgotPassword?.(email);
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
      case 'success':
        return <AuthSuccess onPlay={handlePlay} />;
      case 'login':
      default:
        return (
          <LoginForm
            onSubmit={handleLogin}
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
          ? 'pointer-events-auto fixed inset-0 grid place-items-center bg-black/40 p-4'
          : 'pointer-events-none fixed inset-0 grid place-items-center p-4'
      }
    >
      <AuthCard avatarVariant={view === 'success' ? 'filled' : 'outline'} onClose={onClose}>
        <div key={view} className="auth-screen-enter">
          {renderScreen()}
        </div>
      </AuthCard>
    </div>
  );
}
