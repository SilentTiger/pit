import Fragment from '../DocStructure/Fragment';
export default interface IEngine {
  // toJSON(): string;
  // readFromJSON(json: string): void;
  // toHtml(): string;
  // readFromHtml(html: string): void;
  toChanges(): string;
  readFromChanges(changes: any[]): void;
  // applyChanges(changes: string): void;

  getSelection(): {index: number, length: number};
  setSelection(index: number, length: number): void;

  insertContent(index: number, frag: Fragment): void;
  deleteContent(index: number, length: number): void;
  formatContent(index: number, length: number, attrs: any): void;

  getLength(): number;
  getPosition(index: number, length: number): {t: number; r: number; b: number; l: number};
  getFormat(index: number, length: number): any[];
  removeFormat(index: number, length: number): void;

  focus(): void;
  blur(): void;

  setWidth(width: number): void;
  setHeight(height: number): void;

  scrollToY(yPos: number): number;
  scrollToX(xPos: number): number;
  scrollIntoView(index: number, length: number): void;
}
