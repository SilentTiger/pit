import { createTextFontString } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import { FragmentTextDefaultAttributes } from '../DocStructure/FragmentTextAttributes';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  constructor(frag: FragmentText, x: number, y: number) {
    super(frag, x, y);
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.textBaseline = 'top';
    // 绘制背景色
    if (this.frag.attributes.background !== FragmentTextDefaultAttributes.background) {
      ctx.fillStyle = this.frag.attributes.background;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = this.frag.attributes.color;
    ctx.fillText(this.frag.content, this.x, this.y);
    // 绘制下划线
    if (this.frag.attributes.underline) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.y + this.height / 2;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    // 绘制删除线
    if (this.frag.attributes.strike) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.y + this.height;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }
}
