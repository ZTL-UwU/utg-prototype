import { BackButton } from '../../ui/BackButton';

export interface MenuProjectScreenProps {
  onBack: () => void;
}

export function MenuProjectScreen({ onBack }: MenuProjectScreenProps) {
  return (
    <>
      <BackButton className="absolute top-4 left-4 z-10" onClick={onBack} />
      <h2 className="absolute top-4 right-14 left-14 flex h-10 items-center justify-center font-display text-3xl font-bold tracking-wide text-forest uppercase">
        Project
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto py-2"></div>
    </>
  );
}
