import { animate } from 'motion';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreen } from '../../../engine/navigation/navigation';
import { DrawingCanvas, type Stroke } from '../../ui/drawing-canvas';

const STORAGE_KEY = 'prototype/drawing-canvas/strokes';
const PADDING = 40;
const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 72;
const BUTTON_GAP = 24;

type ToolButton = {
  button: Graphics;
  label: Text;
};

function loadStoredStrokes(): Stroke[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stroke[]) : [];
  } catch {
    return [];
  }
}

function storeStrokes(strokes: Stroke[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strokes));
  } catch {
    return;
  }
}

function formatStrokes(strokes: Stroke[]): string {
  if (strokes.length === 0) return 'No strokes';

  return strokes
    .map((stroke, index) => {
      const points = stroke.points.map((point) => `(${point.x},${point.y})`).join(' ');
      return `#${index} color=#${stroke.color.toString(16).padStart(6, '0')} size=${stroke.size}\n  ${points}`;
    })
    .join('\n');
}

function makeButton(text: string, onPress: () => void): ToolButton {
  const button = new Graphics()
    .roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_HEIGHT / 2)
    .fill({ color: 0xffffff })
    .stroke({ width: 2, color: 0xd0d5dd });
  button.eventMode = 'static';
  button.cursor = 'pointer';

  const label = new Text({
    text,
    style: {
      fill: 0x1c1c1c,
      fontFamily: 'Arial',
      fontSize: 28,
      fontWeight: 'bold',
    },
  });
  label.anchor.set(0.5);
  label.position.set(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2);
  button.addChild(label);

  button.on('pointerdown', () => {
    button.alpha = 0.7;
  });
  const restore = () => {
    button.alpha = 1;
  };
  button.on('pointerup', restore);
  button.on('pointerupoutside', restore);
  button.on('pointertap', onPress);

  return { button, label };
}

export class DrawingScreen extends Container implements AppScreen {
  private drawingCanvas: DrawingCanvas;
  private undoButton: ToolButton;
  private clearButton: ToolButton;
  private title: Text;
  private strokeData: Text;

  constructor() {
    super();

    this.title = new Text({
      text: 'Drawing prototype',
      style: {
        fill: 0xffffff,
        fontFamily: 'Arial',
        fontSize: 40,
        fontWeight: 'bold',
      },
    });

    this.strokeData = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 14,
        fill: 0xdddddd,
        wordWrap: true,
        breakWords: true,
      }),
    });

    this.drawingCanvas = new DrawingCanvas({
      width: 720,
      height: 520,
      onChange: (strokes) => {
        storeStrokes(strokes);
        this.strokeData.text = formatStrokes(strokes);
      },
    });
    this.drawingCanvas.loadStrokes(loadStoredStrokes());

    this.undoButton = makeButton('Undo', () => {
      this.drawingCanvas.undo();
      this.refreshButtons();
    });
    this.clearButton = makeButton('Clear', () => {
      this.drawingCanvas.clear();
      this.refreshButtons();
    });

    this.addChild(
      this.title,
      this.drawingCanvas,
      this.undoButton.button,
      this.clearButton.button,
      this.strokeData,
    );
    this.refreshButtons();
  }

  private refreshButtons() {
    const alpha = this.drawingCanvas.isEmpty ? 0.4 : 1;
    this.undoButton.button.alpha = alpha;
    this.clearButton.button.alpha = this.drawingCanvas.isEmpty ? 0.4 : 1;
  }

  public resize(width: number, height: number) {
    const canvasWidth = Math.min(720, width - PADDING * 2);
    const canvasHeight = Math.min(520, height - PADDING * 2 - 120);
    this.drawingCanvas.resize(Math.max(120, canvasWidth), Math.max(120, canvasHeight));
    this.drawingCanvas.position.set((width - this.drawingCanvas.width) / 2, 120);

    this.title.position.set((width - this.title.width) / 2, 40);

    const buttonRowY = this.drawingCanvas.y + this.drawingCanvas.height + 32;
    const totalWidth = BUTTON_WIDTH * 2 + BUTTON_GAP;
    this.undoButton.button.position.set((width - totalWidth) / 2, buttonRowY);
    this.clearButton.button.position.set(
      (width - totalWidth) / 2 + BUTTON_WIDTH + BUTTON_GAP,
      buttonRowY,
    );

    this.strokeData.style.wordWrapWidth = width - PADDING * 2;
    this.strokeData.position.set(PADDING, buttonRowY + BUTTON_HEIGHT + 24);
  }

  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');
    this.alpha = 0;
    await animate([[this, { alpha: 1 }, { duration: 0.3, ease: 'easeOut' }]]).finished;
  }

  public async hide() {
    await animate([[this, { alpha: 0 }, { duration: 0.2, ease: 'easeOut' }]]).finished;
  }
}
