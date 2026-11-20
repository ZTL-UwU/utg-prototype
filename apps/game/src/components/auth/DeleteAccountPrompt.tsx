import { useState } from 'react';
import type { FormEvent } from 'react';

import { m } from '../../paraglide/messages.js';
import { Button, Dialog, DialogDescription, DialogTitle, Input } from '../ui';
import { AuthCard } from './AuthCard';

export interface DeleteAccountPromptProps {
  /** Rejects on failure; the prompt then goes back to the password step. */
  onDelete: (password: string) => Promise<void>;
  /** Fired by "Keep account", the X and Escape. */
  onCancel: () => void;
}

/**
 * Warns that deleting the account is permanent, takes the password, then asks once more
 * before anything is sent: the single Continue button splits into Delete / Keep.
 */
export function DeleteAccountPrompt({ onDelete, onCancel }: DeleteAccountPromptProps) {
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Enter only ever reaches the confirm step; deleting always takes an explicit tap.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password) setConfirming(true);
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onDelete(password);
    } catch {
      // The caller reports the failure; let the player fix the password and try again.
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onCancel();
      }}
    >
      <AuthCard avatarVariant="outline" backdrop>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogTitle>{m.delete_account_title()}</DialogTitle>

          <DialogDescription>{m.delete_account_warning()}</DialogDescription>

          <DialogDescription>{m.delete_account_password_prompt()}</DialogDescription>

          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            disabled={submitting}
            placeholder={m.auth_password()}
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              setConfirming(false);
            }}
          />

          {confirming ? (
            <div className="mx-auto flex w-4/5 gap-3">
              <Button
                variant="danger"
                className="w-auto flex-1 px-4"
                disabled={submitting}
                onClick={() => void handleDelete()}
              >
                {submitting ? m.delete_account_deleting() : m.delete_account_confirm()}
              </Button>
              <Button
                variant="secondary"
                className="w-auto flex-1 px-4"
                disabled={submitting}
                onClick={onCancel}
              >
                {m.delete_account_keep()}
              </Button>
            </div>
          ) : (
            <Button type="submit" variant="danger">
              {m.delete_account_continue()}
            </Button>
          )}
        </form>
      </AuthCard>
    </Dialog>
  );
}
