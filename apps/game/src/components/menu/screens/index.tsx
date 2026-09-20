import { Button, CardTitle, CloseButton } from '../../ui';

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
      <CloseButton className="absolute top-4 left-4" />

      <div className="flex flex-col items-center gap-8">
        <section className="flex w-full flex-col items-center gap-4">
          <CardTitle>About</CardTitle>
          <Button onClick={onProject}>PROJECT</Button>
          <Button onClick={onTeam}>TEAM</Button>
        </section>

        <section className="flex w-full flex-col items-center gap-4">
          <CardTitle>References</CardTitle>
          <Button onClick={onAlphabet}>ALPHABET</Button>
          <Button onClick={onConverter}>CONVERTER</Button>
        </section>
      </div>
    </>
  );
}
