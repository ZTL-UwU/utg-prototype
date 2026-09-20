import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from './utils';

export function Input({
  className,
  placeholder,
  'aria-label': ariaLabel,
  ...props
}: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className={cn(
        'mx-auto w-4/5 rounded-pill border-[3px] border-ink bg-cream px-5 py-4.5 text-center',
        'font-body text-2xl text-ink outline-none placeholder:text-muted',
        'shadow-[0_3px_0_0_var(--color-ink)] transition',
        'focus-visible:border-forest focus-visible:ring-4 focus-visible:ring-forest/30',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-invalid:border-alert aria-invalid:focus-visible:border-alert aria-invalid:focus-visible:ring-alert/30',
        className,
      )}
      {...props}
    />
  );
}
