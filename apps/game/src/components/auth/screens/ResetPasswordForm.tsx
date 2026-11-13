import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../../paraglide/messages.js';
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
      setError(m.auth_passwords_differ());
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
      <DialogTitle>{m.auth_new_password()}</DialogTitle>

      <DialogDescription>{m.auth_new_password_description()}</DialogDescription>

      <Input
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder={m.auth_password()}
        value={password}
        onValueChange={setPassword}
      />

      <Input
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        placeholder={m.auth_confirm_password()}
        value={confirmPassword}
        onValueChange={setConfirmPassword}
      />

      {error !== null && <FormError>{error}</FormError>}

      <Button type="submit" disabled={submitting}>
        {submitting ? m.auth_saving() : m.auth_save_new_password()}
      </Button>
    </form>
  );
}
