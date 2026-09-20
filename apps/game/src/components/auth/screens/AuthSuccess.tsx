import { Button, CardTitle, StatusIcon } from '../../ui';

export interface AuthSuccessProps {
  onPlay: () => void;
}

export function AuthSuccess({ onPlay }: AuthSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <CardTitle>You&apos;re all set!</CardTitle>

      <p className="text-center font-body text-sm text-muted">
        Your account is ready.
        <br />
        The mountains are waiting for you.
      </p>

      <Button className="mt-2 uppercase" onClick={onPlay}>
        Let&apos;s play the game!
      </Button>
    </div>
  );
}
