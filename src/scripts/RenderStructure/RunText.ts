import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  public content: string;
  public isSpace: boolean = false;
  constructor(frag: FragmentText, x: number, y: number, textContent: string = frag.content) {
    super(frag, x, y);
    this.content = textContent;
    this.height = this.calHeight();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 绘制文本内容
    if (this.prevSibling === null || this.prevSibling.frag !== this.frag) {
      ctx.font = createTextFontString(this.frag.attributes);
      if (this.frag.attributes.link.length === 0) {
        ctx.fillStyle = this.frag.attributes.color;
      } else {
        ctx.fillStyle = '#70b1e7';
      }
    }
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
