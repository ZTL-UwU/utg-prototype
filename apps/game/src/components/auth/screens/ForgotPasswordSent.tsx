import { Button, DialogDescription, DialogTitle, StatusIcon } from '../../ui';

export interface ForgotPasswordSentProps {
  onBack: () => void;
}

export function ForgotPasswordSent({ onBack }: ForgotPasswordSentProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <DialogTitle className="text-3xl">Check your email</DialogTitle>

      <DialogDescription>
        If an account exists for that email, we sent a link to reset your password.
      </DialogDescription>

      <Button variant="link" onClick={onBack}>
        Back to login
      </Button>
    </div>
  );
}
