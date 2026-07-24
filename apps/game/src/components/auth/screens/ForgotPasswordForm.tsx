import { useState } from 'react';
import type { FormEvent } from 'react';

import { LinkButton } from '../components/LinkButton';
import { PillInput } from '../components/PillInput';
import { PrimaryButton } from '../components/PrimaryButton';

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
      <h2 className="text-center font-display text-2xl font-semibold text-ink">Forgot Password?</h2>

      <p className="text-center font-body text-sm text-muted">
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
