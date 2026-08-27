import { useEffect, useState } from 'react';

import { CloseButton } from './ui/CloseButton';
import { PrimaryButton } from './ui/PrimaryButton';

const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function MobileBlockerBanner() {
  const isMobile = MOBILE_USER_AGENT.test(navigator.userAgent);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMobile || dismissed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, dismissed]);

  if (!isMobile || dismissed) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[repeating-linear-gradient(-45deg,#f1f1f3_0,#f1f1f3_14px,#fafafb_14px,#fafafb_28px)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-blocker-title"
    >
      <div className="relative mx-6 w-full max-w-md rounded-3xl bg-cream px-6 pt-14 pb-8 shadow-2xl">
        <CloseButton className="absolute top-4 left-4" onClick={() => setDismissed(true)} />
        <p
          id="mobile-blocker-title"
          className="text-center font-display text-lg font-bold text-ink"
        >
          This experience works best on a tablet or desktop.
        </p>
        <p className="mt-3 text-center font-body text-base text-muted">
          You can continue on this device, but a larger screen is recommended.
        </p>
        <PrimaryButton className="mt-6" onClick={() => setDismissed(true)}>
          Continue anyway
        </PrimaryButton>
      </div>
    </div>
  );
}
