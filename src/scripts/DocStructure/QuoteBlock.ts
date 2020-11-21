import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import LayoutFrame from './LayoutFrame'
import { IRenderStructure } from '../Common/IRenderStructure'
import IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import { DocPos } from '../Common/DocPos'

export const QUOTE_BLOCK_CONTENT_COLOR = '#A5A5A5'

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
      this.setHeight(newHeight)
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  /**
   * 获取指定范围的矩形区域
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    if (typeof correctByPosY === 'number') {
      correctByPosY = Math.max(this.y + this.padding, correctByPosY)
      correctByPosY = Math.min(this.y + this.height - this.padding, correctByPosY)
    }
    const rects: IRectangle[] = super.getSelectionRectangles(start, end, correctByPosY)
    return rects
  }

  public toOp(withKey: boolean): Op[] {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      const layoutOps = element.toOp(withKey)
      res.push(...layoutOps)
    }
    this.setBlockOpAttribute(res, QuoteBlock.blockType)
    return res
  }

  public toHtml(selection?: IRange): string {
    return super.childrenToHtml(selection)
  }

  afterAdd(node: LayoutFrame): void {
    node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
  }
  afterAddAfter(node: LayoutFrame, target: LayoutFrame): void {
    node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
  }
  afterAddBefore(node: LayoutFrame, target: LayoutFrame): void {
    node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
  }
  afterAddAtIndex(node: LayoutFrame, index: number): void {
    node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
  }
  afterAddAll(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
    })
  }
  afterRemoveAll(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      node.setOverrideDefaultAttributes({ color: undefined })
    })
  }
  afterRemove(node: LayoutFrame): void {
    node.setOverrideDefaultAttributes({ color: undefined })
  }
  afterRemoveAllFrom(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      node.setOverrideDefaultAttributes({ color: undefined })
    })
  }
  afterSplice(start: number, deleteCount: number, nodes: LayoutFrame[], removedNodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      node.setOverrideDefaultAttributes({ color: QUOTE_BLOCK_CONTENT_COLOR })
    })
    removedNodes.forEach(node => {
      node.setOverrideDefaultAttributes({ color: undefined })
    })
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
