import { useOverlayStore } from '../../../zustandStores/overlayStore';
import { CloseButton } from '../../ui/CloseButton';
import { PrimaryButton } from '../../ui/PrimaryButton';

export interface MenuHomeScreenProps {
  onAlphabet: () => void;
  onConverter: () => void;
  onProject: () => void;
  onTeam: () => void;
}

export function MenuHomeScreen({
  onAlphabet,
  onConverter,
  onProject,
  onTeam,
}: MenuHomeScreenProps) {
  return (
    <>
      <CloseButton
        className="absolute top-4 left-4"
        onClick={() => useOverlayStore.getState().hide()}
      />

      <div className="flex flex-col items-center gap-8">
        <section className="flex w-full flex-col items-center gap-4">
          <h2 className="font-display text-3xl font-bold tracking-wide text-forest uppercase">
            About
          </h2>
          <PrimaryButton onClick={onProject}>PROJECT</PrimaryButton>
          <PrimaryButton onClick={onTeam}>TEAM</PrimaryButton>
        </section>

        <section className="flex w-full flex-col items-center gap-4">
          <h2 className="font-display text-3xl font-bold tracking-wide text-forest uppercase">
            References
          </h2>
          <PrimaryButton onClick={onAlphabet}>ALPHABET</PrimaryButton>
          <PrimaryButton onClick={onConverter}>CONVERTER</PrimaryButton>
        </section>
      </div>
    </>
  );
}
