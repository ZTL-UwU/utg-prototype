import { useState } from 'react';
import type { FormEvent } from 'react';

import { LinkButton } from '../../ui/LinkButton';
import { PillInput } from '../../ui/PillInput';
import { PrimaryButton } from '../../ui/PrimaryButton';
import type { LoginCredentials } from '../types';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  onGuest: () => void;
  onForgot: () => void;
  onSignUpNav: () => void;
}

export function LoginForm({ onSubmit, onGuest, onForgot, onSignUpNav }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <PillInput
        name="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PillInput
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className="flex justify-center">
        <LinkButton onClick={onForgot}>Forgot Password?</LinkButton>
      </div>

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </PrimaryButton>

      <PrimaryButton variant="ghost" onClick={onGuest}>
        Continue as guest
      </PrimaryButton>

      <p className="mt-2 text-center font-body text-base text-muted">New to the game?</p>

      <PrimaryButton variant="ghost" onClick={onSignUpNav}>
        Sign up
      </PrimaryButton>
    </form>
  );
}
