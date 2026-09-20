import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, FormError, Input } from '../../ui';
import type { SignUpData } from '../types';

export interface SignUpFormProps {
  onSubmit: (data: SignUpData) => void | Promise<void>;
}

export function SignUpForm({ onSubmit }: SignUpFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Those passwords are different. Type the same one twice.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ username, email, password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Input
        name="username"
        autoComplete="username"
        required
        placeholder="Username"
        value={username}
        onValueChange={setUsername}
      />

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
        autoComplete="new-password"
        required
        placeholder="Password"
        value={password}
        onValueChange={setPassword}
      />

      <Input
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        placeholder="Confirm password"
        value={confirmPassword}
        onValueChange={setConfirmPassword}
      />

      {error !== null && <FormError>{error}</FormError>}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Sign up'}
      </Button>
    </form>
  );
}
