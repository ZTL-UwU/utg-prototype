import { useState } from 'react';

import { Button } from './ui';

const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function MobileBlockerBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [isMobile] = useState(() => MOBILE_USER_AGENT.test(navigator.userAgent));

  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 z-50 flex h-svh w-screen items-center justify-center bg-[repeating-linear-gradient(-45deg,#f1f1f3_0,#f1f1f3_14px,#fafafb_14px,#fafafb_28px)]">
      <div className="flex flex-col items-center">
        <p className="p-6 text-center text-lg font-bold text-black">
          This experience works best on a tablet or desktop. Please use a larger screen to continue.
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
