import { Container } from 'pixi.js';

export class LetterPopup extends Container {
  /**
   *
   */
  private letter: string;
  constructor(letter: string) {
    super();
    this.letter = letter;
    console.log(this.letter);
  }
}
