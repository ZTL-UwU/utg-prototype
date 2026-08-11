import { useState } from 'react';
import type { FormEvent } from 'react';

import { LinkButton } from '../../ui/LinkButton';
import { PillInput } from '../../ui/PillInput';
import { PrimaryButton } from '../../ui/PrimaryButton';

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
      <h2 className="text-center font-display text-4xl font-semibold text-ink">Forgot Password?</h2>

      <p className="text-center font-body text-lg text-muted">
        Type your email and we'll send you a link to pick a new password.
      </p>

      <PillInput
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PrimaryButton type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </PrimaryButton>

      <div className="flex justify-center">
        <LinkButton onClick={onBack}>Back to login</LinkButton>
      </div>
    </form>
  );
}
