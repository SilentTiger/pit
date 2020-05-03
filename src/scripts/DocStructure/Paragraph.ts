import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import { DocPos } from '../Common/DocPos'

export default class Paragraph extends BlockCommon {
  public static readonly blockType: string = 'para'

  public readFromOps(Ops: Op[]): void {
    const frames = super.readOpsToLayoutFrame(Ops)
    if (frames.length !== 1) {
      console.error('frames.length should not be ', frames.length)
    }
    this.add(frames[0])
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
  public getDocumentPos(x: number, y: number): DocPos | null {
    return this.head!.getDocumentPos(x - this.x, y - this.y)
  }

  /**
   * 计算指定范围在当前段落的矩形区域
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    const offset = start.index
    const length = end.index - offset
    const blockLength = offset < 0 ? length + offset : length
    const rects = this.head!.getSelectionRectangles(
      { index: Math.max(offset, 0), inner: null },
      { index: Math.max(offset, 0) + blockLength, inner: null }
    )
    for (let rectIndex = rects.length - 1; rectIndex >= 0; rectIndex--) {
      const rect = rects[rectIndex]
      rect.y += this.y
      // 如果 correctByPosY 不在当前 rect 的纵向范围内，就过滤这条结果
      if (typeof correctByPosY === 'number' && (correctByPosY < rect.y || correctByPosY > rect.y + rect.height)) {
        rects.splice(rectIndex, 1)
        continue
      }
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
    const ops = this.head!.toOp()
    this.setBlockOpAttribute(ops, Paragraph.blockType)
    return ops
  }
  public toHtml(selection?: IRange): string {
    return `<p>${super.childrenToHtml(selection)}</p>`
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number): Paragraph {
    this.needLayout = true
    const newFrames = super.splitByEnter(index)
    const newParagraph = new Paragraph()
    newParagraph.setSize({ width: this.width })
    newParagraph.addAll(newFrames)
    return newParagraph
  }

  /**
   * 渲染当前段落
   * @param viewHeight 整个画布的高度
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    this.head!.draw(ctx, this.x + x, this.y + y, viewHeight)
    super.draw(ctx, x, y, viewHeight)
  }
}
