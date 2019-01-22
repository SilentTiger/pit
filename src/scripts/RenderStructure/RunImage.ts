import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";

export default class RunImage extends Run {
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(frag, x, y);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // TODO 绘制图片
  }
  public calHeight(): number {
    return this.frag.attributes.oriHeight;
  }
  public calWidth(): number {
    return this.frag.attributes.oriWidth;
  }
}
