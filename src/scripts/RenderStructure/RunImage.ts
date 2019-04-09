import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";

export default class RunImage extends Run {
  public solidHeight = true;
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(x, y);
    this.frag = frag;
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.frag.img.complete) {
      ctx.drawImage(this.frag.img, this.x + x, this.y + y, this.frag.attributes.width, this.frag.attributes.height);
    } else {
      this.frag.img.onload = () => {
        ctx.drawImage(this.frag.img, this.x + x, this.y + y, this.frag.attributes.width, this.frag.attributes.height);
      };
    }
  }
  public calHeight(): number {
    return this.frag.attributes.height;
  }
  public calWidth(): number {
    return this.frag.attributes.width;
  }

  public getDocumentPos(x: number, y: number, tryHead?: boolean): number {
    if (x < this.width / 2) {
      return tryHead ? 0 : -1;
    } else {
      return 1;
    }
  }
}
