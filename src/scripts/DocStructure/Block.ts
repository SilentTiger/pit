import type Op from 'quill-delta-enhanced/dist/Op'
import type ICanvasContext from '../Common/ICanvasContext'
import type IRectangle from '../Common/IRectangle'
import type { ILinkedListNode } from '../Common/LinkedList'
import { increaseId } from '../Common/util'
import type { IFormatAttributes } from './FormatAttributes'
import LayoutFrame from './LayoutFrame'
import type ILayoutFrameAttributes from './LayoutFrameAttributes'
import type { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'
import type IRange from '../Common/IRange'
import type { IBubbleUpable } from '../Common/IBubbleUpable'
import type { ISearchResult } from '../Common/ISearchResult'
import type Delta from 'quill-delta-enhanced'
import type IFragmentTextAttributes from './FragmentTextAttributes'
import type { IPointerInteractive } from '../Common/IPointerInteractive'
import type { DocPos } from '../Common/DocPos'
import type { IDocPosOperator } from '../Common/IDocPosOperator'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import type Fragment from './Fragment'
import type { ISelectedElementGettable } from '../Common/ISelectedElementGettable'

export default abstract class Block
  implements ILinkedListNode, IRenderStructure, IBubbleUpable, IDocPosOperator, ISelectedElementGettable
{
  public static readonly blockType: string = 'block'
  public readonly id: number = increaseId()
  public prevSibling: this | null = null
  public nextSibling: this | null = null

  public start = 0
  public length = 0

  public x = 0
  public y = 0
  public width = 0
  public height = 0
  public needLayout = true
  public readonly needMerge: boolean = false

  protected isPointerHover = false

  public destroy() {
    this.prevSibling = null
    this.nextSibling = null
    this.needLayout = false
  }

  /**
   * 绘制当前 block 到 canvas
   * @param ctx canvas 上下文
   * @param viewHeight 整个画布的高度
   * @returns 绘制过程中当前 block 高度是否发生变化
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    if ((window as any).blockBorder) {
      ctx.save()
      ctx.strokeStyle = 'green'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
      ctx.restore()
    }
  }

  /**
   * 设置当前 block 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      this.y = Math.floor(y)
      // 如果 needLayout 为 true 就不用设置后面的元素的 positionY 了，layout 的时候会设置的
      if (recursive && !this.needLayout) {
        let currentBlock = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = Math.floor(currentBlock.y + currentBlock.height)
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
        this.bubbleUp(BubbleMessage.UPDATE_CONTENT_HEIGHT, null)
      }
    }
  }

  /**
   * 设置当前 block 的 start
   * @param recursive 是否依次更新当前 block 后面的 block 的 start
   * @param force 是否强制更新（就算新设的值和目前的值相同也更新）
   * @param canBreak 是否允许中断，如果给某个 block  将要设置的 start 值与该 block 目前的 start 值相同，是否中断
   */
  public setStart(index: number, recursive = false, force = false, canBreak = false): void {
    if (force === true || this.start !== index) {
      this.start = index
      if (recursive) {
        let currentBlock: Block = this
        let nextSibling = currentBlock.nextSibling
        while (nextSibling !== null) {
          if (canBreak && nextSibling.start === currentBlock.start + currentBlock.length) {
            break
          }
          nextSibling.start = currentBlock.start + currentBlock.length
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
        this.bubbleUp(BubbleMessage.UPDATE_CONTENT_LENGTH, null)
      }
    }
  }

  public setHeight(height: number) {
    if (this.height !== height) {
      this.height = height
    }
    if (this.nextSibling === null) {
      this.bubbleUp(BubbleMessage.UPDATE_CONTENT_HEIGHT, null)
    }
  }

  public setWidth(width: number) {
    if (this.width !== width) {
      this.width = width
    }
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }

  public isHungry(): boolean {
    return false
  }

  public eat(block: Block): boolean {
    return false
  }

  public applyChanges(delta: Delta): void {
    /* empty function, override if needed */
  }

  /**
   * 计算当前 block 的实际选区范围或选区端点范围
   *
   * 注意：如果参数 start、end 中某一个为 null，则返回数组长度必定是 1，且其中唯一元素的 start、end 也必定是 null
   */
  public correctSelectionPos(
    start: DocPos | null,
    end: DocPos | null,
  ): Array<{ start: DocPos | null; end: DocPos | null }> {
    return [{ start, end }]
  }

  /**
   * 将 Op 读成 LayoutFrame
   * 这是一个给 block 的子类使用的工具方法
   */
  protected readOpsToLayoutFrame(ops: Op[]): LayoutFrame[] {
    const frames: LayoutFrame[] = []
    const opCache: Op[] = []
    for (let index = 0; index < ops.length; index++) {
      const op = ops[index]
      if (op.attributes?.frag === 'end' && typeof op.insert === 'number') {
        // 下面要循环是因为如果 insert 不是 1，而是 2、3、4...就需要一次性插入多个 frame
        opCache.push({ insert: 1, attributes: { ...op.attributes } })
        const frame = new LayoutFrame()
        frame.readFromOps(opCache)
        frames.push(frame)
        for (let index = 0; index < op.insert - 1; index++) {
          const frame = new LayoutFrame()
          frame.readFromOps([{ insert: 1, attributes: { ...op.attributes } }])
          frames.push(frame)
        }
        opCache.length = 0
      } else {
        opCache.push(op)
      }
    }
    return frames
  }

  /**
   * 修改当前 block 的 attributes
   */
  protected formatSelf(attr: IFormatAttributes, range?: IRange): void {
    /** empty function */
  }

  /**
   * 清除格式时重置当前 block 的格式到默认状态
   */
  protected clearSelfFormat(range?: IRange): void {
    /** empty function */
  }

  /**
   * 给最后一条 op 设置表示 block 类型的 attribute
   */
  protected setBlockOpAttribute(Ops: Op[], blockType: string): boolean {
    if (Ops.length === 0) {
      return false
    }
    Object.assign(Ops[Ops.length - 1].attributes, { block: blockType })
    return true
  }

  public abstract firstPos(): DocPos
  public abstract lastPos(): DocPos
  public abstract nextPos(pos: DocPos): DocPos | null
  public abstract prevPos(pos: DocPos): DocPos | null
  public abstract firstLinePos(x: number): DocPos | null
  public abstract lastLinePos(x: number): DocPos | null
  public abstract nextLinePos(pos: DocPos, x: number): DocPos | null
  public abstract prevLinePos(pos: DocPos, x: number): DocPos | null
  public abstract lineStartPos(pos: DocPos, y: number): DocPos | null
  public abstract lineEndPos(pos: DocPos, y: number): DocPos | null

  /**
   * 重新排版当前 block
   */
  public abstract layout(): void

  public abstract search(keywords: string, trigger?: boolean): ISearchResult[]

  /**
   * 获取指定坐标在文档中的逻辑位置信息
   * 包含该位置在文档中的 DocPos 信息
   * @param x x 坐标
   * @param y y 坐标
   * @param start
   * start 为 true 表示 selectionController 尝试开始建立选区，一般就是鼠标左键按下的时候，
   * 但有些元素在某些情况下鼠标左键按下不能开始建立选区，比如 table，当鼠标悬停在 table 边框上按下鼠标，
   * 此时用户应该是想调整表格高度、行高、列宽等，所以这种时候就返回 null 防止 selectionController 建立选区
   */
  public abstract getDocumentPos(x: number, y: number, start: boolean): DocPos | null

  /**
   * 根据选区获取选区矩形区域
   * @param start 选区相对当前 block 的开始位置
   * @param end 选区相对当前 block 的结束位置
   * @param {number | undefined} correctByPosY 用实际鼠标 y 坐标修正结果，在选区长度为 0 计算光标位置的时候要用这个参数
   */
  public abstract getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[]

  public abstract getChildrenStackByPos(x: number, y: number): Array<IRenderStructure>

  /**
   * 将当前 block 输出为 delta
   */
  public abstract toOp(withKey: boolean): Op[]

  public abstract readFromOps(Ops: Op[]): void

  /**
   * 将当前 block 输出为 html
   */
  public abstract toHtml(selection?: IRange): string

  public abstract toText(selection?: IRange): string

  public abstract insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): boolean

  public abstract insertFragment(frag: Fragment, pos: DocPos): void

  public abstract insertBlock(block: Block, pos: DocPos): Block[]

  /**
   * 在指定位置插入一个换行符
   */
  public abstract insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): Block | null

  public abstract getFormat(range?: IRange): { [key: string]: Set<any> }

  public abstract format(attr: IFormatAttributes, range?: IRange): void

  /**
   * 清除该 block 中选区所选内容的格式，若选区为空则清除整个 block 中所有内容的所有样式
   */
  public abstract clearFormat(range?: IRange): void

  public abstract delete(range: IRange, forward: boolean): void

  public abstract getAllLayoutFrames(): LayoutFrame[]

  public abstract merge(target: this): void

  public abstract onPointerEnter(
    x: number,
    y: number,
    targetStack: IPointerInteractive[],
    currentTargetIndex: number,
  ): void
  public abstract onPointerLeave(): void
  public abstract onPointerMove(
    x: number,
    y: number,
    targetStack: IPointerInteractive[],
    currentTargetIndex: number,
  ): void
  public abstract onPointerDown(x: number, y: number): void
  public abstract onPointerUp(x: number, y: number): void
  public abstract onPointerTap(x: number, y: number): void

  public abstract bubbleUp(type: string, data: any, stack?: any[]): void
  public abstract setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void

  public abstract createSelf(): Block

  public abstract getSelectedElement(ranges: IRange[]): any[][]
}
