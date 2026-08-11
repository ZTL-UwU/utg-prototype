import { BackButton } from '../../ui/BackButton';
import { PrimaryButton } from '../../ui/PrimaryButton';

export interface MenuReferencesScreenProps {
  onBack: () => void;
  onAlphabet: () => void;
  onConverter: () => void;
}

export function MenuReferencesScreen({
  onBack,
  onAlphabet,
  onConverter,
}: MenuReferencesScreenProps) {
  return (
    <>
      <BackButton className="absolute top-4 left-4" onClick={onBack} />

      <div className="flex flex-col items-center gap-8">
        <PrimaryButton onClick={onAlphabet}>ALPHABET</PrimaryButton>
        <PrimaryButton onClick={onConverter}>CONVERTER</PrimaryButton>
      </div>
    </>
  );
}
