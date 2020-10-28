import ICanvasContext from '../Common/ICanvasContext'
import FragmentImage from '../DocStructure/FragmentImage'
import Run from './Run'
import { DocPos } from '../Common/DocPos'

export default class RunImage extends Run {
  public solidHeight = true;
  public frag: FragmentImage
  constructor(frag: FragmentImage, x: number, y: number) {
    super(x, y)
    this.frag = frag
  }

  /**
   * 绘制当前图片
   */
  public draw(ctx: ICanvasContext, x: number, y: number): void {
    if (this.frag.loaded && this.frag.img) {
      ctx.drawImage(this.frag.img, this.x + x, this.y + y, this.frag.attributes.width, this.frag.attributes.height)
    } else if (!this.frag.fail) {
      this.frag.loadImage()
    }
  }

  /**
   * 计算高度
   */
  public calHeight(): number {
    this.height = this.frag.attributes.height
    return this.height
  }

  /**
   * 计算宽度
   */
  public calWidth(): number {
    this.width = this.frag.attributes.width
    return this.width
  }

  /**
   * 获取坐标在文档中的位置
   */
  public getDocumentPos(x: number, y: number, start: boolean): DocPos {
    if (x < this.width / 2) {
      return { index: 0, inner: null }
    } else {
      return { index: 1, inner: null }
    }
  }
}
