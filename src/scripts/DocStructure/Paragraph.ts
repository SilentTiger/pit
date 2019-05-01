import Delta from 'quill-delta';
import ICanvasContext from '../Common/ICanvasContext';
import IRectangle from '../Common/IRectangle';
import { guid } from '../Common/util';
import Block from './Block';
import LayoutFrame from './LayoutFrame';

export default class Paragraph extends Block {
  public readonly id: string = guid();
  private maxWidth: number;

  constructor(frame: LayoutFrame, maxWidth: number) {
    super();
    this.add(frame);
    this.maxWidth = maxWidth;
    this.head!.setMaxWidth(this.maxWidth);
    this.length = frame.length;
  }

  public layout() {
    if (this.needLayout) {
      this.head!.layout();
      this.needLayout = false;
      const heightChange = this.head!.height !== this.height ? { height: this.head!.height } : null;
      const widthChange = this.head!.width !== this.width ? { width: this.head!.width } : null;
      if (heightChange !== null || widthChange !== null) {
        this.setSize({ ...heightChange, ...widthChange });
        if (heightChange !== null && this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  public getDocumentPos(x: number, y: number): number {
    return this.head!.getDocumentPos(x - this.x, y - this.y);
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const offset  = index - this.start;
    const blockLength = offset < 0 ? length + offset : length;
    const rects = this.head!.getSelectionRectangles(Math.max(offset, 0), blockLength);
    for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
      const rect = rects[rectIndex];
      rect.y += this.y;
      rect.x += this.x;
    }
    return rects;
  }

  public delete(index: number, length: number): void {
    this.head!.delete(index, length);
    this.needLayout = true;
  }

  public toDelta(): Delta {
    return this.head!.toDelta();
  }
  public toHtml(): string {
    return `<p>${this.head!.toHtml()}</p>`;
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    this.head!.draw(ctx, this.x, this.y - scrollTop);
  }
}
