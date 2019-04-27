import Delta from 'quill-delta';
import ICanvasContext from '../Common/ICanvasContext';
import IRectangle from '../Common/IRectangle';
import { guid } from '../Common/util';
import Block from './Block';
import Document from './Document';
import FragmentParaEnd from './FragmentParaEnd';
import LayoutFrame from './LayoutFrame';

export default class Paragraph extends Block {
  public readonly id: string = guid();
  public frame: LayoutFrame;
  private maxWidth: number;

  constructor(frame: LayoutFrame, maxWidth: number) {
    super();
    this.frame = frame;
    this.maxWidth = maxWidth;
    this.frame.setMaxWidth(this.maxWidth);
    this.length = frame.length;
  }

  public layout() {
    if (this.needLayout) {
      this.frame.layout();
      this.needLayout = false;
      const heightChange = this.frame.height !== this.height ? { height: this.frame.height } : null;
      const widthChange = this.frame.width !== this.width ? { width: this.frame.width } : null;
      if (heightChange !== null || widthChange !== null) {
        this.setSize({ ...heightChange, ...widthChange });
        if (heightChange !== null && this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  public getDocumentPos(x: number, y: number): number {
    return this.frame.getDocumentPos(x - this.x, y - this.y);
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const offset  = index - this.start;
    const blockLength = offset < 0 ? length + offset : length;
    const rects = this.frame.getSelectionRectangles(Math.max(offset, 0), blockLength);
    for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
      const rect = rects[rectIndex];
      rect.y += this.y;
      rect.x += this.x;
    }
    return rects;
  }

  public delete(index: number, length: number): void {
    throw new Error("Method not implemented.");
  }

  public toDelta(): Delta {
    return this.frame.toDelta();
  }
  public toHtml(): string {
    return `<p>${this.frame.toHtml()}</p>`;
  }

  public devotion(): LayoutFrame | null {
    if (this.frame.tail instanceof FragmentParaEnd) {
      const res = this.frame;
      (this.parent as Document).remove(this);
      return res;
    } else {
      return null;
    }
  }

  public eat(frame: LayoutFrame) {

  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    this.frame.draw(ctx, this.x, this.y - scrollTop);
  }
}
