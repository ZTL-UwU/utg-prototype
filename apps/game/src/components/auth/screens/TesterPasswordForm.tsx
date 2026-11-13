import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../../paraglide/messages.js';
import { Button, DialogDescription, DialogTitle, FormError, Input, cn } from '../../ui';

export interface TesterPasswordFormProps {
  /** Returns whether the password was accepted. */
  onSubmit: (password: string) => boolean;
  onBack: () => void;
}

export function TesterPasswordForm({ onSubmit, onBack }: TesterPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  // Bumped on every rejection so the input remounts and the shake replays.
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSubmit(password)) return;
    setError(true);
    setPassword('');
    setShakeKey((key) => key + 1);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <DialogTitle>{m.auth_tester_mode()}</DialogTitle>

      <DialogDescription>{m.auth_tester_description()}</DialogDescription>

      <div key={shakeKey} className={cn('flex justify-center', error && 'auth-shake')}>
        <Input
          name="tester-password"
          type="password"
          autoComplete="off"
          autoFocus
          required
          placeholder={m.auth_tester_password()}
          aria-invalid={error}
          value={password}
          onValueChange={setPassword}
        />
      </div>

      {error && <FormError>{m.auth_wrong_password()}</FormError>}

      <Button type="submit">{m.auth_enter()}</Button>

      <Button variant="link" onClick={onBack}>
        {m.auth_back_to_login()}
      </Button>
    </form>
  );
}
