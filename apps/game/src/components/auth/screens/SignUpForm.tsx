import { useState } from 'react';
import type { FormEvent } from 'react';

import { PillInput } from '../components/PillInput';
import { PrimaryButton } from '../components/PrimaryButton';
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
      <PillInput
        name="username"
        autoComplete="username"
        placeholder="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <PillInput
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PillInput
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <PillInput
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      {error !== null && (
        <p role="alert" className="font-body text-lg text-alert justify-center flex">
          {error}
        </p>
      )}

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Sign up'}
      </PrimaryButton>
    </form>
  );
}
