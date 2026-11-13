import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../../paraglide/messages.js';
import { Button, DialogDescription, DialogTitle, Input } from '../../ui';

export interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void | Promise<void>;
  onBack: () => void;
}

export function ForgotPasswordForm({ onSubmit, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <DialogTitle>{m.auth_forgot_password()}</DialogTitle>

      <DialogDescription>{m.auth_forgot_description()}</DialogDescription>

      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={m.auth_email()}
        value={email}
        onValueChange={setEmail}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? m.sending() : m.auth_send_reset_link()}
      </Button>

      <Button variant="link" onClick={onBack}>
        {m.auth_back_to_login()}
      </Button>
    </form>
  );
}
