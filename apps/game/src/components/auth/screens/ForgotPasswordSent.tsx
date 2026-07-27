import { LinkButton } from '../components/LinkButton';
import { StatusIcon } from '../components/StatusIcon';

export interface ForgotPasswordSentProps {
  onBack: () => void;
}

export function ForgotPasswordSent({ onBack }: ForgotPasswordSentProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <h2 className="text-center font-display text-3xl font-semibold text-ink">Check your email</h2>

      <p className="text-center font-body text-lg text-muted">
        If an account exists for that email, we sent a link to reset your password.
      </p>

      <div className="flex justify-center">
        <LinkButton onClick={onBack}>Back to login</LinkButton>
      </div>
    </div>
  );
}
