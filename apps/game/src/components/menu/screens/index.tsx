import { useOverlayStore } from '../../../zustandStores/overlayStore';
import { CloseButton } from '../../ui/CloseButton';
import { PrimaryButton } from '../../ui/PrimaryButton';

export interface MenuHomeScreenProps {
  onAbout: () => void;
  onReference: () => void;
}

export function MenuHomeScreen({ onAbout, onReference }: MenuHomeScreenProps) {
  return (
    <>
      <CloseButton
        className="absolute top-4 left-4"
        onClick={() => useOverlayStore.getState().hide()}
      />

      <div className="flex flex-col items-center gap-8">
        <PrimaryButton onClick={onAbout}>ABOUT</PrimaryButton>
        <PrimaryButton onClick={onReference}>REFERENCES</PrimaryButton>
      </div>
    </>
  );
}
