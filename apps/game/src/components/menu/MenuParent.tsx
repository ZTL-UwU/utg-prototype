import { useState } from 'react';

import { useOverlayStore } from '../../zustandStores/overlayStore';
import { Dialog, DialogPopup, cn } from '../ui';
import { MenuHomeScreen } from './screens';
import { MenuAlphabetScreen } from './screens/alphabet';
import { MenuConverterScreen } from './screens/converter';
import { MenuProjectScreen } from './screens/project';
import { MenuTeamScreen } from './screens/team';

export type MenuView = 'home' | 'alphabet' | 'converter' | 'project' | 'team';

export function MenuParent() {
  const [view, setView] = useState<MenuView>('home');

  const renderScreen = () => {
    switch (view) {
      case 'home':
        return (
          <MenuHomeScreen
            onAlphabet={() => setView('alphabet')}
            onConverter={() => setView('converter')}
            onProject={() => setView('project')}
            onTeam={() => setView('team')}
          />
        );
      case 'alphabet':
        return <MenuAlphabetScreen onBack={() => setView('home')} />;
      case 'converter':
        return <MenuConverterScreen onBack={() => setView('home')} />;
      case 'project':
        return <MenuProjectScreen onBack={() => setView('home')} />;
      case 'team':
        return <MenuTeamScreen onBack={() => setView('home')} />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) useOverlayStore.getState().hide();
      }}
    >
      <DialogPopup
        className={cn(
          view === 'alphabet' && 'max-w-5xl justify-start overflow-hidden',
          view === 'team' &&
            'max-h-[92vh] max-w-[95vw] min-h-[90vh] justify-start overflow-hidden px-6 md:px-10',
          (view === 'converter' || view === 'project') &&
            'justify-start overflow-hidden px-10 md:px-16',
        )}
      >
        {/* Screens render straight into the card: their corner nav buttons and
            titles are absolutely positioned against it, and each screen owns
            its own scrolling. No wrapper here — even a plain-looking div with
            a retained animation transform would become the containing block
            for those absolute elements and push them onto the content, and a
            flex-1 wrapper would defeat the card's centering of short views. */}
        {renderScreen()}
      </DialogPopup>
    </Dialog>
  );
}
