import { m } from '../../../paraglide/messages.js';
import { Button, DialogDescription, DialogTitle, StatusIcon } from '../../ui';

export interface ForgotPasswordSentProps {
  onBack: () => void;
}

export function ForgotPasswordSent({ onBack }: ForgotPasswordSentProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <DialogTitle className="text-3xl">{m.auth_check_email()}</DialogTitle>

      <DialogDescription>{m.auth_check_email_description()}</DialogDescription>

      <Button variant="link" onClick={onBack}>
        {m.auth_back_to_login()}
      </Button>
    </div>
  );
}
