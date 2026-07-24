import { useState } from 'react';
import type { FormEvent } from 'react';

import { LinkButton } from '../components/LinkButton';
import { PillInput } from '../components/PillInput';
import { PrimaryButton } from '../components/PrimaryButton';
import type { LoginCredentials } from '../types';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  onForgot: () => void;
  onSignUpNav: () => void;
}

export function LoginForm({ onSubmit, onForgot, onSignUpNav }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ username, password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <PillInput
        name="username"
        autoComplete="username"
        placeholder="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <PillInput
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className="-mt-1 flex justify-end">
        <LinkButton onClick={onForgot}>Forgot Password?</LinkButton>
      </div>

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </PrimaryButton>

      <p className="mt-2 text-center font-body text-sm text-muted">New to the game?</p>

      <PrimaryButton variant="ghost" onClick={onSignUpNav}>
        Sign up
      </PrimaryButton>
    </form>
  );
}
