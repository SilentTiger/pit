import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";

export default class RunImage extends Run {
  public solidHeight = true;
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(frag, x, y);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.frag.img.complete) {
      ctx.drawImage(this.frag.img, this.x, this.y);
    } else {
      this.frag.img.onload = () => {
        ctx.drawImage(this.frag.img, this.x, this.y);
      };
    }
  }
  public calHeight(): number {
    return this.frag.attributes.oriHeight;
  }
  public calWidth(): number {
    return this.frag.attributes.oriWidth;
  }
}
