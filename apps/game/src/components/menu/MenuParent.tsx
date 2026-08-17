import { useState } from 'react';

import { Card } from '../ui/Card';
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
    <Card
      className={
        view === 'alphabet'
          ? 'max-w-5xl justify-start overflow-hidden'
          : view === 'converter' || view === 'project' || view === 'team'
            ? 'justify-start overflow-hidden px-10 md:px-16'
            : undefined
      }
    >
      {renderScreen()}
    </Card>
  );
}
