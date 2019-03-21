import ICanvasContext from '../Common/ICanvasContext';
import IDocumentPos from '../Common/IDocumentPos';
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

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    this.frame.draw(ctx, this.x, this.y - scrollTop);
  }
}
