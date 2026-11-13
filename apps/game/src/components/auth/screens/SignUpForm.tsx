import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../../paraglide/messages.js';
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
      setError(m.auth_passwords_differ());
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
        placeholder={m.auth_username()}
        value={username}
        onValueChange={setUsername}
      />

      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={m.auth_email()}
        value={email}
        onValueChange={setEmail}
      />

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
        {submitting ? m.auth_creating_account() : m.auth_sign_up()}
      </Button>
    </form>
  );
}
