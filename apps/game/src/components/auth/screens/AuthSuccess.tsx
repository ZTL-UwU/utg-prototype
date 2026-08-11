import { PrimaryButton } from '../../ui/PrimaryButton';
import { StatusIcon } from '../../ui/StatusIcon';

export interface AuthSuccessProps {
  onPlay: () => void;
}

export function AuthSuccess({ onPlay }: AuthSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <h2 className="text-center font-display text-3xl font-bold tracking-wide text-forest uppercase">
        You're all set!
      </h2>

      <p className="text-center font-body text-sm text-muted">
        Your account is ready.
        <br />
        The mountains are waiting for you.
      </p>

      <PrimaryButton className="mt-2 uppercase" onClick={onPlay}>
        Let's play the game!
      </PrimaryButton>
    </div>
  );
}
