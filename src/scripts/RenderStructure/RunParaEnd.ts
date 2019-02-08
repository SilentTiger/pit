import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentParaEnd from '../DocStructure/FragmentParaEnd';
import Run from "./Run";

export default class RunParaEnd extends Run {
  public frag: FragmentParaEnd;
  public isSpace: boolean = false;
  constructor(frag: FragmentParaEnd, x: number, y: number) {
    super(frag, x, y);
    this.height = this.calHeight();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // para end 不需要绘制内容
  }
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  public calWidth(): number {
    return 0;
  }
}
