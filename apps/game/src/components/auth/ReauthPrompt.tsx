import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Dialog, DialogDescription, DialogTitle, Input } from '../ui';
import { AuthCard } from './AuthCard';

export interface ReauthPromptProps {
  /** The signed-in account; only its password is asked for. */
  email: string;
  onLogin: (password: string) => Promise<void>;
  /** Fired by "Log out" and the X. Drops whatever was waiting on the login. */
  onLogOut: () => void;
}

/**
 * Shown over whatever is on screen when the session dies mid-play. Requests that hit the
 * expired session wait behind it and go through once the player logs back in.
 */
export function ReauthPrompt({ email, onLogin, onLogOut }: ReauthPromptProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(password);
    } catch {
      // The caller reports the failure; the form stays up for another try.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      disablePointerDismissal
      onOpenChange={(open, details) => {
        // Escape is too easy to hit by accident to cost the player their unsaved progress.
        if (!open && details.reason === 'close-press') onLogOut();
      }}
    >
      <AuthCard avatarVariant="outline" backdrop>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogTitle>Session expired</DialogTitle>

          <DialogDescription>Log in again to keep saving your progress.</DialogDescription>

          <Input name="email" type="email" autoComplete="username" readOnly value={email} />

          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            placeholder="Password"
            value={password}
            onValueChange={setPassword}
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>

          <Button variant="secondary" disabled={submitting} onClick={onLogOut}>
            Log out
          </Button>
        </form>
      </AuthCard>
    </Dialog>
  );
}
