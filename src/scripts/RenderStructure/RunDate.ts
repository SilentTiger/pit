import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentDate from '../DocStructure/FragmentDate';
import Run from "./Run";

export default class RunDate extends Run {
  public frag: FragmentDate;
  public content: string;
  public isSpace: boolean = false;
  constructor(frag: FragmentDate, x: number, y: number, textContent: string = frag.stringContent) {
    super(frag, x, y);
    this.content = textContent;
    this.height = this.calHeight();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 绘制文本内容
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = '#70b1e7';
    ctx.fillText(this.content, this.x, this.y);

    if ((window as any).runBorder) {
      ctx.strokeStyle = 'green';
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  public calWidth(): number {
    return measureTextWidth(this.content, this.frag.attributes);
  }
}
