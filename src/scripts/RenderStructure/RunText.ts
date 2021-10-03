import type ICanvasContext from '../Common/ICanvasContext'
import type FragmentText from '../Fragment/FragmentText'
import Run from './Run'
import { EnumCursorType } from '../Common/EnumCursorType'
import type { DocPos } from '../Common/DocPos'
import { getPlatform } from '../Platform'

import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'

@IBubbleUpableDecorator
export default class RunText extends Run {
  public frag: FragmentText
  public content: string
  constructor(frag: FragmentText, x: number, y: number, textContent?: string) {
    super(x, y)
    this.frag = frag

    const content = textContent ?? frag.content
    this.content = content
    this.length = content.length
    this.height = this.calHeight()
    this.isSpace = this.content === ' '
  }

  /**
   * 绘制当前 RunText
   */
  public draw(ctx: ICanvasContext, x: number, y: number, baseline: number): void {
    // 绘制文本内容
    if (this.prevSibling === null || this.prevSibling.frag !== this.frag) {
      ctx.font = getPlatform().createTextFontString(this.frag.attributes)
      if (this.frag.attributes.link.length === 0) {
        ctx.fillStyle = this.frag.attributes.color
      } else {
        ctx.fillStyle = '#70b1e7'
      }
    }

    ctx.fillText(this.content, this.x + x, baseline + y)

    if ((window as any).runBorder) {
      ctx.strokeStyle = 'green'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
    }
  }
  public calHeight(): number {
    this.height = this.frag.metrics.bottom
    return this.height
  }
  public calWidth(): number {
    this.width = getPlatform().measureTextWidth(this.content, this.frag.attributes)
    return this.width
  }

  public getDocumentPos(x: number, y: number, start: boolean): DocPos {
    // 按说 run 的 length 不会是 0，所以这里就先不管 length === 0 的场景了
    if (this.length === 1) {
      if (x < this.width / 2) {
        return { index: 0, inner: null }
      } else {
        return { index: 1, inner: null }
      }
    } else if (this.length > 1) {
      const widthArray = [0]
      for (let l = 1; l <= this.content.length; l++) {
        const subContent = this.content.substr(0, l)
        const subContentWidth = getPlatform().measureTextWidth(subContent, this.frag.attributes)
        widthArray.push(subContentWidth)
        if (subContentWidth >= x) {
          const currentWidth = subContentWidth - widthArray[l - 1]
          if (x - widthArray[l - 1] < currentWidth / 2) {
            if (l === 1) {
              return { index: 0, inner: null }
            } else {
              return { index: l - 1, inner: null }
            }
          } else {
            return { index: l, inner: null }
          }
        }
      }
      return { index: this.content.length, inner: null }
    } else {
      return { index: 0, inner: null }
    }
  }

  public override getCoordinatePosX(index: number): number {
    if (index === 0) {
      return 0
    }
    return getPlatform().measureTextWidth(this.content.substr(0, index), this.frag.attributes)
  }

  public override getCursorType(): EnumCursorType {
    if (this.frag.attributes.link.length === 0) {
      return EnumCursorType.Text
    } else {
      return EnumCursorType.Pointer
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
