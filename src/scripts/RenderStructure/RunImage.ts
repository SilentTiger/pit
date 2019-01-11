import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";

export default class RunImage extends Run {
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(frag, x, y);
    this.setSize();
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    // TODO 绘制图片
  }

  public separate = (): RunImage[] => {
    return [this];
  }
}
