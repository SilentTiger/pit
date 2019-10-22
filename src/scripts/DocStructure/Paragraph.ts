import Op from 'quill-delta/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import Block from './Block'
import LayoutFrame from './LayoutFrame'

export default class Paragraph extends Block {
  constructor(frames: LayoutFrame[], maxWidth: number) {
    super(maxWidth)
    if (frames.length !== 1) {
      console.error('frames.length should not be ', frames.length)
    }
    this.add(frames[0])
    this.maxWidth = maxWidth
    this.head!.setMaxWidth(this.maxWidth)
    this.length = frames[0].length
  }

  /**
   * 对当前段落排版
   */
  public layout() {
    if (this.needLayout) {
      this.head!.layout()

      this.head!.x = 0
      this.head!.y = 0
      this.head!.start = 0
      this.needLayout = false

      this.setSize({ height: this.head!.height, width: this.head!.width })
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  /**
   * 获取指定 x y 坐标所指向的文档位置
   */
  public getDocumentPos(x: number, y: number): number {
    return this.head!.getDocumentPos(x - this.x, y - this.y)
  }

  /**
   * 计算指定范围在当前段落的矩形区域
   */
  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const offset = index - this.start
    const blockLength = offset < 0 ? length + offset : length
    const rects = this.head!.getSelectionRectangles(Math.max(offset, 0), blockLength)
    for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
      const rect = rects[rectIndex]
      rect.y += this.y
      rect.x += this.x
    }
    return rects
  }

  /**
   * 删除指定范围的内容
   */
  public delete(index: number, length: number): void {
    this.head!.delete(index, length)
    this.length = this.head!.length
    this.needLayout = true
  }

  public toOp(): Op[] {
    return this.head!.toOp()
  }
  public toHtml(): string {
    return `<p>${this.head!.toHtml()}</p>`
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number): Paragraph {
    this.needLayout = true
    const newFrames = super.splitByEnter(index)
    return new Paragraph(newFrames, this.maxWidth)
  }

  /**
   * 创建一个各种属性都与当前实例相同的 paragraph
   * 但不包含当前 paragraph 的数据
   */
  public copy(): Paragraph {
    return new Paragraph([], this.maxWidth)
  }

  /**
   * 渲染当前段落
   * @param viewHeight 整个画布的高度
   */
  protected render(ctx: ICanvasContext, scrollTop: number, viewHeight: number): void {
    this.head!.draw(ctx, this.x, this.y - scrollTop, viewHeight)
  }
}
