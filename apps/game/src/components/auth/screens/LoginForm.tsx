import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Input } from '../../ui';
import type { LoginCredentials } from '../types';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  onGuest: () => void;
  onTester: () => void;
  onForgot: () => void;
  onSignUpNav: () => void;
}

export function LoginForm({ onSubmit, onGuest, onTester, onForgot, onSignUpNav }: LoginFormProps) {
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
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email"
        value={email}
        onValueChange={setEmail}
      />

      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Password"
        value={password}
        onValueChange={setPassword}
      />

      <Button variant="link" onClick={onForgot}>
        Forgot Password?
      </Button>

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>

      <Button variant="secondary" onClick={onGuest}>
        Continue as guest
      </Button>

      <Button variant="secondary" onClick={onTester}>
        Tester mode
      </Button>

      <p className="mt-2 text-center font-body text-base text-muted">New to the game?</p>

      <Button variant="secondary" onClick={onSignUpNav}>
        Sign up
      </Button>
    </form>
  );
}
