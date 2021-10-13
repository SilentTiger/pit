import type ICanvasContext from '../Common/ICanvasContext'
import type FragmentImage from '../Fragment/FragmentImage'
import Run from './Run'
import type { DocPos } from '../Common/DocPos'

import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'

@IBubbleUpableDecorator
export default class RunImage extends Run {
  public static override readonly typeName: string = 'run-image'

  public override solidHeight = true
  public frag: FragmentImage
  constructor(frag: FragmentImage) {
    super()
    this.frag = frag
  }

  /**
   * 绘制当前图片
   */
  public draw(ctx: ICanvasContext, x: number, y: number): void {
    console.log('draw image')

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

  // #region IBubbleUpable methods
  public bubbleUp(type: string, data: any, stack?: any[]): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  // #endregion
}
