import { m } from '../../../paraglide/messages.js';
import { Button, CardTitle, StatusIcon } from '../../ui';

export interface AuthSuccessProps {
  onPlay: () => void;
}

export function AuthSuccess({ onPlay }: AuthSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusIcon />

      <CardTitle>{m.auth_success_title()}</CardTitle>

      <p className="text-center font-body text-sm text-muted">
        {m.auth_success_account_ready()}
        <br />
        {m.auth_success_mountains()}
      </p>

      <Button className="mt-2 uppercase" onClick={onPlay}>
        {m.auth_success_play()}
      </Button>
    </div>
  );
}
