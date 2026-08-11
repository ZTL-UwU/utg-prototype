import { BackButton } from '../../ui/BackButton';
import { PrimaryButton } from '../../ui/PrimaryButton';

export interface MenuAboutScreenProps {
  onBack: () => void;
}

export function MenuAboutScreen({ onBack }: MenuAboutScreenProps) {
  return (
    <>
      <BackButton className="absolute top-4 left-4" onClick={onBack} />

      <div className="flex flex-col items-center gap-8">
        <PrimaryButton href="https://codhers.ubc.ca/student-codhers/">TEAM</PrimaryButton>
        <PrimaryButton href="https://codhers.ubc.ca/projects/">PROJECT</PrimaryButton>
      </div>
    </>
  );
}
