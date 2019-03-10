import ICanvasContext from '../Common/ICanvasContext';
import { guid } from '../Common/util';
import Block from './Block';
import Fragment from "./Fragment";
import LayoutFrame from './LayoutFrame';

export default class Paragraph extends Block {
  public readonly id: string = guid();
  private frame: LayoutFrame;
  private maxWidth: number;

  constructor(frame: LayoutFrame, maxWidth: number) {
    super();
    this.frame = frame;
    this.maxWidth = maxWidth;
  }

  public layout(): boolean {
    return this.frame.layout();
  }
  protected render(ctx: ICanvasContext): void {
    this.frame.draw(ctx);
  }
}
