import { WORD_SEARCH_GRID_SIZE } from '@utg/level-types';

const GRID_SIDE_DIM = WORD_SEARCH_GRID_SIZE;

function createGrid(dim: number, makeCell: () => GridCell): GridCell[][] {
  return Array.from({ length: dim }, () => Array.from({ length: dim }, makeCell));
}

type WORD_ORIENTATION = 'horizontal' | 'vertical' | 'diagonal';

/** Reading direction of the script: rtl (Arabic) writes words leftward, ltr rightward. */
export type GridDirection = 'rtl' | 'ltr';

export type MatrixOptions = {
  count?: number; // words to place; the rest of the pool is a top-up reserve
  direction?: GridDirection;
};

export type GridCell = {
  value: string;
  isFiller: boolean;
};

export type PlacedWord = {
  word: string;
  cells: [number, number][]; // [r, c] per letter, in word order
};

type Placement = {
  r: number;
  c: number;
  orientation: WORD_ORIENTATION;
};

const ORIENTATIONS: WORD_ORIENTATION[] = ['horizontal', 'vertical', 'diagonal'];

export class Matrix {
  private candidates: string[]; // unique, fitting words in random order
  private count: number;
  private step: Record<WORD_ORIENTATION, [number, number]>; // unit (dr, dc) per orientation
  private allPlacements: Placement[]; // every start × orientation, built once
  public unplaced: string[] = []; // words that found no legal spot
  public placed: PlacedWord[] = []; // words that were written, with their cells

  public matrix: GridCell[][];

  constructor(words: string[], { count = Infinity, direction = 'rtl' }: MatrixOptions = {}) {
    this.candidates = this.shuffle(
      [...new Set(words)].filter((word) => word.length > 0 && word.length <= GRID_SIDE_DIM),
    );
    this.count = count;
    // horizontal and diagonal follow the reading direction; diagonal always goes down
    const dc = direction === 'rtl' ? -1 : 1;
    this.step = {
      horizontal: [0, dc],
      vertical: [1, 0],
      diagonal: [1, dc],
    };
    this.matrix = createGrid(GRID_SIDE_DIM, () => ({ value: '', isFiller: true }));
    this.allPlacements = this.buildAllPlacements();
  }

  populateGrid() {
    const chosen = this.candidates.slice(0, this.count).sort((a, b) => b.length - a.length); // longest first: hardest to place goes early
    const reserve = this.candidates.slice(this.count);

    chosen.forEach((word) => {
      if (!this.placeWord(word)) this.unplaced.push(word);
    });
    // top up from the reserve so words that didn't fit don't leave the grid sparse
    for (const word of reserve) {
      if (this.placed.length >= this.count) break;
      if (!this.placeWord(word)) this.unplaced.push(word);
    }
    this.populateFillers();
  }

  // MUTATES this.matrix. Returns false if no legal placement exists.
  placeWord(word: string): boolean {
    this.shuffle(this.allPlacements); // re-randomize order in place
    for (const p of this.allPlacements) {
      if (this.canPlace(word, p)) {
        this.write(word, p);
        return true;
      }
    }
    return false;
  }

  // path stays in bounds AND every cell is empty-or-matching (crossings allowed)
  private canPlace(word: string, p: Placement): boolean {
    const [dr, dc] = this.step[p.orientation];
    for (let i = 0; i < word.length; i++) {
      const r = p.r + dr * i;
      const c = p.c + dc * i;
      if (r < 0 || r >= GRID_SIDE_DIM || c < 0 || c >= GRID_SIDE_DIM) return false;
      const cell = this.matrix[r][c];
      if (!cell.isFiller && cell.value !== word[i]) return false; // conflicting letter
    }
    return true;
  }

  private write(word: string, p: Placement): void {
    const [dr, dc] = this.step[p.orientation];
    const cells: [number, number][] = [];
    for (let i = 0; i < word.length; i++) {
      const r = p.r + dr * i;
      const c = p.c + dc * i;
      this.matrix[r][c] = { value: word[i], isFiller: false };
      cells.push([r, c]);
    }
    this.placed.push({ word, cells });
  }

  private buildAllPlacements(): Placement[] {
    const out: Placement[] = [];
    for (let r = 0; r < GRID_SIDE_DIM; r++)
      for (let c = 0; c < GRID_SIDE_DIM; c++)
        for (const orientation of ORIENTATIONS) out.push({ r, c, orientation });
    return out;
  }

  // fillers drawn from the letters that appear in the placed words (script-agnostic)
  private populateFillers(): void {
    const pool = [
      ...new Set(
        this.placed
          .map((p) => p.word)
          .join('')
          .split(''),
      ),
    ];
    if (pool.length === 0) return;
    for (let r = 0; r < GRID_SIDE_DIM; r++) {
      for (let c = 0; c < GRID_SIDE_DIM; c++) {
        const cell = this.matrix[r][c];
        if (cell.isFiller) {
          cell.value = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    // Fisher–Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
