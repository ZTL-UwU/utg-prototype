import { useState } from 'react';
import type { FormEvent } from 'react';

import { LinkButton } from '../../ui/LinkButton';
import { PillInput } from '../../ui/PillInput';
import { PrimaryButton } from '../../ui/PrimaryButton';

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
      <h2 className="text-center font-display text-4xl font-semibold text-ink">Tester mode</h2>

      <p className="text-center font-body text-lg text-muted">
        Enter the tester password to unlock every level. Progress stays on this device.
      </p>

      <div key={shakeKey} className={error ? 'auth-shake flex' : 'flex'}>
        <PillInput
          name="tester-password"
          type="password"
          autoComplete="off"
          autoFocus
          placeholder="Tester password"
          aria-invalid={error}
          // `cn` does not merge, so `!` makes the red win over PillInput's own border colors.
          className={
            error
              ? 'border-alert! focus-visible:border-alert! focus-visible:ring-alert/30!'
              : undefined
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-center font-body text-base text-alert">
          Wrong password. Try again.
        </p>
      )}

      <PrimaryButton type="submit">Enter</PrimaryButton>

      <div className="flex justify-center">
        <LinkButton onClick={onBack}>Back to login</LinkButton>
      </div>
    </form>
  );
}
