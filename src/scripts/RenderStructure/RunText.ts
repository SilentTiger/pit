import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import { FragmentTextDefaultAttributes } from '../DocStructure/FragmentTextAttributes';
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
    ctx.textBaseline = 'bottom';
    // 绘制背景色
    if (this.frag.attributes.background !== FragmentTextDefaultAttributes.background) {
      ctx.fillStyle = this.frag.attributes.background;
      ctx.fillRect(this.x, this.parent.y + this.parent.height - this.height, this.width, this.height);
    }
    // 绘制文本内容
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = this.frag.attributes.color;
    ctx.fillText(this.content, this.x, this.parent.y + this.parent.height);
    // 绘制下划线
    if (this.frag.attributes.underline) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.parent.y + this.parent.height + 1;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    // 绘制删除线
    if (this.frag.attributes.strike) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.parent.y + this.parent.height - this.height / 2;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  public calWidth(): number {
    return measureTextWidth(this.content, this.frag.attributes);
  }
}
