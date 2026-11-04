import { animate, type AnimationPlaybackControls } from 'motion';

import type { CreationEngine } from '../../../engine/engine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import { responsive } from '../../../engine/utils/viewport';
import { scriptState, type ORTHO_ENUM } from '../../../zustandStores/scriptState';
import { ScriptPill } from './script-pill';

const HOME_TOP = 40;
const PHONE_HOME_TOP = 220; // below the home menu button
const DOCK_TOP = 24;
// Phone screens with room to spare dock the pill lower
const PHONE_DOCK_TOP: Partial<Record<string, number>> = { LayerSelectScreen: 70 };
const ENTER_OFFSET = 60;
const DOCK_DURATION = 0.6;
const FADE_DURATION = 0.3;

/** Home ("splash") screen: free-standing pill at top center, always expanded */
const HOME_SCREENS = ['HomeScreen'];
/** Menu screens: pill docked to the top-right corner, collapsed until tapped */
const MENU_SCREENS = [
  'LayerSelectScreen',
  'LevelMapScreen',
  'EducationLevelSelect',
  'LetterReferenceScreen',
  'AvatarSelectScreen',
];

type Mode = 'home' | 'menu' | 'hidden';

/**
 * Keeps a single ScriptPill above every screen so it can animate between the
 * home screen and the docked top-right position, and hides it everywhere else.
 */
export function initScriptPillOverlay(app: CreationEngine) {
  const navigation = app.navigation;

  let mode: Mode = 'hidden';
  let enterOffset = -ENTER_OFFSET;
  let lastScreen: { ctor: AppScreenConstructor<any[]>; props?: unknown } | undefined;
  let isReloading = false;
  let dockAnimation: AnimationPlaybackControls | undefined;
  let fadeAnimation: AnimationPlaybackControls | undefined;

  const onSelect = (script: ORTHO_ENUM) => {
    const { currentScript, setCurrentScript } = scriptState.getState();
    if (script === currentScript) return;
    setCurrentScript(script);
    if (mode === 'menu') void reloadScreen();
  };

  // Redraw the current screen so text already on it switches to the new script
  const reloadScreen = async () => {
    if (!lastScreen || isReloading) return;
    isReloading = true;
    try {
      const { ctor, props } = lastScreen;
      await (props !== undefined
        ? navigation.showScreen(ctor as AppScreenConstructor<[unknown]>, props)
        : navigation.showScreen(ctor as AppScreenConstructor));
    } finally {
      isReloading = false;
    }
  };

  const pill = new ScriptPill(onSelect);
  pill.zIndex = 1000;
  pill.alpha = 0;
  pill.eventMode = 'none';
  pill.interactiveChildren = false;
  app.stage.sortableChildren = true;
  app.stage.addChild(pill);

  // Position blends between top-center and the right edge by the pill's dock amount
  const place = () => {
    const screenWidth = app.renderer.width;
    const width = pill.visibleWidth;
    const homeX = (screenWidth - width) / 2;
    const dockX = screenWidth - width;
    pill.x = homeX + (dockX - homeX) * pill.dock;
    const screenName = navigation.currentScreen?.screenName ?? '';
    const phone = responsive({ sm: true, lg: false });
    const homeTop = phone ? PHONE_HOME_TOP : HOME_TOP;
    const dockTop = (phone && PHONE_DOCK_TOP[screenName]) || DOCK_TOP;
    pill.y = homeTop + (dockTop - homeTop) * pill.dock + enterOffset;
  };
  pill.onLayoutChange = place;
  app.renderer.on('resize', place);

  const setInteractive = (interactive: boolean) => {
    pill.eventMode = interactive ? 'passive' : 'none';
    pill.interactiveChildren = interactive;
  };

  const fade = (visible: boolean) => {
    fadeAnimation?.stop();
    const fromAlpha = pill.alpha;
    const fromOffset = enterOffset;
    const toOffset = visible ? 0 : -ENTER_OFFSET;
    fadeAnimation = animate(0, 1, {
      duration: FADE_DURATION,
      ease: visible ? 'easeOut' : 'easeIn',
      onUpdate: (t) => {
        pill.alpha = fromAlpha + ((visible ? 1 : 0) - fromAlpha) * t;
        enterOffset = fromOffset + (toOffset - fromOffset) * t;
        place();
      },
    });
  };

  // Animate between the home layout (expanded, free-standing) and the docked, collapsed one
  const animateDock = (toDocked: boolean) => {
    dockAnimation?.stop();
    pill.stopToggle();
    const fromProgress = pill.progress;
    const fromDock = pill.dock;
    const toProgress = toDocked ? 0 : 1;
    const toDock = toDocked ? 1 : 0;
    dockAnimation = animate(0, 1, {
      duration: DOCK_DURATION,
      ease: 'easeInOut',
      onUpdate: (t) =>
        pill.setState(
          fromProgress + (toProgress - fromProgress) * t,
          fromDock + (toDock - fromDock) * t,
        ),
    });
  };

  const setMode = (next: Mode) => {
    const prev = mode;
    mode = next;

    if (next === 'hidden') {
      setInteractive(false);
      if (prev !== 'hidden') fade(false);
      return;
    }

    setInteractive(true);
    if (prev === 'hidden') {
      // Appear already in place for the new screen
      dockAnimation?.stop();
      pill.stopToggle();
      pill.setState(next === 'home' ? 1 : 0, next === 'home' ? 0 : 1);
      fade(true);
    } else if (prev !== next) {
      animateDock(next === 'menu');
    } else if (next === 'menu' && pill.isExpanded) {
      pill.collapse();
    }
  };

  navigation.onScreenChange((ctor, props) => {
    lastScreen = { ctor, props };
    const name = navigation.currentScreen?.screenName ?? '';
    setMode(HOME_SCREENS.includes(name) ? 'home' : MENU_SCREENS.includes(name) ? 'menu' : 'hidden');
    place();
  });

  place();
}
