import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../../paraglide/messages.js';
import { Button, Input } from '../../ui';
import type { LoginCredentials } from '../types';

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  onGuest: () => void;
  onTester: () => void;
  onForgot: () => void;
  onSignUpNav: () => void;
}

export function LoginForm({ onSubmit, onGuest, onTester, onForgot, onSignUpNav }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={m.auth_email()}
        value={email}
        onValueChange={setEmail}
        className="py-4"
      />

      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder={m.auth_password()}
        value={password}
        onValueChange={setPassword}
        className="py-4"
      />

      <Button variant="link" onClick={onForgot}>
        {m.auth_forgot_password()}
      </Button>

      <Button type="submit" className="py-4" disabled={submitting}>
        {submitting ? m.auth_logging_in() : m.auth_log_in()}
      </Button>

      <div className="mx-auto flex w-4/5 gap-3 max-sm:w-full">
        <Button
          variant="secondary"
          className="mx-0 w-auto flex-1 px-4 py-4 max-sm:text-xl"
          onClick={onGuest}
        >
          {m.auth_guest_mode()}
        </Button>

        <Button
          variant="secondary"
          className="mx-0 w-auto flex-1 px-4 py-4 max-sm:text-xl"
          onClick={onTester}
        >
          {m.auth_tester_mode()}
        </Button>
      </div>

      <p className="text-center font-body text-base text-muted">{m.auth_new_to_game()}</p>

      <Button variant="secondary" className="py-4" onClick={onSignUpNav}>
        {m.auth_sign_up()}
      </Button>
    </form>
  );
}
