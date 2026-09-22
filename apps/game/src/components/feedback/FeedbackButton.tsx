import { feedbackHotkeyLabel } from '../../lib/feedback';
import { openFeedback } from './FeedbackOverlay';

/** Lucide `message-square-warning`, the feedback icon used in the admin app. */
function FeedbackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
      aria-hidden="true"
    >
      <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
      <path d="M12 15h.01" />
      <path d="M12 7v4" />
    </svg>
  );
}

export function FeedbackButton() {
  return (
    <button
      type="button"
      aria-label="Send feedback"
      title={`Send feedback (${feedbackHotkeyLabel()})`}
      className={[
        'pointer-events-auto fixed right-4 bottom-4 z-30',
        'inline-flex size-16 cursor-pointer items-center justify-center rounded-full',
        'border-2 border-forest bg-cream text-forest',
        'shadow-[0_3px_0_0_var(--color-forest-dark)]',
        'transition duration-100 outline-none',
        'hover:bg-forest hover:text-cream',
        'focus-visible:ring-4 focus-visible:ring-forest/40',
        'active:translate-y-px active:scale-95 active:shadow-[0_1px_0_0_var(--color-forest-dark)]',
      ].join(' ')}
      onClick={() => {
        void openFeedback();
      }}
    >
      <FeedbackIcon />
    </button>
  );
}
