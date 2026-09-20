import { useState } from 'react';
import type { FormEvent } from 'react';

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
      <DialogTitle>Forgot Password?</DialogTitle>

      <DialogDescription>
        Type your email and we&apos;ll send you a link to pick a new password.
      </DialogDescription>

      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email"
        value={email}
        onValueChange={setEmail}
      />

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </Button>

      <Button variant="link" onClick={onBack}>
        Back to login
      </Button>
    </form>
  );
}
