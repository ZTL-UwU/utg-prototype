import { m } from '../../../paraglide/messages.js';
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
          <CardTitle>{m.menu_about()}</CardTitle>
          <Button onClick={onProject}>{m.menu_project()}</Button>
          <Button onClick={onTeam}>{m.menu_team()}</Button>
        </section>

        <section className="flex w-full flex-col items-center gap-4">
          <CardTitle>{m.menu_references()}</CardTitle>
          <Button onClick={onAlphabet}>{m.menu_alphabet()}</Button>
          <Button onClick={onConverter}>{m.menu_converter()}</Button>
        </section>
      </div>
    </>
  );
}
