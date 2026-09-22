import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { waitFor } from '../../../../engine/utils/waitFor';
import { convertToCurrentScript, isCurrentScriptRtl } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { REMOTE_WORDS_BUNDLE, resolveWordsByIds } from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';
import { Matrix, type PlacedWord } from './grid';
import { SubmitButton } from './submit-button';
import { WordGridPanel } from './word-grid-panel';
import { WordListPanel } from './word-list-panel';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const PANEL_SHADOW = 16;
/** Word bar bottom → grid top; includes the bar's shadow. */
const PANEL_GAP = PANEL_SHADOW + 12;
/** Space between the grid's shadow and the submit button. */
const BUTTON_GAP = 16;
const BACKGROUND_COLOR = 0xf3e3c6;
/** Lets the last word's green pulse play out before the end popup. */
const END_DELAY_SECONDS = 0.6;

const cellKey = (r: number, c: number) => `${r},${c}`;

/** Level words in the player's script; multi-word entries can't sit in a grid. */
function playableWords(wordIds: number[]): string[] {
  return resolveWordsByIds(wordIds)
    .map((entry) => convertToCurrentScript(entry.word.trim(), { autoCapitalize: false }))
    .filter((word) => word.length > 0 && !/\s/.test(word));
}

export class GameWordSearchScreen extends Container {
  public readonly screenName = 'GameWordSearchScreen';
  public static assetBundles = ['ui', REMOTE_WORDS_BUNDLE];
  public static splashBackgroundAsset = 'game-levels/game-level-map/background.png';
  public static helpAssets: string[] = [];

  private readonly level: TLevel;
  private readonly background = new Sprite({ texture: Texture.WHITE, tint: BACKGROUND_COLOR });
  private readonly content = new Container();
  private readonly grid: WordGridPanel;
  private readonly wordList: WordListPanel;
  private readonly submitButton: SubmitButton;
  private readonly hud: HUD;

  private readonly placed: PlacedWord[];
  private readonly remaining: PlacedWord[];
  private resolving = false;
  private completed = false;

  constructor(level: TLevel) {
    super();
    const typedLevel = getTypedLevel(level, 'game-word-search');
    const mapUnit = findMapUnitForLevel(typedLevel);
    this.level = typedLevel;

    const matrix = new Matrix(playableWords(typedLevel.props.wordIds), {
      count: typedLevel.props.wordCount,
      direction: isCurrentScriptRtl() ? 'rtl' : 'ltr',
    });
    matrix.populateGrid();
    this.placed = matrix.placed;
    this.remaining = [...this.placed];

    this.grid = new WordGridPanel(matrix.matrix);
    this.wordList = new WordListPanel({ words: this.placed.map((placed) => placed.word) });
    this.submitButton = new SubmitButton(() => void this.handleSubmit());

    // word list, grid, then submit button stacked and centered; panel pivots sit at
    // their centers so show/hide scale from the middle
    const gridTop = this.wordList.panelHeight + PANEL_GAP;
    const buttonTop = gridTop + this.grid.panelHeight + PANEL_SHADOW + BUTTON_GAP;
    const totalHeight = buttonTop + SubmitButton.totalHeight;
    const top = (DESIGN_HEIGHT - totalHeight) / 2;
    const centerX = DESIGN_WIDTH / 2;
    this.wordList.pivot.set(this.wordList.panelWidth / 2, this.wordList.panelHeight / 2);
    this.wordList.position.set(centerX, top + this.wordList.panelHeight / 2);
    this.grid.pivot.set(this.grid.panelWidth / 2, this.grid.panelHeight / 2);
    this.grid.position.set(centerX, top + gridTop + this.grid.panelHeight / 2);
    this.submitButton.position.set(centerX, top + buttonTop + SubmitButton.totalHeight / 2);
    this.content.addChild(this.wordList, this.grid, this.submitButton);

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
    });

    this.addChild(this.background, this.content, this.hud);
  }

  public resize(width: number, height: number) {
    this.background.width = width;
    this.background.height = height;

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set(
      (width - DESIGN_WIDTH * scale) / 2,
      (height - DESIGN_HEIGHT * scale) / 2,
    );
    this.hud.layout = { width, height };
  }

  public async show() {
    // misconfigured pool (nothing fit): finish instead of leaving an unwinnable grid
    if (this.placed.length === 0) {
      this.endGame();
      return;
    }

    const panels = [this.wordList, this.grid, this.submitButton];
    panels.forEach((panel) => {
      panel.alpha = 0;
      panel.scale.set(0.65);
    });

    await Promise.all([
      ...panels.flatMap((panel) => [
        animate(panel, { alpha: 1 }, { duration: 0.55, ease: 'backOut' }),
        animate(panel.scale, { x: 1, y: 1 }, { duration: 0.55, ease: 'backOut' }),
      ]),
      this.grid.playAppear(),
    ]);
  }

  public async hide() {
    const panels = [this.wordList, this.grid, this.submitButton];
    await Promise.all(
      panels.flatMap((panel) => [
        animate(panel, { alpha: 0 }, { duration: 0.3, ease: 'backIn' }),
        animate(panel.scale, { x: 0.65, y: 0.65 }, { duration: 0.3, ease: 'backIn' }),
      ]),
    );
  }

  /** Correct only when the selected cells are exactly the cells of one unfound word. */
  private async handleSubmit() {
    if (this.resolving || this.completed) return;
    const tiles = [...this.grid.getSelected()];
    if (tiles.length === 0) return;

    this.resolving = true;
    this.grid.setLocked(true);

    const keys = new Set(tiles.map((tile) => cellKey(tile.row, tile.col)));
    const matches = this.remaining.filter(
      (placed) =>
        placed.cells.length === keys.size &&
        placed.cells.every(([r, c]) => keys.has(cellKey(r, c))),
    );

    if (matches.length === 1) {
      const [match] = matches;
      useSessionStore.getState().recordCorrect();
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      this.wordList.markFound(this.placed.indexOf(match));
      this.remaining.splice(this.remaining.indexOf(match), 1);
      await Promise.all(tiles.map((tile) => tile.showFound()));
    } else {
      useSessionStore.getState().recordMistake();
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      await Promise.all(tiles.map((tile) => tile.showIncorrect()));
    }

    this.grid.clearSelection();

    if (this.remaining.length === 0) {
      this.submitButton.enabled = false;
      await waitFor(END_DELAY_SECONDS);
      this.endGame();
      return;
    }

    this.grid.setLocked(false);
    this.resolving = false;
  }

  private endGame() {
    if (this.completed) return;
    this.completed = true;
    this.grid.setLocked(true);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }
}
