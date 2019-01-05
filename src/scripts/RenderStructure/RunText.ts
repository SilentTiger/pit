import { createTextFontString } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  constructor(frag: FragmentText, x: number, y: number) {
    super(frag, x, y);
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillText(this.frag.content, this.x, this.y);
    ctx.restore();
  }
}
