import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import { EnumIntersectionType, mergeDocPos, getRetainFromPos } from '../Common/util'
import LayoutFrame from './LayoutFrame'
import { IRenderStructure } from '../Common/IRenderStructure'
import IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import IDocPos from '../Common/IDocPos'

export default class QuoteBlock extends BlockCommon {
  public static readonly blockType: string = 'quote'

  public readonly needMerge = true;
  private padding = 10;

  public readFromOps(Ops: Op[]): void {
    const frames = super.readOpsToLayoutFrame(Ops)
    this.addAll(frames)
    super.setFrameStart()
  }

  public layout() {
    if (this.needLayout) {
      let currentFrame: LayoutFrame | null = null
      let newWidth = 0
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i]
        currentFrame.layout()
        currentFrame.x = 20
        newWidth = Math.max(newWidth, currentFrame.x + currentFrame.width)
      }
      if (this.head !== null) {
        this.head.setPositionY(this.padding, true, true)
      }
      this.needLayout = false

      let newHeight = 0
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height + this.padding
      }
      this.setSize({ height: newHeight, width: newWidth })
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  public getDocumentPos(x: number, y: number): IDocPos[] | { ops: IDocPos[] } {
    x = x - this.x
    y = y - this.y
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index]
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.children.length - 1 && y > frame.y + frame.height)
      ) {
        return mergeDocPos(frame.start, frame.getDocumentPos(x - frame.x, y - frame.y))
      }
    }
    return []
  }

  /**
   * 获取指定范围的矩形区域
   */
  public getSelectionRectangles(start: { ops: IDocPos[] }, end: { ops: IDocPos[] }, correctByPosY?: number): IRectangle[] {
    const rects: IRectangle[] = []
    let offset = getRetainFromPos(start)
    const length = getRetainFromPos(end) - offset
    const blockLength = offset < 0 ? length + offset : length
    offset = Math.max(0, offset)

    if (typeof correctByPosY === 'number') {
      correctByPosY = Math.max(this.y + this.padding, correctByPosY)
      correctByPosY = Math.min(this.y + this.height - this.padding, correctByPosY)
    }

    for (let frameIndex = 0; frameIndex < this.children.length; frameIndex++) {
      const frame = this.children[frameIndex]
      if (frame.start + frame.length <= offset) { continue }
      if (frame.start > offset + blockLength) { break }

      const frameOffset = offset - frame.start
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength
      const frameRects = frame.getSelectionRectangles(
        { ops: [{ retain: Math.max(frameOffset, 0) }] },
        { ops: [{ retain: Math.max(frameOffset, 0) + frameLength }] }
      )
      for (let rectIndex = frameRects.length - 1; rectIndex >= 0; rectIndex--) {
        const rect = frameRects[rectIndex]
        rect.y += this.y
        // 如果 correctByPosY 不在当前 rect 的纵向范围内，就过滤这条结果
        if (typeof correctByPosY === 'number' && (correctByPosY < rect.y || correctByPosY > rect.y + rect.height)) {
          frameRects.splice(rectIndex, 1)
          continue
        }
        rect.x += this.x
      }
      rects.push(...frameRects)
    }

    return rects
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number) {
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst)
    for (let i = 0; i < frames.length; i++) {
      frames[i].setIndent(increase)
    }
    this.needLayout = true
  }

  public toOp(): Op[] {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      const layoutOps = element.toOp()
      res.push(...layoutOps)
    }
    this.setBlockOpAttribute(res, QuoteBlock.blockType)
    return res
  }

  public toHtml(selection?: IRange): string {
    return super.childrenToHtml(selection)
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number): QuoteBlock | null {
    this.needLayout = true
    const newFrames = super.splitByEnter(index)
    this.addAll(newFrames)
    return null
  }

  public remove(target: LayoutFrame) {
    super.remove(target)
    this.needLayout = true
  }

  public onPointerEnter(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number) {
    y = y - this.padding
    super.onPointerEnter(x, y, targetStack, currentTargetIndex)
  }
  public onPointerMove(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number): void {
    y = y - this.padding
    super.onPointerMove(x, y, targetStack, currentTargetIndex)
  }
  public onPointerDown(x: number, y: number): void {
    y = y - this.padding
    super.onPointerDown(x, y)
  }
  public onPointerUp(x: number, y: number): void {
    y = y - this.padding
    super.onPointerUp(x, y)
  }
  public onPointerTap(x: number, y: number) {
    y = y - this.padding
    super.onPointerTap(x, y)
  }

  public merge(target: QuoteBlock) {
    // todo
  }

  /**
   * 渲染当前 quoteblock
   * @param viewHeight 整个画布的高度
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const currentFrame = this.children[index]
      if (y + this.y + currentFrame.y + currentFrame.height >= 0 && currentFrame.y < viewHeight) {
        currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight - this.y - y)
      }
    }
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(this.x, this.y + this.padding + y, 5, this.height - this.padding * 2)
    super.draw(ctx, x, y, viewHeight)
  }

  /**
   * 给某个 layoutframe 设置最大宽度
   * @param node layoutframe
   */
  protected setChildrenMaxWidth(node: LayoutFrame): void {
    node.setMaxWidth(this.width - 20)
  }
}
