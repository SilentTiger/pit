import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";
import IDocumentPos from '../Common/IDocumentPos';

export default class RunImage extends Run {
  public solidHeight = true;
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(frag, x, y);
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

  public getDocumentPos(x: number, y: number, tryHead?: boolean): Partial<IDocumentPos> {
    if (x < this.width / 2) {
      return tryHead ? {
        index: 0,
        color: '#000000',
        textHeight: this.height,
        PosX: 0,
        PosYText: 0,
      } : null;
    } else {
      return {
        index: 1,
        color: '#000000',
        textHeight: this.height,
        PosX: this.width,
        PosYText: 0,
      };
    }
  }
}
