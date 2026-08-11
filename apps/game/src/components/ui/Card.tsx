import { cn } from './utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex max-w-4xl w-full min-h-[62vh] max-h-screen flex-col justify-center',
        'rounded-3xl bg-cream px-5 md:px-10 pt-16 pb-8 shadow-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
