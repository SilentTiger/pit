import FragmentText from '../DocStructure/FragmentText';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  constructor(frag: FragmentText, x: number, y: number) {
    super(frag, x, y);
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    console.log('draw text ', this.frag.content);
  }
}
