import { useState } from 'react';
import type { FormEvent } from 'react';

import { PillInput } from '../../ui/PillInput';
import { PrimaryButton } from '../../ui/PrimaryButton';

export interface ResetPasswordFormProps {
  onSubmit: (password: string) => void | Promise<void>;
}

export function ResetPasswordForm({ onSubmit }: ResetPasswordFormProps) {
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
      await onSubmit(password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <h2 className="text-center font-display text-4xl font-semibold text-ink">New password</h2>

      <p className="text-center font-body text-lg text-muted">
        Pick a new password for your account.
      </p>

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
        <p role="alert" className="flex justify-center font-body text-lg text-alert">
          {error}
        </p>
      )}

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save new password'}
      </PrimaryButton>
    </form>
  );
}
