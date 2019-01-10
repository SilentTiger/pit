import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";

export default class RunImage extends Run {
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(frag, x, y);
    this.setSize();
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    console.log('draw image ', this.frag.content);
  }

  public separate = (): RunImage[] => {
    return [this];
  }
}
