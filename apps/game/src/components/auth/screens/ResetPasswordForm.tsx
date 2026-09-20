import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, DialogDescription, DialogTitle, FormError, Input } from '../../ui';

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
      <DialogTitle>New password</DialogTitle>

      <DialogDescription>Pick a new password for your account.</DialogDescription>

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
        {submitting ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}
