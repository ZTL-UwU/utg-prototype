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
    <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email"
        value={email}
        onValueChange={setEmail}
        className="py-4"
      />

      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Password"
        value={password}
        onValueChange={setPassword}
        className="py-4"
      />

      <Button variant="link" onClick={onForgot}>
        Forgot Password?
      </Button>

      <Button type="submit" className="py-4" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </Button>

      <div className="mx-auto flex w-4/5 gap-3">
        <Button variant="secondary" className="mx-0 w-auto flex-1 px-4 py-4" onClick={onGuest}>
          Guest mode
        </Button>

        <Button variant="secondary" className="mx-0 w-auto flex-1 px-4 py-4" onClick={onTester}>
          Tester mode
        </Button>
      </div>

      <p className="text-center font-body text-base text-muted">New to the game?</p>

      <Button variant="secondary" className="py-4" onClick={onSignUpNav}>
        Sign up
      </Button>
    </form>
  );
}
