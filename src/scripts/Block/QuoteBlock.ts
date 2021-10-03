import type Op from 'quill-delta-enhanced/dist/Op'
import type ICanvasContext from '../Common/ICanvasContext'
import type IRectangle from '../Common/IRectangle'
import type LayoutFrame from '../RenderStructure/LayoutFrame'
import type { IRenderStructure } from '../Common/IRenderStructure'
import type IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import type { DocPos } from '../Common/DocPos'
import { toHtml } from '../Common/util'

export const QUOTE_BLOCK_CONTENT_COLOR = '#A5A5A5'

export default class QuoteBlock extends BlockCommon {
  public static override readonly blockType: string = 'quote'

  public override readonly needMerge = true
  private padding = 10

  public override readFromOps(Ops: Op[]): void {
    const frames = super.readOpsToLayoutFrame(Ops)
    this.addAll(frames)
    super.setFrameStart()
  }

  public override layout() {
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
      this.setHeight(newHeight)
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  /**
   * 获取指定范围的矩形区域
   */
  public override getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    let targetCorrectByPosY: number | undefined
    if (typeof correctByPosY === 'number') {
      targetCorrectByPosY = Math.max(this.y + this.padding, correctByPosY)
      targetCorrectByPosY = Math.min(this.y + this.height - this.padding, targetCorrectByPosY)
    }
    const rects: IRectangle[] = super.getSelectionRectangles(start, end, targetCorrectByPosY)
    return rects
  }

  public override toOp(withKey: boolean): Op[] {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      const layoutOps = element.toOp(withKey)
      res.push(...layoutOps)
    }
    this.setBlockOpAttribute(res, QuoteBlock.blockType)
    return res
  }

  public override toHtml(range?: IRange): string {
    return `<blockquote>${toHtml(this, range)}</blockquote>`
  }

  public override createSelf(): QuoteBlock {
    return new QuoteBlock()
  }

  public override afterAdd(
    nodes: LayoutFrame[],
    index: number,
    prevNode: LayoutFrame | null,
    nextNode: LayoutFrame | null,
    array: LayoutFrame[],
  ): void {
    super.afterAdd(nodes, index, prevNode, nextNode, array)
    nodes.forEach((node) => {
      node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
    })
  }
  public override afterRemove(
    nodes: LayoutFrame[],
    index: number,
    prevNode: LayoutFrame | null,
    nextNode: LayoutFrame | null,
    array: LayoutFrame[],
  ): void {
    super.afterRemove(nodes, index, prevNode, nextNode, array)
    nodes.forEach((node) => {
      node.setOverrideDefaultAttributes({ color: undefined })
    })
  }

  public override onPointerEnter(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number) {
    super.onPointerEnter(x, y - this.padding, targetStack, currentTargetIndex)
  }
  public override onPointerMove(
    x: number,
    y: number,
    targetStack: IRenderStructure[],
    currentTargetIndex: number,
  ): void {
    super.onPointerMove(x, y - this.padding, targetStack, currentTargetIndex)
  }
  public override onPointerDown(x: number, y: number): void {
    super.onPointerDown(x, y - this.padding)
  }
  public override onPointerUp(x: number, y: number): void {
    super.onPointerUp(x, y - this.padding)
  }
  public override onPointerTap(x: number, y: number) {
    super.onPointerTap(x, y - this.padding)
  }

  /**
   * 渲染当前 quoteblock
   * @param viewHeight 整个画布的高度
   */
  public override draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const currentFrame = this.children[index]
      if (y + this.y + currentFrame.y + currentFrame.height >= 0 && currentFrame.y < viewHeight) {
        currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight - currentFrame.y)
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
  protected override setChildrenMaxWidth(node: LayoutFrame): void {
    node.setMaxWidth(this.width - 20)
  }
}
