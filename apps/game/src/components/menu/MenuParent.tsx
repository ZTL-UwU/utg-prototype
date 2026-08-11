import { useState } from 'react';

import { Card } from '../ui/Card';
import { MenuHomeScreen } from './screens';
import { MenuAboutScreen } from './screens/about';
import { MenuAlphabetScreen } from './screens/alphabet';
import { MenuConverterScreen } from './screens/converter';
import { MenuReferencesScreen } from './screens/references';

export type MenuView = 'home' | 'about' | 'reference' | 'alphabet' | 'converter';

export function MenuParent() {
  const [view, setView] = useState<MenuView>('home');

  const renderScreen = () => {
    switch (view) {
      case 'home':
        return (
          <MenuHomeScreen
            onAbout={() => setView('about')}
            onReference={() => setView('reference')}
          />
        );
      case 'about':
        return <MenuAboutScreen onBack={() => setView('home')} />;
      case 'reference':
        return (
          <MenuReferencesScreen
            onBack={() => setView('home')}
            onAlphabet={() => setView('alphabet')}
            onConverter={() => setView('converter')}
          />
        );
      case 'alphabet':
        return <MenuAlphabetScreen onBack={() => setView('reference')} />;
      case 'converter':
        return <MenuConverterScreen onBack={() => setView('reference')} />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={
        view === 'alphabet'
          ? 'max-w-5xl justify-start overflow-hidden'
          : view === 'converter'
            ? 'justify-start overflow-hidden px-10 md:px-16'
            : undefined
      }
    >
      {renderScreen()}
    </Card>
  );
}
