import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import { EducationLevelScreen } from '../education-level/level-1';
import { EducationBubbleScreen } from '../education-level/level-2';
import { EducationSheepScreen } from '../education-level/level-3';
import { EducationImageScreen } from '../education-level/level-4';
import { EducationWordScreen } from '../education-level/level-5';
import { EducationSheepJumpScreen } from '../education-level/level-6';
import { EducationWhackAMoleScreen } from '../education-level/level-7';
import { TypingLevelScreen } from '../typing-level/level-1';
import { TypingSandstormScreen } from '../typing-level/level-2';
import { TypingInstrumentScreen } from '../typing-level/level-3';
import { TypingWordScreen } from '../typing-level/level-4';
import { TypingMarketScreen } from '../typing-level/level-5';
export type TLevel = {
  id: number;
  title?: string;
  unlocked: boolean;
  miniMapImage: string;
  mascot: 'sheep' | 'goat' | 'camel';
  screen?: AppScreenConstructor<any[]>;
  background: string;
  helpAsset: string;
  backdropColor: number;
  splashColorScheme?: SplashColorScheme;
  mascotOnSplash: boolean;
};

export type SplashColorScheme = {
  BUTTON_FILL: number;
  BUTTON_TEXT_FILL: number;
  LEVEL_FONT_FILL: number;
  LEVEL_TITLE_FILL: number;
};

export type TMapUnit = {
  type: 'typing' | 'education';
  background: string;
  title: { text: string; fontSize: number };
  helpAsset?: string;
  backdropColor?: number;
  levels: TLevel[];
};

export const educationMaps: TMapUnit[] = [
  {
    type: 'education',
    background: 'education-levels/education-level-map/background.png',
    title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
    levels: [
      {
        id: 1,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationLevelScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-1.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
      {
        id: 2,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationBubbleScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-2.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
      {
        id: 3,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationSheepScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-3.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
      {
        id: 4,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationImageScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-4.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
    ],
  },
  {
    type: 'education',
    background: 'education-levels/education-level-map/background.png',
    title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
    levels: [
      {
        id: 5,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationWordScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-5.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
      {
        id: 6,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationSheepJumpScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-6.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
      {
        id: 7,
        unlocked: true,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationWhackAMoleScreen,
        background: 'education-levels/education-level/background.png',
        // TODO: missing tutorial asset
        helpAsset: 'tutorial-popups/education-level-7.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: false,
      },
      {
        id: 8,
        unlocked: false,
        mascot: 'sheep',
        miniMapImage: 'education-levels/education-level-map/button-preview.svg',
        screen: EducationImageScreen,
        background: 'education-levels/education-level/background.png',
        helpAsset: 'tutorial-popups/education-level-4.png',
        backdropColor: 0x4a90e2,
        mascotOnSplash: true,
      },
    ],
  },
];

export const typingMaps: TMapUnit[] = [
  {
    type: 'typing',
    background: 'typing-levels/typing-level-map/background.png',
    title: { text: 'TYPING IN UYGHUR', fontSize: 150 },
    helpAsset: 'tutorial-popups/typing-tutorial.png',
    backdropColor: 0x7d5600,
    levels: [
      {
        id: 1,
        title: 'TAKLAMAKAN DESERT',
        mascot: 'camel',
        unlocked: true,
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingLevelScreen,
        background: 'typing-levels/typing-level/background-taklamakan.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
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
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingSandstormScreen,
        background: 'typing-levels/typing-level/background-sandstorm.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
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
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingInstrumentScreen,
        background: 'typing-levels/typing-level/background-tangri-tah.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
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
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingWordScreen,
        background: 'typing-levels/typing-level/background-farmers-harvest.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x8ec24d,
        splashColorScheme: {
          BUTTON_FILL: 0xc98144,
          BUTTON_TEXT_FILL: 0xffe2bc,
          LEVEL_FONT_FILL: 0xc98144,
          LEVEL_TITLE_FILL: 0xffe2bc,
        },
        mascotOnSplash: false,
      },
    ],
  },
  {
    type: 'typing',
    background: 'typing-levels/typing-level-map/background.png',
    title: { text: 'TYPING JOURNEY', fontSize: 150 },
    helpAsset: 'tutorial-popups/typing-tutorial.png',
    backdropColor: 0x7d5600,
    levels: [
      {
        id: 5,
        title: 'KASHGAR BAZAAR',
        mascot: 'camel',
        unlocked: true,
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingMarketScreen,
        background: 'typing-levels/typing-level/background-kashgar.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
        splashColorScheme: {
          BUTTON_FILL: 0x7e5433,
          BUTTON_TEXT_FILL: 0xfbf0de,
          LEVEL_FONT_FILL: 0x6b411e,
          LEVEL_TITLE_FILL: 0xfbf0de,
        },
        mascotOnSplash: false,
      },
      {
        id: 6,
        title: 'TAKLAMAKAN SANDSTORM',
        mascot: 'camel',
        unlocked: false,
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingSandstormScreen,
        background: 'typing-levels/typing-level/background-sandstorm.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
        mascotOnSplash: true,
      },
      {
        id: 7,
        unlocked: false,
        title: 'TANGRI TAH',
        mascot: 'goat',
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingWordScreen,
        background: 'typing-levels/typing-level/background-tangri-tah.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x8ec24d,
        mascotOnSplash: true,
      },
      {
        id: 8,
        unlocked: false,
        title: 'FARMERS HARVEST',
        mascot: 'camel',
        miniMapImage: 'typing-levels/typing-level-map/button-preview.svg',
        screen: TypingInstrumentScreen,
        background: 'typing-levels/typing-level/background-taklamakan.png',
        helpAsset: 'tutorial-popups/typing-tutorial.png',
        backdropColor: 0x7d5600,
        mascotOnSplash: true,
      },
    ],
  },
];

export function getMapCollection(mapUnit: TMapUnit): TMapUnit[] {
  return mapUnit.type === 'education' ? educationMaps : typingMaps;
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
  const allMaps = [...educationMaps, ...typingMaps];
  const mapUnit = allMaps.find((map) => map.levels.includes(level));
  if (!mapUnit) {
    throw new Error(`No map unit found for level ${level.id}`);
  }
  return mapUnit;
}

export function getLevelType(level: TLevel): 'typing' | 'education' {
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
