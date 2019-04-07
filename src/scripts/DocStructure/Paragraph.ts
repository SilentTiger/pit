import ICanvasContext from '../Common/ICanvasContext';
import IDocumentPos from '../Common/IDocumentPos';
import IRectangle from '../Common/IRectangle';
import { guid } from '../Common/util';
import Block from './Block';
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
        if (widthChange !== null && this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  public getDocumentPos(x: number, y: number): IDocumentPos {
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

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    this.frame.draw(ctx, this.x, this.y - scrollTop);
  }
}
