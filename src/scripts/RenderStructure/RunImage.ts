import ICanvasContext from '../Common/ICanvasContext';
import FragmentImage from '../DocStructure/FragmentImage';
import Run from './Run';

export default class RunImage extends Run {
  public solidHeight = true;
  public frag: FragmentImage;
  constructor(frag: FragmentImage, x: number, y: number) {
    super(x, y);
    this.frag = frag;
  }

  /**
   * 绘制当前图片
   */
  public draw(ctx: ICanvasContext, x: number, y: number): void {
    if (this.frag.img.src) {
      ctx.drawImage(this.frag.img, this.x + x, this.y + y, this.frag.attributes.width, this.frag.attributes.height);
    } else {
      this.frag.setImage();
      this.frag.img.onload = () => {
        ctx.drawImage(this.frag.img, this.x + x, this.y + y, this.frag.attributes.width, this.frag.attributes.height);
      };
    }
  }

  /**
   * 计算高度
   */
  public calHeight(): number {
    return this.frag.attributes.height;
  }

  /**
   * 计算宽度
   */
  public calWidth(): number {
    return this.frag.attributes.width;
  }

  /**
   * 获取坐标在文档中的位置
   */
  public getDocumentPos(x: number, y: number, tryHead?: boolean): number {
    if (x < this.width / 2) {
      return tryHead ? 0 : -1;
    } else {
      return 1;
    }
  }
}
