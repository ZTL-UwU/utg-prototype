import type { TextDropShadow } from 'pixi.js';

import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import { EducationLevelScreen } from '../education-level/level-1';
import { EducationBubbleScreen } from '../education-level/level-2';
import { EducationSheepScreen } from '../education-level/level-3';
import { EducationImageScreen } from '../education-level/level-4';
import { EducationWordScreen } from '../education-level/level-5';
import { EducationSheepJumpScreen } from '../education-level/level-6';
import { EducationWhackAMoleScreen } from '../education-level/level-7';
import { GameLevelOneScreen } from '../game-level/level-1';
import { TypingLevelScreen } from '../typing-level/level-1';
import { TypingSandstormScreen } from '../typing-level/level-2';
import { TypingInstrumentScreen } from '../typing-level/level-3';
import { TypingWordScreen } from '../typing-level/level-4';
import { TypingMarketScreen } from '../typing-level/level-5';

export type TLayer = 'typing' | 'education' | 'game';

export type TLevel = {
  id: number;
  title?: string;
  unlocked: boolean;
  mascot: 'sheep' | 'goat' | 'camel' | 'chef';
  screen?: AppScreenConstructor<any[]>;
  background: string;
  splashScreenBg?: string;
  helpAsset: string[];
  backdropColor: number;
  splashColorScheme?: SplashColorScheme;
  mascotOnSplash: boolean;
  props?: { [key: string]: any };
};

export type SplashColorScheme = {
  BUTTON_FILL: number;
  BUTTON_TEXT_FILL: number;
  LEVEL_FONT_FILL: number;
  LEVEL_TITLE_FILL: number;
};

export type TMapUnit = {
  type: TLayer;
  background: string;
  title: {
    text: string;
    fontSize: number;
    fontColor: number;
    isCurved: boolean;
    dropShadow?: Partial<TextDropShadow>;
  };
  subtitle?: {
    text: string;
    fontSize: number;
    fontColor: number;
  };
  levels: TLevel[];
};

const LETTER_SETS = {
  lvl1: ['ب', 'ئو', 'ج', 'ۋ', 'د', 'ش', 'ئۆ', 'ق'],
  lvl2: ['ر', 'ن', 'ئە', 'ئې', 'ھ', 'چ', 'ز', 'غ'],
  lvl3: ['ژ', 'س', 'ت', 'م', 'ل', 'ف', 'ئى', 'خ'],
  lvl4: ['پ', 'ئۇ', 'ئا', 'ك', 'ڭ', 'ئۈ', 'ي', 'گ'],
};
const U_LETTER_SET = [
  ...LETTER_SETS.lvl1,
  ...LETTER_SETS.lvl2,
  ...LETTER_SETS.lvl3,
  ...LETTER_SETS.lvl4,
];

// Shared by each education map unit's title and the splash screens of the levels inside it.
const EDUCATION_UNIT_COLORS = {
  unit1: 0xffffff,
  unit2: 0xffffff,
  unit3: 0xffffff,
  unit4: 0xe49835,
  unit5: 0xe49835,
};

const textDropShadow: Partial<TextDropShadow> = {
  color: 0x000000,
  blur: 5,
  distance: 0,
  alpha: 0.75,
};

function educationSplashColorScheme(
  fontColor: number,
  fallbackButtonColor: number = 0xc08e82,
): SplashColorScheme {
  return {
    BUTTON_FILL: fontColor === 0xffffff ? fallbackButtonColor : fontColor,
    BUTTON_TEXT_FILL: 0xffffff,
    LEVEL_FONT_FILL: fontColor,
    LEVEL_TITLE_FILL: fontColor,
  };
}

export const educationMaps: TMapUnit[] = [
  {
    type: 'education',
    background: 'education-levels/education-level-map/background-unit-1.png',
    title: {
      text: 'LEVEL 1',
      fontSize: 240,
      fontColor: EDUCATION_UNIT_COLORS.unit1,
      isCurved: true,
    },
    levels: [
      {
        id: 1,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationLevelScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-1.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit1, 0x789843),
        helpAsset: ['tutorial-popups/education-level-1.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
        props: {
          letters: LETTER_SETS.lvl1,
        },
      },
      {
        id: 2,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationBubbleScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-1.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit1, 0x789843),
        helpAsset: ['tutorial-popups/education-level-2.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
        props: {
          letters: LETTER_SETS.lvl1,
        },
      },
      {
        id: 3,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationImageScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-1.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit1, 0x789843),
        helpAsset: ['tutorial-popups/education-level-4.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
        props: {
          letters: LETTER_SETS.lvl1,
        },
      },
    ],
  },
  {
    type: 'education',
    background: 'education-levels/education-level-map/background-unit-2.png',
    title: {
      text: 'LEVEL 2',
      fontSize: 240,
      fontColor: EDUCATION_UNIT_COLORS.unit2,
      isCurved: true,
    },
    levels: [
      {
        id: 4,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationLevelScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-2.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit2, 0x4a9b54),
        helpAsset: ['tutorial-popups/education-level-1.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl2,
        },
      },
      {
        id: 5,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationSheepScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-2.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit2, 0x4a9b54),
        helpAsset: ['tutorial-popups/education-level-3.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl2,
        },
      },
      {
        id: 6,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationWordScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-2.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit2, 0x4a9b54),
        helpAsset: ['tutorial-popups/education-level-5.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl2,
        },
      },
    ],
  },
  {
    type: 'education',
    background: 'education-levels/education-level-map/background-unit-3.png',
    title: {
      text: 'LEVEL 3',
      fontSize: 240,
      fontColor: EDUCATION_UNIT_COLORS.unit3,
      isCurved: true,
    },
    levels: [
      {
        id: 7,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationLevelScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-3.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit3, 0xebce9f),
        // TODO: missing tutorial asset
        helpAsset: ['tutorial-popups/education-level-1.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl3,
        },
      },
      {
        id: 8,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationWhackAMoleScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-3.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit3, 0xebce9f),
        helpAsset: ['tutorial-popups/education-level-7.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl3,
        },
      },
      {
        id: 9,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationImageScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-3.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit3, 0xebce9f),
        helpAsset: ['tutorial-popups/education-level-4.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl3,
        },
      },
    ],
  },
  {
    type: 'education',
    background: 'education-levels/education-level-map/background-unit-4.png',
    title: {
      text: 'LEVEL 4',
      fontSize: 240,
      fontColor: EDUCATION_UNIT_COLORS.unit4,
      isCurved: true,
    },
    levels: [
      {
        id: 10,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationLevelScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-4.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit4),
        // TODO: missing tutorial asset
        helpAsset: ['tutorial-popups/education-level-1.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl4,
        },
      },
      {
        id: 11,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationBubbleScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-4.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit4),
        helpAsset: ['tutorial-popups/education-level-7.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl4,
        },
      },
      {
        id: 12,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationWordScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-4.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit4),
        helpAsset: ['tutorial-popups/education-level-5.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: LETTER_SETS.lvl4,
        },
      },
    ],
  },
  {
    type: 'education',
    background: 'education-levels/education-level-map/background-unit-5.png',
    title: {
      text: 'LEVEL 5',
      fontSize: 240,
      fontColor: EDUCATION_UNIT_COLORS.unit5,
      isCurved: true,
    },
    levels: [
      {
        id: 13,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationSheepJumpScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-5.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit5),
        helpAsset: ['tutorial-popups/education-level-6.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: [...U_LETTER_SET].sort(() => Math.random() - 0.5).slice(0, 12),
        },
      },
      {
        id: 14,
        unlocked: true,
        mascot: 'sheep',
        screen: EducationImageScreen,
        background: 'education-levels/education-level/background.png',
        splashScreenBg: 'education-levels/education-level-map/background-unit-5.png',
        splashColorScheme: educationSplashColorScheme(EDUCATION_UNIT_COLORS.unit5),
        helpAsset: ['tutorial-popups/education-level-4.png'],
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
        props: {
          letters: [...U_LETTER_SET].sort(() => Math.random() - 0.5).slice(0, 12),
        },
      },
    ],
  },
];

export const typingMaps: TMapUnit[] = [
  {
    type: 'typing',
    background: 'typing-levels/typing-level-map/background.png',
    title: {
      text: 'TYPING JOURNEY',
      fontSize: 160,
      fontColor: 0xffffff,
      isCurved: false,
      dropShadow: textDropShadow,
    },
    subtitle: { text: 'سەپەر', fontSize: 100, fontColor: 0xffffff },
    levels: [
      {
        id: 1,
        title: 'TAKLAMAKAN DESERT',
        mascot: 'camel',
        unlocked: true,
        screen: TypingLevelScreen,
        background: 'typing-levels/typing-level/background-taklamakan.png',
        helpAsset: ['tutorial-popups/typing-tutorial.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0xc45a14,
          BUTTON_TEXT_FILL: 0xffe2bc,
          LEVEL_FONT_FILL: 0xc98144,
          LEVEL_TITLE_FILL: 0x6b411e,
        },
        mascotOnSplash: true,
      },
      {
        id: 2,
        title: 'TAKLAMAKAN SANDSTORM',
        mascot: 'camel',
        unlocked: true,
        screen: TypingSandstormScreen,
        background: 'typing-levels/typing-level/background-sandstorm.png',
        helpAsset: ['tutorial-popups/typing-tutorial.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0xc45a14,
          BUTTON_TEXT_FILL: 0xffe2bc,
          LEVEL_FONT_FILL: 0xc45a14,
          LEVEL_TITLE_FILL: 0x6b411e,
        },
        mascotOnSplash: false,
      },
      {
        id: 3,
        unlocked: true,
        title: 'TANGRI TAH',
        mascot: 'goat',
        screen: TypingInstrumentScreen,
        background: 'typing-levels/typing-level/background-tangri-tah.png',
        helpAsset: ['tutorial-popups/typing-tutorial.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0x6e8539,
          BUTTON_TEXT_FILL: 0xf5f3ef,
          LEVEL_FONT_FILL: 0x6e8539,
          LEVEL_TITLE_FILL: 0x6e8539,
        },
        mascotOnSplash: true,
      },
      {
        id: 4,
        unlocked: true,
        title: 'FARMERS HARVEST',
        mascot: 'camel',
        screen: TypingWordScreen,
        background: 'typing-levels/typing-level/background-farmers-harvest.png',
        helpAsset: ['tutorial-popups/typing-tutorial.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0xc98144,
          BUTTON_TEXT_FILL: 0xffe2bc,
          LEVEL_FONT_FILL: 0xc98144,
          LEVEL_TITLE_FILL: 0xc98144,
        },
        mascotOnSplash: false,
      },
      {
        id: 5,
        title: 'KASHGAR BAZAAR',
        mascot: 'camel',
        unlocked: true,
        screen: TypingMarketScreen,
        background: 'typing-levels/typing-level/background-kashgar.png',
        helpAsset: ['tutorial-popups/typing-level-5-1.png', 'tutorial-popups/typing-level-5-2.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0x7e5433,
          BUTTON_TEXT_FILL: 0xfbf0de,
          LEVEL_FONT_FILL: 0xfbf0de,
          LEVEL_TITLE_FILL: 0xfbf0de,
        },
        mascotOnSplash: false,
      },
    ],
  },
];

export const gameMaps: TMapUnit[] = [
  {
    type: 'game',
    background: 'game-levels/game-level-map/background.png',
    title: { text: 'THE MASTERY', fontSize: 160, fontColor: 0xffffff, isCurved: false },
    subtitle: { text: 'سىناق', fontSize: 100, fontColor: 0xffffff },
    levels: [
      {
        id: 1,
        unlocked: true,
        title: 'TANDOOR RUSH',
        mascot: 'chef',
        screen: GameLevelOneScreen,
        background: 'game-levels/game-level/background.png',
        // TODO: missing tutorial asset
        helpAsset: ['tutorial-popups/game-level-1-1.png', 'tutorial-popups/game-level-1-2.png'],
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0x7e5433,
          BUTTON_TEXT_FILL: 0xffe2bc,
          LEVEL_FONT_FILL: 0x7e5433,
          LEVEL_TITLE_FILL: 0x7e5433,
        },
        mascotOnSplash: false,
      },
    ],
  },
];

export function getLayerMaps(layer: TLayer): TMapUnit[] {
  switch (layer) {
    case 'education':
      return educationMaps;
    case 'typing':
      return typingMaps;
    case 'game':
      return gameMaps;
  }
}

export function getMapCollection(mapUnit: TMapUnit): TMapUnit[] {
  return getLayerMaps(mapUnit.type);
}

export function getPrevMap(mapUnit: TMapUnit): TMapUnit | undefined {
  const maps = getMapCollection(mapUnit);
  const index = maps.indexOf(mapUnit);
  return index > 0 ? maps[index - 1] : undefined;
}

export function getNextMap(mapUnit: TMapUnit): TMapUnit | undefined {
  const maps = getMapCollection(mapUnit);
  const index = maps.indexOf(mapUnit);
  return index >= 0 && index < maps.length - 1 ? maps[index + 1] : undefined;
}

export function findMapUnitForLevel(level: TLevel): TMapUnit {
  const allMaps = [...educationMaps, ...typingMaps, ...gameMaps];
  const mapUnit = allMaps.find((map) => map.levels.includes(level));
  if (!mapUnit) {
    throw new Error(`No map unit found for level ${level.id}`);
  }
  return mapUnit;
}

export function getLevelType(level: TLevel): TLayer {
  return findMapUnitForLevel(level).type;
}

export function getNextLevelAfter(
  currentLevel: TLevel,
): { mapUnit: TMapUnit; level: TLevel } | undefined {
  const mapUnit = findMapUnitForLevel(currentLevel);
  const currentLevelIndex = mapUnit.levels.indexOf(currentLevel);

  if (currentLevelIndex === -1) return;

  const maps = getMapCollection(mapUnit);
  let mapIndex = maps.indexOf(mapUnit);
  let nextLevelIndex = currentLevelIndex + 1;

  while (mapIndex >= 0 && mapIndex < maps.length) {
    const nextMapUnit = maps[mapIndex];
    const nextLevel = nextMapUnit.levels
      .slice(nextLevelIndex)
      .find((level) => level.unlocked && level.screen);
    if (nextLevel?.screen) {
      return { mapUnit: nextMapUnit, level: nextLevel };
    }

    mapIndex += 1;
    nextLevelIndex = 0;
  }
}
