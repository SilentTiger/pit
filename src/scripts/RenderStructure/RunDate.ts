import type ICanvasContext from '../Common/ICanvasContext'
import type FragmentDate from '../DocStructure/FragmentDate'
import Run from './Run'
import type { DocPos } from '../Common/DocPos'
import { getPlatform } from '../Platform'

const dateColor = '#70b1e7'
export default class RunDate extends Run {
  public frag: FragmentDate
  public content: string
  constructor(frag: FragmentDate, x: number, y: number) {
    super(x, y)
    this.frag = frag
    this.content = frag.stringContent
    this.height = this.calHeight()
  }
  /**
   *  绘制 RunDate
   * @param ctx 绘图 api 接口
   */
  public draw(ctx: ICanvasContext, x: number, y: number): void {
    // 绘制文本内容
    ctx.font = getPlatform().createTextFontString(this.frag.attributes)
    ctx.fillStyle = dateColor
    ctx.fillText(this.content, this.x + x, this.parent === null ? this.frag.metrics.baseline : this.parent.baseline + y)

    if ((window as any).runBorder) {
      ctx.strokeStyle = 'green'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
    }
  }
  /**
   * 计算当前 RunDate 高度
   */
  public calHeight(): number {
    this.height = getPlatform().convertPt2Px[this.frag.attributes.size]
    return this.height
  }
  /**
   * 计算当前 RunDate 宽度
   */
  public calWidth(): number {
    this.width = getPlatform().measureTextWidth(this.content, this.frag.attributes)
    return this.width
  }

  public getDocumentPos(x: number, y: number, start: boolean): DocPos {
    if (x < this.width / 2) {
      return { index: 0, inner: null }
    } else {
      return { index: 1, inner: null }
    }
  }
}
