import { EducationLevelScreen } from '../education-level/level-1';
import { EducationBubbleScreen } from '../education-level/level-2';
import { EducationSheepScreen } from '../education-level/level-3';
import { EducationImageScreen } from '../education-level/level-4';
import { EducationWordScreen } from '../education-level/level-5';
import { EducationSheepJumpScreen } from '../education-level/level-6';
import { TypingLevelScreen } from '../typing-level/level-1';
import { TypingSandstormScreen } from '../typing-level/level-2';
import type { TLevel } from './level-button';

export type TMapUnit = {
  type: 'typing' | 'education';
  background: string;
  title: { text: string; fontSize: number };
  helpAsset?: string;
  backdropColor?: number;
  levels: TLevel[];
  nextMap?: TMapUnit;
  prevMap?: TMapUnit;
};

const educationMap1: TMapUnit = {
  type: 'education',
  background: 'education-level-map/background.png',
  title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
  levels: [
    {
      id: 1,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationLevelScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-1.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 2,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationBubbleScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-2.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 3,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationSheepScreen,
      background: 'education-level/background.png',
      // TODO: missing tutorial asset
      helpAsset: 'tutorial-popups/education-tutorial.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 4,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationImageScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-4.png',
      backdropColor: 0x4a90e2,
    },
  ],
};

const educationMap2: TMapUnit = {
  type: 'education',
  background: 'education-level-map/background.png',
  title: { text: 'LEARN THE UYGHUR ALPHABET', fontSize: 100 },
  levels: [
    {
      id: 5,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationWordScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-5.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 6,
      unlocked: true,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationSheepJumpScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-6.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 7,
      unlocked: false,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationSheepScreen,
      background: 'education-level/background.png',
      // TODO: missing tutorial asset
      helpAsset: 'tutorial-popups/education-tutorial.png',
      backdropColor: 0x4a90e2,
    },
    {
      id: 8,
      unlocked: false,
      miniMapImage: 'education-level-map/button-preview.svg',
      screen: EducationImageScreen,
      background: 'education-level/background.png',
      helpAsset: 'tutorial-popups/education-level-4.png',
      backdropColor: 0x4a90e2,
    },
  ],
};

const typingMap1: TMapUnit = {
  type: 'typing',
  background: 'typing-level-map/background.png',
  title: { text: 'TYPING JOURNEY', fontSize: 150 },
  helpAsset: 'tutorial-popups/typing-tutorial.png',
  backdropColor: 0x7d5600,
  levels: [
    {
      id: 1,
      title: 'TAKLAMAKAN DESERT',
      unlocked: true,
      miniMapImage: 'typing-level-map/button-preview.svg',
      screen: TypingLevelScreen,
      background: 'typing-level/background.png',
      helpAsset: 'tutorial-popups/typing-tutorial.png',
      backdropColor: 0x7d5600,
    },
    {
      id: 2,
      title: 'TAKLAMAKAN SANDSTORM',
      unlocked: true,
      miniMapImage: 'typing-level-map/button-preview.svg',
      screen: TypingSandstormScreen,
      background: 'typing-level/background.png',
      helpAsset: 'tutorial-popups/typing-tutorial.png',
      backdropColor: 0x7d5600,
    },
    {
      id: 3,
      unlocked: false,
      miniMapImage: 'typing-level-map/button-preview.svg',
      background: 'typing-level/background.png',
      helpAsset: 'tutorial-popups/typing-tutorial.png',
      backdropColor: 0x7d5600,
    },
    {
      id: 4,
      unlocked: false,
      miniMapImage: 'typing-level-map/button-preview.svg',
      background: 'typing-level/background.png',
      helpAsset: 'tutorial-popups/typing-tutorial.png',
      backdropColor: 0x7d5600,
    },
  ],
};

educationMap1.nextMap = educationMap2;
educationMap2.prevMap = educationMap1;

export const mapUnitStore: Record<string, TMapUnit> = {
  'education-map-1': educationMap1,
  'education-map-2': educationMap2,
  'typing-map-1': typingMap1,
};
