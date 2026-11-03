import { useState } from 'react';

import { Button } from './ui';

/** Phone browsers can't be locked to portrait like the native apps, so ask for it instead. */
export function RotateDevicePrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 z-50 hidden h-svh w-screen items-center justify-center bg-[repeating-linear-gradient(-45deg,#f1f1f3_0,#f1f1f3_14px,#fafafb_14px,#fafafb_28px)] phone-landscape:flex">
      <div className="flex flex-col items-center">
        <p className="p-6 text-center text-lg font-bold text-black">
          Turn your phone upright to play.
        </p>
        <Button
          variant="link"
          className="text-lg font-bold text-black underline hover:text-black"
          onClick={() => setDismissed(true)}
        >
          Continue anyway
        </Button>
      </div>
    </div>
  );
}
