import ICanvasContext from '../Common/ICanvasContext';
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
      if (this.frame.height !== this.height) {
        this.setSize({height: this.frame.height});
        if (this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    this.frame.draw(ctx, this.x, this.y - scrollTop);
  }
}
