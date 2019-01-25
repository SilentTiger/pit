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
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // 绘制文本内容
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = this.frag.attributes.color;
    ctx.fillText(this.content, this.x, this.parent.y + this.parent.baseline);
    ctx.restore();
  }
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  public calWidth(): number {
    return measureTextWidth(this.content, this.frag.attributes);
  }
}
